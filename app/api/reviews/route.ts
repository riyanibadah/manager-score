import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "../../../src/lib/prisma";
import { getRecentReviews } from "../../../src/lib/public-data";
import {
  canonicalManagerNameForSlug,
  generateUnlockToken,
  hashValue,
  normalizeReview,
  normalizeWorkEmail,
  slugify,
} from "../../../src/lib/reviews";
import { managerPath } from "../../../src/lib/seo";
import { auth } from "../../../src/lib/auth";
import { sendReviewVerification } from "../../../src/lib/notify";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ reviews: [] });
  }

  try {
    return NextResponse.json({ reviews: await getRecentReviews(20) });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured yet. Add DATABASE_URL to enable shared review storage." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const review = normalizeReview(body);
    const companySlug = slugify(review.company);
    const canonicalManagerName = canonicalManagerNameForSlug(review.managerName);
    const managerSlug = slugify(canonicalManagerName);
    const submitterIpHash = hashIp(request);
    const submissionHash = hashValue(
      [
        review.company.toLowerCase(),
        canonicalManagerName.toLowerCase(),
        review.reviewText.toLowerCase(),
      ].join("|"),
    );
    const limitResponse = await enforceReviewRateLimit({
      submitterIpHash,
      companySlug,
      managerSlug,
    });

    if (limitResponse) return limitResponse;

    const session = await getRequestSession(request);
    const unlockToken = generateUnlockToken();
    const unlockTokenHash = hashValue(unlockToken);

    const company = await prisma.company.upsert({
      where: { slug: companySlug },
      update: {
        name: review.company,
        ...(review.indeedUrl ? { indeedUrl: review.indeedUrl } : {}),
      },
      create: { name: review.company, slug: companySlug, indeedUrl: review.indeedUrl },
    });

    const manager = await prisma.manager.upsert({
      where: { companyId_slug: { companyId: company.id, slug: managerSlug } },
      update: {
        name: review.managerName,
        title: review.managerTitle,
        department: review.department,
        ...(review.linkedinUrl ? { linkedinUrl: review.linkedinUrl } : {}),
      },
      create: {
        name: review.managerName,
        slug: managerSlug,
        title: review.managerTitle,
        department: review.department,
        linkedinUrl: review.linkedinUrl,
        companyId: company.id,
      },
    });

    const created = await prisma.review.create({
      data: {
        managerId: manager.id,
        reviewerRole: review.reviewerRole,
        workedWith: review.workedWith,
        employmentType: review.employmentType,
        employeeStatus: review.employeeStatus,
        overall: review.overall,
        communication: review.communication,
        worklife: review.worklife,
        recognition: review.recognition,
        wouldAgain: review.wouldAgain,
        reviewText: review.reviewText,
        submissionHash,
        submitterIpHash,
        unlockTokenHash,
        userId: session?.user?.id,
        tags: {
          create: review.traits.map((trait) => ({
            tag: trait.tag,
            sentiment: trait.sentiment,
          })),
        },
      },
    });

    // Optional email verification. Kept entirely off the review-creation path:
    // the review is already saved, so a bad address or a mail failure can never
    // block it. We store only a hash of the address; the emailed link is what
    // actually flips the review to verified.
    let verificationPending = false;
    const workEmail = normalizeWorkEmail(body?.workEmail);
    if (workEmail) {
      try {
        const verifyToken = generateUnlockToken();
        await prisma.review.update({
          where: { id: created.id },
          data: {
            verifyTokenHash: hashValue(verifyToken),
            verificationEmailHash: hashValue(workEmail),
          },
        });
        await sendReviewVerification({
          email: workEmail,
          verifyToken,
          managerName: review.managerName,
          company: review.company,
        });
        verificationPending = true;
      } catch (verifyError) {
        console.error("Review verification email failed:", verifyError);
      }
    }

    const response = NextResponse.json(
      {
        id: created.id,
        status: created.status,
        profilePath: managerPath(company.slug, manager.slug),
        message: "Review submitted anonymously.",
        verificationPending,
      },
      { status: 201 },
    );
    response.cookies.set("rmm_unlock_tokens", JSON.stringify(await nextUnlockTokens(unlockToken)), {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This review looks like it was already submitted." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not submit review." },
      { status: 400 },
    );
  }
}

function hashIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor || realIp;
  return ip ? hashValue(ip) : undefined;
}

async function getRequestSession(request: Request) {
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}

const MAX_UNLOCK_TOKENS = 20;

async function nextUnlockTokens(newToken: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("rmm_unlock_tokens")?.value;
  let existing: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed.filter((token) => typeof token === "string");
    } catch {}
  }
  return [...existing, newToken].slice(-MAX_UNLOCK_TOKENS);
}

async function enforceReviewRateLimit({
  submitterIpHash,
  companySlug,
  managerSlug,
}: {
  submitterIpHash?: string;
  companySlug: string;
  managerSlug: string;
}) {
  if (!submitterIpHash) return null;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [hourCount, dayCount, sameManagerDayCount] = await Promise.all([
    prisma.review.count({
      where: {
        submitterIpHash,
        createdAt: { gte: oneHourAgo },
      },
    }),
    prisma.review.count({
      where: {
        submitterIpHash,
        createdAt: { gte: oneDayAgo },
      },
    }),
    prisma.review.count({
      where: {
        submitterIpHash,
        createdAt: { gte: oneDayAgo },
        manager: {
          slug: managerSlug,
          company: { slug: companySlug },
        },
      },
    }),
  ]);

  if (sameManagerDayCount >= 1) {
    return NextResponse.json(
      { error: "You already reviewed this manager recently. Please try again tomorrow." },
      { status: 429 },
    );
  }

  if (hourCount >= 3) {
    return NextResponse.json(
      { error: "Too many reviews submitted recently. Please try again later." },
      { status: 429 },
    );
  }

  if (dayCount >= 10) {
    return NextResponse.json(
      { error: "Daily review limit reached. Please try again tomorrow." },
      { status: 429 },
    );
  }

  return null;
}
