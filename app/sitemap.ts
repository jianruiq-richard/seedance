import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://seedance.technology";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    "",
    "/ai-image",
    "/guide",
    "/pricing",
    "/contact",
    "/terms",
    "/privacy",
    "/refund",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/guide" || path === "/pricing" ? 0.9 : 0.7,
  }));
}
