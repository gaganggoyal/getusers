import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

// Regenerate per request so newly published giveaways appear immediately and
// the build never depends on the database (all pages are dynamic anyway).
export const dynamic = "force-dynamic";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const giveaways = await db.giveaway.findMany({
    where: { status: { not: "DRAFT" } },
    select: { id: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/advertiser/register`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const giveawayRoutes: MetadataRoute.Sitemap = giveaways.map((g) => ({
    url: `${BASE}/giveaways/${g.id}`,
    lastModified: g.createdAt,
    changeFrequency: g.status === "ACTIVE" ? "daily" : "monthly",
    priority: g.status === "ACTIVE" ? 0.8 : 0.4,
  }));

  return [...staticRoutes, ...giveawayRoutes];
}
