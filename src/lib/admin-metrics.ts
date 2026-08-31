import { prisma } from "./prisma";
import { managerPath } from "./seo";

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

export type DayPoint = { date: string; reviews: number; comments: number; views: number };

/**
 * Per-day counts for the last `days` days (UTC buckets), gaps filled with zero so
 * the chart always has a continuous run. Grouped in the DB rather than pulling
 * rows, so the pageview table staying large doesn't matter here.
 */
async function buildDailySeries(days: number): Promise<DayPoint[]> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const daily = (table: string) =>
    prisma.$queryRawUnsafe<Array<{ day: Date; count: number }>>(
      `SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
       FROM "${table}" WHERE "createdAt" >= $1 GROUP BY day`,
      start,
    );

  const [reviews, comments, views] = await Promise.all([
    daily("Review"),
    daily("ReviewReply"),
    daily("PageView"),
  ]);

  const key = (d: Date) => new Date(d).toISOString().slice(0, 10);
  const rMap = new Map(reviews.map((r) => [key(r.day), r.count]));
  const cMap = new Map(comments.map((r) => [key(r.day), r.count]));
  const vMap = new Map(views.map((r) => [key(r.day), r.count]));

  const out: DayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const k = d.toISOString().slice(0, 10);
    out.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      reviews: rMap.get(k) || 0,
      comments: cMap.get(k) || 0,
      views: vMap.get(k) || 0,
    });
  }
  return out;
}

export type AdminMetrics = Awaited<ReturnType<typeof getAdminMetrics>>;

/**
 * Every figure the dashboard shows. All counts run in parallel; any DB error
 * degrades the whole thing to zeros rather than 500-ing the admin page.
 */
export const RANGE_DAYS = [7, 30, 90, null] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

export function rangeLabel(days: number | null) {
  if (!days) return "All time";
  if (days === 1) return "Today";
  return `Last ${days} days`;
}

/**
 * `days` scopes the *activity* figures (reviews, comments, engagement, traffic,
 * charts) to a window; null means all time. State figures that aren't a flow —
 * the catalog size and the open-report queue — are always current, since "how
 * many managers in the last 7 days" isn't the question those answer.
 */
export async function getAdminMetrics(days: number | null = null) {
  const from = days ? since(days) : null;
  // Spread into a `where` to scope by creation time; empty when all-time.
  const tf = from ? { createdAt: { gte: from } } : {};

  try {
    const [
      reviewsTotal,
      reviewsApproved,
      reviewsVerified,
      comments,
      reportsOpen,
      managers,
      companies,
      users,
      likes,
      follows,
      subscriptions,
      hiddenReviews,
      pageViewsTotal,
      viewsBySource,
      topPathsRaw,
      topReferrersRaw,
      topManagersRaw,
    ] = await Promise.all([
      prisma.review.count({ where: { ...tf } }),
      prisma.review.count({ where: { status: "APPROVED", ...tf } }),
      prisma.review.count({ where: { emailVerifiedAt: { not: null }, ...tf } }),
      prisma.reviewReply.count({ where: { ...tf } }),
      prisma.reviewReport.count({ where: { status: "OPEN" } }),
      prisma.manager.count(),
      prisma.company.count(),
      prisma.user.count(),
      prisma.reviewVote.count({ where: { value: 1, ...tf } }),
      prisma.managerFollow.count({ where: { ...tf } }),
      prisma.reviewSubscription.count({ where: { confirmedAt: { not: null }, ...tf } }),
      prisma.review.count({ where: { status: "HIDDEN" } }),
      prisma.pageView.count({ where: { ...tf } }),
      prisma.pageView.groupBy({ by: ["source"], where: { ...tf }, _count: { _all: true } }),
      prisma.pageView.groupBy({
        by: ["path"],
        where: { ...tf },
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 8,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { referrer: { not: null }, ...tf },
        _count: { _all: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 8,
      }),
      prisma.review.groupBy({
        by: ["managerId"],
        where: { status: "APPROVED", ...tf },
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

    // Chart window follows the range; capped so all-time stays a readable line.
    const series = await buildDailySeries(Math.min(days ?? 30, 90));

    return {
      range: { days, label: rangeLabel(days) },
      series,
      reviews: { total: reviewsTotal, approved: reviewsApproved, verified: reviewsVerified, hidden: hiddenReviews },
      comments: { total: comments },
      reports: { open: reportsOpen },
      catalog: { managers, companies, users },
      engagement: { likes, follows, subscriptions },
      traffic: {
        total: pageViewsTotal,
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
      range: { days, label: rangeLabel(days) },
      series: [] as DayPoint[],
      reviews: { total: 0, approved: 0, verified: 0, hidden: 0 },
      comments: { total: 0 },
      reports: { open: 0 },
      catalog: { managers: 0, companies: 0, users: 0 },
      engagement: { likes: 0, follows: 0, subscriptions: 0 },
      traffic: { total: 0, bySource: [], topPaths: [], topReferrers: [] },
      topManagers: [],
      ok: false as const,
    };
  }
}

export type OpenReport = Awaited<ReturnType<typeof getOpenReports>>[number];

/**
 * The open moderation queue for the /admin/reports page: each open report with
 * the content it targets (review text or reply body) and the profile it lives
 * on, so an admin can read and act without hunting for it.
 */
export async function getOpenReports() {
  try {
    const reports = await prisma.reviewReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        review: { include: { manager: { include: { company: true } } } },
        reply: true,
      },
    });

    return reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      requesterName: r.requesterName,
      requesterEmail: r.requesterEmail,
      createdAt: r.createdAt.toISOString(),
      target: r.replyId ? ("reply" as const) : ("review" as const),
      reviewId: r.reviewId,
      replyId: r.replyId,
      content: r.reply ? r.reply.body : r.review.reviewText,
      managerName: r.review.manager.name,
      company: r.review.manager.company.name,
      profilePath: managerPath(r.review.manager.company.slug, r.review.manager.slug),
    }));
  } catch (error) {
    console.error("getOpenReports failed:", error);
    return [];
  }
}
