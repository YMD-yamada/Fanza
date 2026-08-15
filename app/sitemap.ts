import type { MetadataRoute } from "next";

import { CATALOGS, type CatalogId } from "@/lib/catalogs";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const catalogIds = Object.keys(CATALOGS) as CatalogId[];
  const catalogUrls = catalogIds.flatMap((id) => {
    const base = id === "video" ? `${SITE_URL}/` : `${SITE_URL}/?cat=${id}`;
    const rank = id === "video" ? `${SITE_URL}/?view=rank` : `${SITE_URL}/?cat=${id}&view=rank`;
    const newest = id === "video" ? `${SITE_URL}/?view=new` : `${SITE_URL}/?cat=${id}&view=new`;
    return [
      { url: base, lastModified: now, changeFrequency: "hourly" as const, priority: id === "video" ? 1 : 0.8 },
      { url: rank, lastModified: now, changeFrequency: "hourly" as const, priority: 0.7 },
      { url: newest, lastModified: now, changeFrequency: "hourly" as const, priority: 0.7 },
    ];
  });

  return [
    ...catalogUrls,
    {
      url: `${SITE_URL}/legal/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/legal/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/legal/notice`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
