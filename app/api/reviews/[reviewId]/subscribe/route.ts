import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { hashRequestIp } from "../../../../../src/lib/reviews";
import { generateNotificationToken, normalizeEmail } from "../../../../../src/lib/replies";
import { sendSubscriptionConfirmation } from "../../../../../src/lib/notify";
import { managerPath, siteUrl } from "../../../../../src/lib/seo";
import { auth } from "../../../../../src/lib/auth";

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
    const body = await request.json().catch(() => ({}));

    // A signed-in user's address came from Google, so it's already proven to
    // be theirs — asking them to confirm it by email again is pure friction.
    // Only an address typed in by an anonymous visitor needs the opt-in round
    // trip, since anyone can type anyone else's address.
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    const sessionEmail = normalizeEmail(session?.user?.email);
    const email = sessionEmail || normalizeEmail(body?.email);

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

    // The cap guards against someone signing up addresses that aren't theirs,
    // which a signed-in user can't do — they only ever get their own. Applying
    // it to them would just cut off anyone following a handful of reviews.
    if (!sessionEmail) {
      const limitResponse = await enforceSubscribeRateLimit(subscriberIpHash);
      if (limitResponse) return limitResponse;
    }

    const existing = await prisma.reviewSubscription.findUnique({
      where: { reviewId_email: { reviewId, email } },
    });

    if (existing?.confirmedAt) {
      return NextResponse.json(
        sessionEmail ? { message: `You're already getting reply alerts at ${email}.` } : GENERIC_RESULT,
        { status: 200 },
      );
    }

    if (sessionEmail) {
      await prisma.reviewSubscription.upsert({
        where: { reviewId_email: { reviewId, email } },
        update: { confirmedAt: new Date() },
        create: {
          reviewId,
          email,
          confirmToken: generateNotificationToken(),
          unsubscribeToken: generateNotificationToken(),
          subscriberIpHash,
          confirmedAt: new Date(),
        },
      });

      return NextResponse.json(
        { message: `Done — we'll email ${email} whenever someone replies.`, confirmed: true },
        { status: 201 },
      );
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
