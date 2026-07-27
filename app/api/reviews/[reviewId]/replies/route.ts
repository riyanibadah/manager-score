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
    const payload = await request.json();
    const reply = normalizeReply(payload);
    const parentId = typeof payload?.parentId === "string" && payload.parentId.trim()
      ? payload.parentId.trim()
      : undefined;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { manager: { include: { company: true } } },
    });

    if (!review || review.status !== "APPROVED") {
      return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    // A reply-to-a-reply must attach to a live reply on this same review,
    // otherwise a thread could be grafted onto an unrelated review.
    if (parentId) {
      const parent = await prisma.reviewReply.findFirst({
        where: { id: parentId, reviewId, status: "APPROVED" },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "That reply is no longer available." }, { status: 404 });
      }
    }

    const submitterIpHash = hashRequestIp(request);
    const limitResponse = await enforceReplyRateLimit({ submitterIpHash, reviewId });
    if (limitResponse) return limitResponse;

    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    const created = await prisma.reviewReply.create({
      data: {
        reviewId,
        parentId,
        body: reply.body,
        authorRole: reply.authorRole,
        submissionHash: hashValue(`${reviewId}|${parentId || ""}|${reply.body.toLowerCase()}`),
        submitterIpHash,
        userId: session?.user?.id,
      },
    });

    const profilePath = managerPath(review.manager.company.slug, review.manager.slug);
    // Point subscribers straight at the new reply rather than the review, so
    // the thing the email is about is what they land on.
    const replyUrl = `${siteUrl()}${profilePath}#reply-${created.id}`;

    // Fan out after the reply is persisted so a mail failure can never lose it.
    await Promise.all([
      notifySubscribers({
        reviewId,
        managerName: review.manager.name,
        company: review.manager.company.name,
        replyUrl,
      }),
      sendReplyModerationNotice({
        replyId: created.id,
        managerName: review.manager.name,
        company: review.manager.company.name,
        profilePath,
      }),
    ]);

    return NextResponse.json(
      {
        reply: {
          id: created.id,
          parentId: created.parentId,
          body: created.body,
          authorRole: created.authorRole,
          upvotes: created.upvotes,
          downvotes: created.downvotes,
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
  replyUrl: string;
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
        replyUrl: notification.replyUrl,
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

  // Generous enough for a genuine back-and-forth in one thread; the caps only
  // exist to stop a script flooding a profile.
  if (sameReviewDayCount >= 25) {
    return NextResponse.json(
      { error: "You've replied to this review a lot today. Please come back tomorrow." },
      { status: 429 },
    );
  }

  if (hourCount >= 20) {
    return NextResponse.json(
      { error: "Too many replies posted recently. Please try again later." },
      { status: 429 },
    );
  }

  if (dayCount >= 60) {
    return NextResponse.json(
      { error: "Daily reply limit reached. Please try again tomorrow." },
      { status: 429 },
    );
  }

  return null;
}
