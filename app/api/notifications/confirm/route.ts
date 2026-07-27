import { prisma } from "../../../../src/lib/prisma";
import { managerPath } from "../../../../src/lib/seo";
import { notificationResultPage } from "../../../../src/lib/notification-page";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();

  if (!token || !process.env.DATABASE_URL) {
    return notificationResultPage({
      title: "That link didn't work",
      message: "The confirmation link is missing or has expired. Request a new one from the review.",
    });
  }

  const subscription = await prisma.reviewSubscription
    .findUnique({
      where: { confirmToken: token },
      include: { review: { include: { manager: { include: { company: true } } } } },
    })
    .catch(() => null);

  if (!subscription) {
    return notificationResultPage({
      title: "That link didn't work",
      message: "This confirmation link is no longer valid. Request a new one from the review.",
    });
  }

  if (!subscription.confirmedAt) {
    await prisma.reviewSubscription.update({
      where: { id: subscription.id },
      data: { confirmedAt: new Date() },
    });
  }

  const { manager } = subscription.review;
  return notificationResultPage({
    title: "You're subscribed",
    message: `We'll email you whenever someone replies to this review of ${manager.name} at ${manager.company.name}. Every alert includes a one-click unsubscribe link.`,
    linkHref: `${managerPath(manager.company.slug, manager.slug)}#review-${subscription.reviewId}`,
    linkLabel: "Back to the review",
  });
}
