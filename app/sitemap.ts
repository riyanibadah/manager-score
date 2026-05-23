import type { MetadataRoute } from "next";
import { getApprovedManagerUrls } from "../src/lib/public-data";
import { siteUrl } from "../src/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl();
  const managerUrls = await getApprovedManagerUrls();

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...managerUrls.map((manager) => ({
      url: `${baseUrl}${manager.url}`,
      lastModified: manager.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
