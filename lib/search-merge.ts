import type { NormalizedItem, SourceId } from "@/lib/types";

/** Normalize title for loose duplicate matching across providers */
export function normalizeTitleKey(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\u3000]/g, " ");
}

const SOURCE_PRIORITY: Record<SourceId, number> = {
  fanza: 0,
  partner: 1,
};

function pickBetter(a: NormalizedItem, b: NormalizedItem): NormalizedItem {
  const pa = SOURCE_PRIORITY[a.source] ?? 99;
  const pb = SOURCE_PRIORITY[b.source] ?? 99;
  if (pa !== pb) return pa < pb ? a : b;
  const sa = a.score ?? 0;
  const sb = b.score ?? 0;
  if (sa !== sb) return sa >= sb ? a : b;
  return a;
}

/**
 * When the same work appears on multiple providers (different IDs), collapse to one row.
 * Key = normalized title + release date (YYYY-MM-DD).
 */
export function dedupeCrossSourceByTitleAndDate(items: NormalizedItem[]): NormalizedItem[] {
  const buckets = new Map<string, NormalizedItem>();

  for (const item of items) {
    const titleKey = normalizeTitleKey(item.title);
    const dateKey = item.releaseDate ? item.releaseDate.slice(0, 10) : "";
    if (!titleKey) continue;
    const mapKey = `${titleKey}|${dateKey}`;

    const existing = buckets.get(mapKey);
    if (!existing) {
      buckets.set(mapKey, item);
      continue;
    }
    buckets.set(mapKey, pickBetter(existing, item));
  }

  return Array.from(buckets.values());
}
