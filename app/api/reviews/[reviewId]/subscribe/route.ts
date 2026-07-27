import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { hashRequestIp } from "../../../../../src/lib/reviews";
import { generateNotificationToken, normalizeEmail } from "../../../../../src/lib/replies";
import { sendSubscriptionConfirmation } from "../../../../../src/lib/notify";
import { managerPath, siteUrl } from "../../../../../src/lib/seo";

type SubscribeRouteProps = {
  params: Promise<{ reviewId: string }>;
};

// Identical response whether or not the address is already subscribed, so the
// endpoint can't be used to test which emails follow a given review.
const GENERIC_RESULT = {
  message: "Check your inbox — confirm the link in that email to start getting reply alerts.",
};

export async function POST(request: Request, { params }: SubscribeRouteProps) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured yet." }, { status: 503 });
  }

  try {
    const { reviewId } = await params;
    const body = await request.json();
    const email = normalizeEmail(body?.email);

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { manager: { include: { company: true } } },
    });

    if (!review || review.status !== "APPROVED") {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const subscriberIpHash = hashRequestIp(request);
    const limitResponse = await enforceSubscribeRateLimit(subscriberIpHash);
    if (limitResponse) return limitResponse;

    const existing = await prisma.reviewSubscription.findUnique({
      where: { reviewId_email: { reviewId, email } },
    });

    if (existing?.confirmedAt) {
      return NextResponse.json(GENERIC_RESULT, { status: 200 });
    }

    // Re-issue the token on every attempt so a stale or lost confirmation link
    // can be replaced simply by asking again.
    const confirmToken = generateNotificationToken();
    const subscription = existing
      ? await prisma.reviewSubscription.update({
          where: { id: existing.id },
          data: { confirmToken },
        })
      : await prisma.reviewSubscription.create({
          data: {
            reviewId,
            email,
            confirmToken,
            unsubscribeToken: generateNotificationToken(),
            subscriberIpHash,
          },
        });

    await sendSubscriptionConfirmation({
      email: subscription.email,
      confirmToken: subscription.confirmToken,
      managerName: review.manager.name,
      company: review.manager.company.name,
      reviewUrl: `${siteUrl()}${managerPath(review.manager.company.slug, review.manager.slug)}#review-${reviewId}`,
    });

    return NextResponse.json(GENERIC_RESULT, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not set up notifications." },
      { status: 400 },
    );
  }
}

async function enforceSubscribeRateLimit(subscriberIpHash?: string) {
  if (!subscriberIpHash) return null;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [hourCount, dayCount] = await Promise.all([
    prisma.reviewSubscription.count({
      where: { subscriberIpHash, createdAt: { gte: oneHourAgo } },
    }),
    prisma.reviewSubscription.count({
      where: { subscriberIpHash, createdAt: { gte: oneDayAgo } },
    }),
  ]);

  if (hourCount >= 5 || dayCount >= 20) {
    return NextResponse.json(
      { error: "Too many notification signups from here. Please try again later." },
      { status: 429 },
    );
  }

  return null;
}
