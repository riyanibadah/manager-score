import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../src/lib/prisma";
import { hashRequestIp } from "../../../src/lib/reviews";
import { auth } from "../../../src/lib/auth";
import { notifyReviewLiked } from "../../../src/lib/account-notify";
import {
  VOTER_COOKIE,
  VOTER_COOKIE_MAX_AGE,
  newVoterToken,
  normalizeVoteValue,
  voterKeyFor,
} from "../../../src/lib/votes";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured yet." }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reviewId = typeof body?.reviewId === "string" && body.reviewId.trim() ? body.reviewId.trim() : undefined;
    const replyId = typeof body?.replyId === "string" && body.replyId.trim() ? body.replyId.trim() : undefined;
    const value = normalizeVoteValue(body?.value);

    if (value === undefined) {
      return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
    }
    if (Boolean(reviewId) === Boolean(replyId)) {
      return NextResponse.json({ error: "Vote on a review or a reply, not both." }, { status: 400 });
    }

    // Only live content is votable, so a hidden or removed item can't keep
    // accumulating a score.
    const target = reviewId
      ? await prisma.review.findFirst({ where: { id: reviewId, status: "APPROVED" }, select: { id: true } })
      : await prisma.reviewReply.findFirst({ where: { id: replyId, status: "APPROVED" }, select: { id: true } });

    if (!target) {
      return NextResponse.json({ error: "That item is no longer available." }, { status: 404 });
    }

    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(VOTER_COOKIE)?.value;
    const issuedToken = session?.user?.id || existingToken ? undefined : newVoterToken();
    const voterKey = voterKeyFor({
      userId: session?.user?.id,
      voterToken: existingToken || issuedToken,
    });

    if (!voterKey) {
      return NextResponse.json({ error: "Could not identify voter." }, { status: 400 });
    }

    const where = reviewId
      ? { reviewId_voterKey: { reviewId, voterKey } }
      : { replyId_voterKey: { replyId: replyId!, voterKey } };

    const previous = await prisma.reviewVote.findUnique({ where });
    const previousValue = previous?.value ?? 0;

    if (previousValue !== value) {
      const voterIpHash = hashRequestIp(request);

      // The vote row and the denormalized counters have to move together, or a
      // failure between them leaves a score that no longer matches the votes.
      await prisma.$transaction(async (tx) => {
        if (value === 0) {
          if (previous) await tx.reviewVote.delete({ where: { id: previous.id } });
        } else {
          await tx.reviewVote.upsert({
            where,
            update: { value },
            create: { reviewId, replyId, voterKey, value, voterIpHash },
          });
        }

        // Relative moves, so concurrent votes on the same item add up instead
        // of overwriting each other.
        const data = {
          upvotes: { increment: (value === 1 ? 1 : 0) - (previousValue === 1 ? 1 : 0) },
          downvotes: { increment: (value === -1 ? 1 : 0) - (previousValue === -1 ? 1 : 0) },
        };

        if (reviewId) await tx.review.update({ where: { id: reviewId }, data });
        else await tx.reviewReply.update({ where: { id: replyId! }, data });
      });

      // Only a fresh upvote on a review notifies its author (throttled and
      // opt-out-gated inside). Never blocks the vote from being recorded.
      if (reviewId && value === 1 && previousValue !== 1) {
        await notifyReviewLiked(reviewId, session?.user?.id);
      }
    }

    const totals = reviewId
      ? await prisma.review.findUnique({ where: { id: reviewId }, select: { upvotes: true, downvotes: true } })
      : await prisma.reviewReply.findUnique({ where: { id: replyId }, select: { upvotes: true, downvotes: true } });

    const response = NextResponse.json({
      upvotes: totals?.upvotes ?? 0,
      downvotes: totals?.downvotes ?? 0,
      myVote: value,
    });

    if (issuedToken) {
      response.cookies.set(VOTER_COOKIE, issuedToken, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: VOTER_COOKIE_MAX_AGE,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not record vote." },
      { status: 400 },
    );
  }
}
