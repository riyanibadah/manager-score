import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../src/lib/prisma";
import { hashValue, normalizeReview, slugify } from "../../../src/lib/reviews";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ reviews: [] });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        manager: { include: { company: true } },
        tags: true,
      },
    });

    return NextResponse.json({
      reviews: reviews.map((review) => ({
        id: review.id,
        managerName: review.manager.name,
        managerTitle: review.manager.title,
        company: review.manager.company.name,
        department: review.manager.department,
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
        traits: review.tags.map((tag) => ({
          tag: tag.tag,
          sentiment: tag.sentiment.toLowerCase(),
        })),
        date: review.createdAt.toISOString(),
      })),
    });
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
    const managerSlug = slugify(review.managerName);
    const submitterIpHash = hashIp(request);
    const submissionHash = hashValue(
      [
        review.company.toLowerCase(),
        review.managerName.toLowerCase(),
        review.reviewText.toLowerCase(),
      ].join("|"),
    );

    const company = await prisma.company.upsert({
      where: { slug: companySlug },
      update: { name: review.company },
      create: { name: review.company, slug: companySlug },
    });

    const manager = await prisma.manager.upsert({
      where: { companyId_slug: { companyId: company.id, slug: managerSlug } },
      update: {
        name: review.managerName,
        title: review.managerTitle,
        department: review.department,
      },
      create: {
        name: review.managerName,
        slug: managerSlug,
        title: review.managerTitle,
        department: review.department,
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
        tags: {
          create: review.traits.map((trait) => ({
            tag: trait.tag,
            sentiment: trait.sentiment,
          })),
        },
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        status: created.status,
        message: "Review submitted anonymously.",
      },
      { status: 201 },
    );
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
