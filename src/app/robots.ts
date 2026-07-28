import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://baseline-wheat.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The identify endpoint costs an outbound fetch per call.
        disallow: ["/api/identify/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
