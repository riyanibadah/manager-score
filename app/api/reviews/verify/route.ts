import { prisma } from "../../../../src/lib/prisma";
import { managerPath } from "../../../../src/lib/seo";
import { hashValue } from "../../../../src/lib/reviews";
import { notificationResultPage } from "../../../../src/lib/notification-page";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();

  if (!token || !process.env.DATABASE_URL) {
    return notificationResultPage({
      title: "That link didn't work",
      message: "The verification link is missing or has expired. Submit a new review to try again.",
    });
  }

  const review = await prisma.review
    .findUnique({
      where: { verifyTokenHash: hashValue(token) },
      include: { manager: { include: { company: true } } },
    })
    .catch(() => null);

  if (!review) {
    return notificationResultPage({
      title: "That link didn't work",
      message: "This verification link is no longer valid — it may have already been used.",
    });
  }

  // One-time: consume the token so the link can't be replayed, and stamp the
  // review as verified. We never learn or store which person clicked beyond the
  // email hash already saved at submission, so the review stays anonymous.
  if (!review.emailVerifiedAt) {
    await prisma.review.update({
      where: { id: review.id },
      data: { emailVerifiedAt: new Date(), verifyTokenHash: null },
    });
  }

  const { manager } = review;
  return notificationResultPage({
    title: "Review verified",
    message: `Your review of ${manager.name} at ${manager.company.name} now shows a Verified badge. It stays anonymous — your email is never displayed.`,
    linkHref: `${managerPath(manager.company.slug, manager.slug)}#review-${review.id}`,
    linkLabel: "See your review",
  });
}
