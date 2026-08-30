import { prisma } from "../../../../src/lib/prisma";
import { notificationResultPage } from "../../../../src/lib/notification-page";

// One-click unsubscribe target for account-notification emails. The link in each
// email carries the user's stable notifyToken plus which category to turn off.
const OPT_OUT: Record<
  string,
  { label: string; data: { notifyLikes: false } | { notifyReplies: false } | { notifyNewReviews: false } }
> = {
  likes: { label: "like", data: { notifyLikes: false } },
  replies: { label: "reply", data: { notifyReplies: false } },
  new_reviews: { label: "new-review", data: { notifyNewReviews: false } },
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  const type = url.searchParams.get("type")?.trim() ?? "";
  const mapping = OPT_OUT[type];

  if (!token || !mapping || !process.env.DATABASE_URL) {
    return notificationResultPage({
      title: "That link didn't work",
      message: "This unsubscribe link is missing or malformed. Open a recent notification email and try its link again.",
    });
  }

  const user = await prisma.user
    .findUnique({ where: { notifyToken: token }, select: { id: true } })
    .catch(() => null);

  if (!user) {
    return notificationResultPage({
      title: "That link didn't work",
      message: "This unsubscribe link is no longer valid.",
    });
  }

  await prisma.user.update({ where: { id: user.id }, data: mapping.data });

  return notificationResultPage({
    title: "Unsubscribed",
    message: `You won't receive ${mapping.label} emails anymore. Other notifications are unaffected.`,
  });
}
