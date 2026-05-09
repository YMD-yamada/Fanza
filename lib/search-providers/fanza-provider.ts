import { getFanzaItemById, searchFanza } from "@/lib/fanza";
import type { SearchProvider } from "@/lib/search-providers/types";

export const fanzaProvider: SearchProvider = {
  id: "fanza",
  label: "FANZA",
  mergePriority: 0,
  isEnabled() {
    return true;
  },
  async search(filters, ctx) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ctx.timeoutMs);
    try {
      const res = await searchFanza(filters, { signal: controller.signal });
      return {
        source: "fanza",
        items: res.items.map((item) => ({
          ...item,
          source: "fanza",
          sourceLabel: "FANZA",
        })),
        totalCount: res.totalCount,
        page: res.page,
        hasNext: res.hasNext,
      };
    } finally {
      clearTimeout(timer);
    }
  },
  async getById(lookup, ctx) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ctx.timeoutMs);
    try {
      const item = await getFanzaItemById(lookup.id, lookup.catalog, { signal: controller.signal });
      if (!item) return null;
      return {
        ...item,
        source: "fanza",
        sourceLabel: "FANZA",
      };
    } finally {
      clearTimeout(timer);
    }
  },
};
