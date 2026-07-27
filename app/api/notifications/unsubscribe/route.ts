import { prisma } from "../../../../src/lib/prisma";
import { managerPath } from "../../../../src/lib/seo";
import { notificationResultPage } from "../../../../src/lib/notification-page";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();

  if (!token || !process.env.DATABASE_URL) {
    return notificationResultPage({
      title: "That link didn't work",
      message: "The unsubscribe link is missing or has expired.",
    });
  }

  const subscription = await prisma.reviewSubscription
    .findUnique({
      where: { unsubscribeToken: token },
      include: { review: { include: { manager: { include: { company: true } } } } },
    })
    .catch(() => null);

  // Already-removed subscriptions report success: the sender's goal (no more
  // email) is satisfied, and a distinct error would confirm the address to
  // anyone guessing tokens.
  if (!subscription) {
    return notificationResultPage({
      title: "You're unsubscribed",
      message: "You won't receive reply alerts for this review.",
    });
  }

  const { manager } = subscription.review;
  await prisma.reviewSubscription.delete({ where: { id: subscription.id } });

  return notificationResultPage({
    title: "You're unsubscribed",
    message: `You won't receive any more reply alerts for this review of ${manager.name} at ${manager.company.name}.`,
    linkHref: `${managerPath(manager.company.slug, manager.slug)}#review-${subscription.reviewId}`,
    linkLabel: "Back to the review",
  });
}
