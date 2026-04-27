import type { NormalizedItem } from "@/lib/types";

export type ClientItemFilters = {
  priceMin: number;
  priceMax: number;
  hasVideo: boolean;
};

export function filterNormalizedItems(
  items: NormalizedItem[],
  f: ClientItemFilters,
): NormalizedItem[] {
  return items.filter((item) => {
    if (f.hasVideo && !item.sampleVideoUrl) return false;
    if (f.priceMax > 0 && (item.priceMin == null || item.priceMin > f.priceMax)) {
      return false;
    }
    if (f.priceMin > 0 && (item.priceMin == null || item.priceMin < f.priceMin)) {
      return false;
    }
    return true;
  });
}
