import { prisma } from "./prisma";
import { managerPath } from "./seo";

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
          include: { tags: true },
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
  tags: Array<{ tag: string; sentiment: string }>;
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
    date: review.createdAt.toISOString(),
  };
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
