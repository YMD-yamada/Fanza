import type { CatalogId } from "@/lib/catalogs";
import type { SourceId } from "@/lib/types";

/** 詳細ページ URL（動画カタログはクエリ省略で短く） */
export function itemDetailPath(id: string, catalog?: CatalogId, source?: SourceId): string {
  const base = `/items/${encodeURIComponent(id)}`;
  const params = new URLSearchParams();
  if (catalog && catalog !== "video") params.set("cat", catalog);
  if (source && source !== "fanza") params.set("source", source);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
