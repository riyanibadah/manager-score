import type { MetadataRoute } from "next";
import { getApprovedManagerUrls, getReviewedCompanies } from "../src/lib/public-data";
import { siteUrl } from "../src/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();
  const [managerUrls, companies] = await Promise.all([
    getApprovedManagerUrls(),
    getReviewedCompanies(),
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
