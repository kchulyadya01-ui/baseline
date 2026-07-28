import type { MetadataRoute } from "next";
import { allFonts } from "@/lib/fonts";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://baseline-wheat.vercel.app";

/**
 * One entry per font family — ~1,900 pages, which is the entire point of the
 * programmatic SEO surface. Priority tracks popularity so crawlers spend their
 * budget on the families people actually search for.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/fonts`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/type-scale`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/colour`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/identify`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/licences`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/roadmap`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const fontRoutes: MetadataRoute.Sitemap = allFonts().map((font, index) => ({
    url: `${BASE}/fonts/${font.slug}`,
    lastModified: new Date(font.lastModified),
    changeFrequency: "monthly" as const,
    priority: index < 100 ? 0.7 : index < 500 ? 0.5 : 0.3,
  }));

  return [...staticRoutes, ...fontRoutes];
}
