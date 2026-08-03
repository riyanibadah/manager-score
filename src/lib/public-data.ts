import { prisma } from "./prisma";
import { companyPath, managerPath } from "./seo";
import { hashValue } from "./reviews";

export type PublicReview = Awaited<ReturnType<typeof getRecentReviews>>[number];

export async function getRecentReviews(take = 20) {
  if (!process.env.DATABASE_URL) return [];

  try {
    const reviews = await prisma.review.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        manager: { include: { company: true } },
        tags: true,
      },
    });

    return reviews.map((review) => serializeReview(review));
  } catch (error) {
    // Degrade gracefully (e.g. during a schema/DB migration window) instead of
    // 500-ing the whole homepage. Returning [] keeps the page available to users
    // and crawlers; a 5xx makes Google back off and can drop indexed URLs.
    console.error("getRecentReviews failed:", error);
    return [];
  }
}

export async function getManagerProfile(companySlug: string, managerSlug: string) {
  if (!process.env.DATABASE_URL) return null;

  try {
    const manager = await prisma.manager.findFirst({
      where: {
        slug: managerSlug,
        company: { slug: companySlug },
      },
      include: {
        company: true,
        reviews: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          include: {
            tags: true,
            replies: {
              where: { status: "APPROVED" },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!manager) return null;

    const reviews = manager.reviews.map((review) => serializeReview({
      ...review,
      manager,
    }));
    const reviewCount = reviews.length;
    const averageScore = average(reviews.map((review) => review.overall));
    const communication = average(reviews.map((review) => review.communication));
    const supportGrowth = average(reviews.map((review) => review.recognition));
    const worklife = average(reviews.map((review) => review.worklife));
    const wouldAgainPct = reviewCount
      ? Math.round((reviews.filter((review) => review.wouldAgain).length / reviewCount) * 100)
      : 0;
    const tagCounts = new Map<string, { tag: string; sentiment: string; count: number }>();

    for (const review of reviews) {
      for (const trait of review.traits) {
        const key = trait.tag.toLowerCase();
        const current = tagCounts.get(key) || { ...trait, count: 0 };
        current.count += 1;
        tagCounts.set(key, current);
      }
    }

    return {
      id: manager.id,
      name: manager.name,
      slug: manager.slug,
      title: manager.title,
      department: manager.department,
      linkedinUrl: manager.linkedinUrl,
      company: manager.company.name,
      companySlug: manager.company.slug,
      profilePath: managerPath(manager.company.slug, manager.slug),
      reviewCount,
      averageScore,
      communication,
      supportGrowth,
      worklife,
      wouldAgainPct,
      tags: [...tagCounts.values()].sort((a, b) => b.count - a.count).slice(0, 12),
      reviews,
    };
  } catch (error) {
    // Treat a DB error (e.g. mid-migration schema drift) like a not-found so the
    // route renders a 404 rather than a 5xx. Self-heals once the migration lands.
    console.error("getManagerProfile failed:", error);
    return null;
  }
}

/**
 * The current voter's own votes across a profile, so their up/down arrows can
 * render already-selected. One query for the whole page rather than per item.
 */
export async function getVoterVotes(
  voterKey: string | undefined,
  { reviewIds, replyIds }: { reviewIds: string[]; replyIds: string[] },
) {
  const empty = {} as Record<string, number>;
  if (!voterKey || !process.env.DATABASE_URL) return empty;
  if (!reviewIds.length && !replyIds.length) return empty;

  try {
    // Scoped to what this page actually renders — a prolific voter's full
    // history could otherwise be thousands of rows for no benefit.
    const votes = await prisma.reviewVote.findMany({
      where: {
        voterKey,
        OR: [{ reviewId: { in: reviewIds } }, { replyId: { in: replyIds } }],
      },
      select: { reviewId: true, replyId: true, value: true },
    });

    const map: Record<string, number> = {};
    for (const vote of votes) {
      const id = vote.reviewId || vote.replyId;
      if (id) map[id] = vote.value;
    }
    return map;
  } catch (error) {
    console.error("getVoterVotes failed:", error);
    return empty;
  }
}

export async function hasLiveUnlockToken(tokens: string[]) {
  if (!tokens.length || !process.env.DATABASE_URL) return false;

  try {
    const hashes = tokens.map((token) => hashValue(token));
    const match = await prisma.review.findFirst({
      where: { unlockTokenHash: { in: hashes }, status: "APPROVED" },
      select: { id: true },
    });
    return Boolean(match);
  } catch (error) {
    console.error("hasLiveUnlockToken failed:", error);
    return false;
  }
}

export async function hasLiveReviewForUser(userId: string) {
  if (!process.env.DATABASE_URL) return false;

  try {
    const match = await prisma.review.findFirst({
      where: { userId, status: "APPROVED" },
      select: { id: true },
    });
    return Boolean(match);
  } catch (error) {
    console.error("hasLiveReviewForUser failed:", error);
    return false;
  }
}

/**
 * Company landing page: the managers at one company who have approved reviews.
 *
 * Deliberately returns no ratings. Scores are gated behind the unlock wall on
 * the profile page, so surfacing an average here would hand every visitor the
 * exact number the wall exists to withhold. Review counts are already visible
 * to locked visitors on the profile, so they're safe to repeat.
 */
export async function getCompanyProfile(companySlug: string) {
  if (!process.env.DATABASE_URL) return null;

  try {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      include: {
        managers: {
          where: { reviews: { some: { status: "APPROVED" } } },
          include: {
            _count: { select: { reviews: { where: { status: "APPROVED" } } } },
          },
        },
      },
    });

    if (!company || !company.managers.length) return null;

    const managers = company.managers
      .map((manager) => ({
        id: manager.id,
        name: manager.name,
        title: manager.title,
        department: manager.department,
        reviewCount: manager._count.reviews,
        profilePath: managerPath(company.slug, manager.slug),
      }))
      .sort((a, b) => b.reviewCount - a.reviewCount || a.name.localeCompare(b.name));

    return {
      name: company.name,
      slug: company.slug,
      companyPath: companyPath(company.slug),
      managerCount: managers.length,
      reviewCount: managers.reduce((sum, manager) => sum + manager.reviewCount, 0),
      managers,
    };
  } catch (error) {
    // Same posture as getManagerProfile: a DB blip renders 404, not 5xx.
    console.error("getCompanyProfile failed:", error);
    return null;
  }
}

/** Companies with at least one approved review, for the /companies index. */
export async function getReviewedCompanies() {
  if (!process.env.DATABASE_URL) return [];

  try {
    const companies = await prisma.company.findMany({
      where: { managers: { some: { reviews: { some: { status: "APPROVED" } } } } },
      select: {
        name: true,
        slug: true,
        updatedAt: true,
        managers: {
          where: { reviews: { some: { status: "APPROVED" } } },
          select: { id: true },
        },
      },
    });

    return companies
      .map((company) => ({
        name: company.name,
        slug: company.slug,
        companyPath: companyPath(company.slug),
        managerCount: company.managers.length,
        lastModified: company.updatedAt,
      }))
      .sort((a, b) => b.managerCount - a.managerCount || a.name.localeCompare(b.name));
  } catch (error) {
    console.error("getReviewedCompanies failed:", error);
    return [];
  }
}

export async function getApprovedManagerUrls() {
  if (!process.env.DATABASE_URL) return [];

  try {
    const managers = await prisma.manager.findMany({
      where: { reviews: { some: { status: "APPROVED" } } },
      select: {
        slug: true,
        updatedAt: true,
        company: { select: { slug: true } },
        reviews: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    return managers.map((manager) => ({
      url: managerPath(manager.company.slug, manager.slug),
      lastModified: manager.reviews[0]?.createdAt || manager.updatedAt,
    }));
  } catch (error) {
    // Keep sitemap.xml serving (just the homepage) instead of 5xx-ing, which
    // would make Search Console report "Couldn't fetch" and stall discovery.
    console.error("getApprovedManagerUrls failed:", error);
    return [];
  }
}

function serializeReview(review: {
  id: string;
  reviewerRole: string | null;
  workedWith: string | null;
  employmentType: string | null;
  employeeStatus: string | null;
  overall: number;
  communication: number;
  worklife: number;
  recognition: number;
  wouldAgain: boolean;
  reviewText: string;
  createdAt: Date;
  manager: {
    name: string;
    slug: string;
    title: string;
    department: string | null;
    linkedinUrl: string | null;
    company: { name: string; slug: string };
  };
  upvotes: number;
  downvotes: number;
  tags: Array<{ tag: string; sentiment: string }>;
  // Only the profile query loads replies; list views (homepage feed) skip them.
  replies?: Array<{
    id: string;
    parentId: string | null;
    body: string;
    authorRole: string | null;
    upvotes: number;
    downvotes: number;
    createdAt: Date;
  }>;
}) {
  const overall = Math.round(average([review.communication, review.worklife, review.recognition]) * 10) / 10;

  return {
    id: review.id,
    managerName: review.manager.name,
    managerSlug: review.manager.slug,
    managerTitle: review.manager.title,
    company: review.manager.company.name,
    companySlug: review.manager.company.slug,
    profilePath: managerPath(review.manager.company.slug, review.manager.slug),
    department: review.manager.department,
    linkedinUrl: review.manager.linkedinUrl,
    reviewerRole: review.reviewerRole,
    workedWith: review.workedWith,
    employmentType: review.employmentType,
    employeeStatus: review.employeeStatus,
    overall,
    communication: review.communication,
    worklife: review.worklife,
    recognition: review.recognition,
    wouldAgain: review.wouldAgain,
    reviewText: review.reviewText,
    traits: review.tags.map((tag) => ({
      tag: tag.tag,
      sentiment: tag.sentiment.toLowerCase(),
    })),
    upvotes: review.upvotes,
    downvotes: review.downvotes,
    replies: (review.replies || []).map((reply) => ({
      id: reply.id,
      parentId: reply.parentId,
      body: reply.body,
      authorRole: reply.authorRole,
      upvotes: reply.upvotes,
      downvotes: reply.downvotes,
      date: reply.createdAt.toISOString(),
    })),
    date: review.createdAt.toISOString(),
  };
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

/** How many peers to list; enough to be useful, not so many it becomes a dump. */
const CONTEXT_PEER_LIMIT = 8;

/**
 * What a profile can say when its own reviews aren't readable — because none
 * exist yet, or because the visitor hasn't unlocked them.
 *
 * Most profiles are imported and have no reviews, which left them as a name, a
 * title and a wall. Someone arriving from a name search got nothing, and a page
 * with nothing on it is both a poor landing and ineligible to carry ads.
 *
 * Deliberately limited to what company pages already publish: names, titles and
 * review counts. No review text and no scores — those stay behind the
 * contribution wall, so this adds substance without spending the thing people
 * write a review to see.
 */
export async function getProfileContext(
  companySlug: string,
  managerId: string,
  title: string | null,
) {
  if (!process.env.DATABASE_URL) return null;

  try {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      include: {
        managers: {
          where: {
            id: { not: managerId },
            reviews: { some: { status: "APPROVED" } },
          },
          include: { _count: { select: { reviews: { where: { status: "APPROVED" } } } } },
        },
      },
    });

    // With no reviewed colleagues there is nothing truthful to add, and an
    // empty section is worse than none. Callers treat null as "stay quiet".
    if (!company || !company.managers.length) return null;

    const peers = company.managers
      .map((manager) => ({
        id: manager.id,
        name: manager.name,
        title: manager.title,
        reviewCount: manager._count.reviews,
        profilePath: managerPath(company.slug, manager.slug),
      }))
      .sort((a, b) => b.reviewCount - a.reviewCount || a.name.localeCompare(b.name));

    // Same job title reads as far more relevant than "someone else here", so
    // those lead. Comparison is loose because titles are free text.
    const normalized = (title || "").trim().toLowerCase();
    const sameRole = normalized
      ? peers.filter((peer) => (peer.title || "").trim().toLowerCase() === normalized)
      : [];

    return {
      companyName: company.name,
      companyPath: companyPath(company.slug),
      reviewedManagerCount: peers.length,
      reviewCount: peers.reduce((sum, peer) => sum + peer.reviewCount, 0),
      roleTitle: sameRole.length ? title : null,
      roleManagerCount: sameRole.length,
      roleReviewCount: sameRole.reduce((sum, peer) => sum + peer.reviewCount, 0),
      peers: (sameRole.length ? sameRole : peers).slice(0, CONTEXT_PEER_LIMIT),
      peersAreSameRole: sameRole.length > 0,
    };
  } catch (error) {
    // Context is an enhancement; a failure here must not 404 the profile.
    console.error("getProfileContext failed:", error);
    return null;
  }
}
