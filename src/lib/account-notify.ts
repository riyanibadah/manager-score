import { prisma } from "./prisma";
import { siteUrl, managerPath } from "./seo";
import { generateUnlockToken } from "./reviews";
import {
  sendLikeNotification,
  sendReplyToAuthorNotification,
  sendNewReviewNotification,
} from "./notify";

type NotifyType = "likes" | "replies" | "new_reviews";
const LIKE_THROTTLE_MS = 24 * 60 * 60 * 1000;

/**
 * Stable per-user secret the unsubscribe links are built from. Generated on
 * first use so it never has to be backfilled onto existing accounts.
 */
async function unsubscribeUrl(userId: string, type: NotifyType) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notifyToken: true } });
  let token = user?.notifyToken ?? undefined;
  if (!token) {
    token = generateUnlockToken();
    await prisma.user.update({ where: { id: userId }, data: { notifyToken: token } });
  }
  return `${siteUrl()}/api/notifications/preferences?token=${encodeURIComponent(token)}&type=${type}`;
}

/**
 * A liked review's author. Throttled to at most one email per review per day, so
 * a review that collects a burst of likes doesn't turn into a burst of mail.
 */
export async function notifyReviewLiked(reviewId: string, likerUserId?: string) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        likeNotifiedAt: true,
        manager: { select: { name: true, slug: true, company: { select: { name: true, slug: true } } } },
        user: { select: { id: true, email: true, notifyLikes: true } },
      },
    });

    if (!review?.user) return; // anonymous author — no login address to reach
    if (likerUserId && likerUserId === review.userId) return; // self-like
    if (!review.user.notifyLikes) return; // opted out
    if (review.likeNotifiedAt && Date.now() - review.likeNotifiedAt.getTime() < LIKE_THROTTLE_MS) return;

    // Stamp before sending so concurrent likes collapse into one email.
    await prisma.review.update({ where: { id: review.id }, data: { likeNotifiedAt: new Date() } });

    await sendLikeNotification({
      email: review.user.email,
      unsubscribeUrl: await unsubscribeUrl(review.user.id, "likes"),
      managerName: review.manager.name,
      company: review.manager.company.name,
      reviewUrl: `${siteUrl()}${managerPath(review.manager.company.slug, review.manager.slug)}#review-${review.id}`,
    });
  } catch (error) {
    console.error("notifyReviewLiked failed:", error);
  }
}

/** A replied-to review's author (unless they wrote the reply themselves). */
export async function notifyReviewReplied(reviewId: string, replierUserId?: string) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        manager: { select: { name: true, slug: true, company: { select: { name: true, slug: true } } } },
        user: { select: { id: true, email: true, notifyReplies: true } },
      },
    });

    if (!review?.user) return;
    if (replierUserId && replierUserId === review.userId) return; // author replying to own review
    if (!review.user.notifyReplies) return;

    await sendReplyToAuthorNotification({
      email: review.user.email,
      unsubscribeUrl: await unsubscribeUrl(review.user.id, "replies"),
      managerName: review.manager.name,
      company: review.manager.company.name,
      reviewUrl: `${siteUrl()}${managerPath(review.manager.company.slug, review.manager.slug)}#review-${review.id}`,
    });
  } catch (error) {
    console.error("notifyReviewReplied failed:", error);
  }
}

/**
 * Everyone connected to a manager when a new review lands: people who reviewed
 * that manager while signed in, plus anyone who tapped "Notify me". The new
 * author is excluded, recipients are de-duped, and each is gated on its opt-out.
 */
export async function notifyNewManagerReview(params: {
  managerId: string;
  managerName: string;
  companyName: string;
  companySlug: string;
  managerSlug: string;
  authorUserId?: string;
}) {
  try {
    const [reviewers, followers] = await Promise.all([
      prisma.review.findMany({
        where: { managerId: params.managerId, status: "APPROVED", userId: { not: null } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.managerFollow.findMany({ where: { managerId: params.managerId }, select: { userId: true } }),
    ]);

    const userIds = new Set<string>();
    for (const r of reviewers) if (r.userId) userIds.add(r.userId);
    for (const f of followers) userIds.add(f.userId);
    if (params.authorUserId) userIds.delete(params.authorUserId);
    if (userIds.size === 0) return;

    const recipients = await prisma.user.findMany({
      where: { id: { in: [...userIds] }, notifyNewReviews: true },
      select: { id: true, email: true },
    });

    const profileUrl = `${siteUrl()}${managerPath(params.companySlug, params.managerSlug)}`;

    await Promise.all(
      recipients.map(async (recipient) =>
        sendNewReviewNotification({
          email: recipient.email,
          unsubscribeUrl: await unsubscribeUrl(recipient.id, "new_reviews"),
          managerName: params.managerName,
          company: params.companyName,
          reviewUrl: profileUrl,
        }),
      ),
    );
  } catch (error) {
    console.error("notifyNewManagerReview failed:", error);
  }
}
