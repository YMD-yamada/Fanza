import type { CatalogId } from "@/lib/catalogs";

/** 詳細ページ URL（動画カタログはクエリ省略で短く） */
export function itemDetailPath(id: string, catalog?: CatalogId): string {
  const base = `/items/${encodeURIComponent(id)}`;
  if (!catalog || catalog === "video") return base;
  return `${base}?cat=${catalog}`;
}
