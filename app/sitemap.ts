import type { MetadataRoute } from "next";
import { getApprovedManagerUrls, getReviewedCompanies } from "../src/lib/public-data";
import { getPublishedPostRefs } from "../src/lib/blog";
import { siteUrl } from "../src/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();
  const [managerUrls, companies, posts] = await Promise.all([
    getApprovedManagerUrls(),
    getReviewedCompanies(),
    getPublishedPostRefs(),
  ]);

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/companies`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...companies.map((company) => ({
      url: `${baseUrl}${company.companyPath}`,
      lastModified: company.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...managerUrls.map((manager) => ({
      url: `${baseUrl}${manager.url}`,
      lastModified: manager.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
