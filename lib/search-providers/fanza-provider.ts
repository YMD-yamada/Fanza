import { getFanzaItemById, searchFanza } from "@/lib/fanza";
import type { SearchProvider } from "@/lib/search-providers/types";
import { withTimeout } from "@/lib/search-providers/utils";

export const fanzaProvider: SearchProvider = {
  id: "fanza",
  label: "FANZA",
  isEnabled() {
    return true;
  },
  async search(filters, ctx) {
    const res = await withTimeout(
      searchFanza(filters),
      ctx.timeoutMs,
      "fanza-provider.search",
    );
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
  },
  async getById(lookup, ctx) {
    const item = await withTimeout(
      getFanzaItemById(lookup.id, lookup.catalog),
      ctx.timeoutMs,
      "fanza-provider.getById",
    );
    if (!item) return null;
    return {
      ...item,
      source: "fanza",
      sourceLabel: "FANZA",
    };
  },
};
