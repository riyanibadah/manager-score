import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../../src/lib/prisma";
import { hashRequestIp, hashValue } from "../../../../../src/lib/reviews";
import { normalizeReply } from "../../../../../src/lib/replies";
import { sendReplyModerationNotice, sendReplyNotification } from "../../../../../src/lib/notify";
import { managerPath, siteUrl } from "../../../../../src/lib/seo";
import { auth } from "../../../../../src/lib/auth";

type ReplyRouteProps = {
  params: Promise<{ reviewId: string }>;
};

export async function POST(request: Request, { params }: ReplyRouteProps) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured yet." }, { status: 503 });
  }

  try {
    const { reviewId } = await params;
    const reply = normalizeReply(await request.json());

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { manager: { include: { company: true } } },
    });

    if (!review || review.status !== "APPROVED") {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    const submitterIpHash = hashRequestIp(request);
    const limitResponse = await enforceReplyRateLimit({ submitterIpHash, reviewId });
    if (limitResponse) return limitResponse;

    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    const created = await prisma.reviewReply.create({
      data: {
        reviewId,
        body: reply.body,
        authorRole: reply.authorRole,
        submissionHash: hashValue(`${reviewId}|${reply.body.toLowerCase()}`),
        submitterIpHash,
        userId: session?.user?.id,
      },
    });

    const profilePath = managerPath(review.manager.company.slug, review.manager.slug);
    const reviewUrl = `${siteUrl()}${profilePath}#review-${reviewId}`;

    // Fan out after the reply is persisted so a mail failure can never lose it.
    await Promise.all([
      notifySubscribers({
        reviewId,
        managerName: review.manager.name,
        company: review.manager.company.name,
        reviewUrl,
      }),
      sendReplyModerationNotice({
        replyId: created.id,
        managerName: review.manager.name,
        company: review.manager.company.name,
        profilePath,
        replyBody: reply.body,
      }),
    ]);

    return NextResponse.json(
      {
        reply: {
          id: created.id,
          body: created.body,
          authorRole: created.authorRole,
          date: created.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That reply was already posted." }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not post reply." },
      { status: 400 },
    );
  }
}

async function notifySubscribers(notification: {
  reviewId: string;
  managerName: string;
  company: string;
  reviewUrl: string;
}) {
  const subscribers = await prisma.reviewSubscription.findMany({
    where: { reviewId: notification.reviewId, confirmedAt: { not: null } },
    select: { email: true, unsubscribeToken: true },
  });

  await Promise.all(
    subscribers.map((subscriber) =>
      sendReplyNotification({
        email: subscriber.email,
        unsubscribeToken: subscriber.unsubscribeToken,
        managerName: notification.managerName,
        company: notification.company,
        reviewUrl: notification.reviewUrl,
      }),
    ),
  );
}

async function enforceReplyRateLimit({
  submitterIpHash,
  reviewId,
}: {
  submitterIpHash?: string;
  reviewId: string;
}) {
  if (!submitterIpHash) return null;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [hourCount, dayCount, sameReviewDayCount] = await Promise.all([
    prisma.reviewReply.count({ where: { submitterIpHash, createdAt: { gte: oneHourAgo } } }),
    prisma.reviewReply.count({ where: { submitterIpHash, createdAt: { gte: oneDayAgo } } }),
    prisma.reviewReply.count({
      where: { submitterIpHash, reviewId, createdAt: { gte: oneDayAgo } },
    }),
  ]);

  if (sameReviewDayCount >= 3) {
    return NextResponse.json(
      { error: "You've replied to this review a few times today. Please come back tomorrow." },
      { status: 429 },
    );
  }

  if (hourCount >= 5) {
    return NextResponse.json(
      { error: "Too many replies posted recently. Please try again later." },
      { status: 429 },
    );
  }

  if (dayCount >= 20) {
    return NextResponse.json(
      { error: "Daily reply limit reached. Please try again tomorrow." },
      { status: 429 },
    );
  }

  return null;
}
