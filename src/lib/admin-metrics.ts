import { prisma } from "./prisma";

const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo.", "yahoo.", "ecosia.", "yandex.", "baidu.", "brave."];
const SOCIAL_HOSTS = [
  "linkedin.", "lnkd.in", "t.co", "twitter.", "x.com", "facebook.", "fb.com", "instagram.",
  "reddit.", "youtube.", "youtu.be", "tiktok.", "threads.", "medium.", "news.ycombinator",
];

/**
 * Buckets a referrer into a coarse source. Same-origin referrers are "internal"
 * (navigation within the site), everything unknown is "referral" with the host
 * kept so the dashboard can list actual referring sites.
 */
export function classifySource(referrer: string | null | undefined, siteHost: string) {
  if (!referrer) return { source: "direct", host: null as string | null };

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return { source: "direct", host: null };
  }
  if (!host) return { source: "direct", host: null };

  if (host === siteHost.toLowerCase().replace(/^www\./, "")) return { source: "internal", host };
  if (SEARCH_HOSTS.some((s) => host.includes(s))) return { source: "search", host };
  if (SOCIAL_HOSTS.some((s) => host.includes(s))) return { source: "social", host };
  return { source: "referral", host };
}

/** Records one pageview. Self-swallowing: analytics must never break a request. */
export async function recordPageView(input: { path: string; referrer?: string | null; siteHost: string }) {
  try {
    const path = input.path.slice(0, 512);
    const { source, host } = classifySource(input.referrer, input.siteHost);
    await prisma.pageView.create({ data: { path, source, referrer: host } });
  } catch (error) {
    console.error("recordPageView failed:", error);
  }
}

function since(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export type AdminMetrics = Awaited<ReturnType<typeof getAdminMetrics>>;

/**
 * Every figure the dashboard shows. All counts run in parallel; any DB error
 * degrades the whole thing to zeros rather than 500-ing the admin page.
 */
export async function getAdminMetrics() {
  const day7 = since(7);
  const day30 = since(30);

  try {
    const [
      reviewsTotal,
      reviewsApproved,
      reviewsVerified,
      reviews7,
      reviews30,
      comments,
      comments7,
      reportsOpen,
      reportsTotal,
      managers,
      companies,
      users,
      likes,
      follows,
      subscriptions,
      hiddenReviews,
      pageViewsTotal,
      pageViews7,
      viewsBySource,
      topPathsRaw,
      topReferrersRaw,
      topManagersRaw,
    ] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { status: "APPROVED" } }),
      prisma.review.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.review.count({ where: { createdAt: { gte: day7 } } }),
      prisma.review.count({ where: { createdAt: { gte: day30 } } }),
      prisma.reviewReply.count(),
      prisma.reviewReply.count({ where: { createdAt: { gte: day7 } } }),
      prisma.reviewReport.count({ where: { status: "OPEN" } }),
      prisma.reviewReport.count(),
      prisma.manager.count(),
      prisma.company.count(),
      prisma.user.count(),
      prisma.reviewVote.count({ where: { value: 1 } }),
      prisma.managerFollow.count(),
      prisma.reviewSubscription.count({ where: { confirmedAt: { not: null } } }),
      prisma.review.count({ where: { status: "HIDDEN" } }),
      prisma.pageView.count(),
      prisma.pageView.count({ where: { createdAt: { gte: day7 } } }),
      prisma.pageView.groupBy({ by: ["source"], _count: { _all: true } }),
      prisma.pageView.groupBy({
        by: ["path"],
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 8,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { referrer: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 8,
      }),
      prisma.review.groupBy({
        by: ["managerId"],
        where: { status: "APPROVED" },
        _count: { _all: true },
        orderBy: { _count: { managerId: "desc" } },
        take: 8,
      }),
    ]);

    // Resolve manager names for the "most reviewed" list.
    const managerRows = await prisma.manager.findMany({
      where: { id: { in: topManagersRaw.map((row) => row.managerId) } },
      select: { id: true, name: true, slug: true, company: { select: { name: true, slug: true } } },
    });
    const managerById = new Map(managerRows.map((m) => [m.id, m]));
    const topManagers = topManagersRaw
      .map((row) => {
        const m = managerById.get(row.managerId);
        return m ? { name: m.name, company: m.company.name, count: row._count._all } : null;
      })
      .filter((row): row is { name: string; company: string; count: number } => Boolean(row));

    return {
      reviews: { total: reviewsTotal, approved: reviewsApproved, verified: reviewsVerified, last7: reviews7, last30: reviews30, hidden: hiddenReviews },
      comments: { total: comments, last7: comments7 },
      reports: { open: reportsOpen, total: reportsTotal },
      catalog: { managers, companies, users },
      engagement: { likes, follows, subscriptions },
      traffic: {
        total: pageViewsTotal,
        last7: pageViews7,
        bySource: viewsBySource
          .map((row) => ({ source: row.source, count: row._count._all }))
          .sort((a, b) => b.count - a.count),
        topPaths: topPathsRaw.map((row) => ({ path: row.path, count: row._count._all })),
        topReferrers: topReferrersRaw.map((row) => ({ host: row.referrer as string, count: row._count._all })),
      },
      topManagers,
      ok: true as const,
    };
  } catch (error) {
    console.error("getAdminMetrics failed:", error);
    return {
      reviews: { total: 0, approved: 0, verified: 0, last7: 0, last30: 0, hidden: 0 },
      comments: { total: 0, last7: 0 },
      reports: { open: 0, total: 0 },
      catalog: { managers: 0, companies: 0, users: 0 },
      engagement: { likes: 0, follows: 0, subscriptions: 0 },
      traffic: { total: 0, last7: 0, bySource: [], topPaths: [], topReferrers: [] },
      topManagers: [],
      ok: false as const,
    };
  }
}
