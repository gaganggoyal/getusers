import type { MetadataRoute } from "next";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Public register pages stay crawlable; more specific Allow beats the
      // /advertiser Disallow for the register/login pages.
      allow: ["/", "/advertiser/register", "/advertiser/login"],
      disallow: [
        "/api/",
        "/go/",
        "/embed/",
        "/admin",
        "/dashboard",
        "/advertiser",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
