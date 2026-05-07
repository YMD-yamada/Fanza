import type { SearchResponse, SearchWarning, SourceId } from "@/lib/types";
import type { SearchRequestInput } from "@/lib/search-providers/types";
import { getEnabledProviders, getProviderById } from "@/lib/search-providers";

const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS ?? "3000");
const PROVIDER_TIMEOUT_SAFE = Number.isFinite(PROVIDER_TIMEOUT_MS) && PROVIDER_TIMEOUT_MS > 0
  ? Math.floor(PROVIDER_TIMEOUT_MS)
  : 3000;

const MULTI_SEARCH_MODE = (process.env.MULTI_SEARCH_MODE ?? "auto").toLowerCase();
const FALLBACK_SLOW_MS = Number(process.env.MULTI_FALLBACK_SLOW_MS ?? "2400");
const FALLBACK_SLOW_SAFE = Number.isFinite(FALLBACK_SLOW_MS) && FALLBACK_SLOW_MS > 0
  ? Math.floor(FALLBACK_SLOW_MS)
  : 2400;

function dedupeBySourceAndId<T extends { source: SourceId; id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function aggregateSearch(input: SearchRequestInput): Promise<SearchResponse> {
  const allProviders = getEnabledProviders();
  const providers = input.source
    ? allProviders.filter((p) => p.id === input.source)
    : allProviders;
  if (providers.length === 0) {
    return {
      items: [],
      totalCount: 0,
      page: input.page,
      hasNext: false,
      partial: false,
      warnings: [{ source: "fanza", message: "No providers enabled." }],
      mode: "source_tabs",
    };
  }

  const warnings: SearchWarning[] = [];
  const startedAt = Date.now();
  const settled = await Promise.allSettled(
    providers.map((provider) => provider.search(input, { timeoutMs: PROVIDER_TIMEOUT_SAFE })),
  );

  const results = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    warnings.push({
      source: providers[index].id,
      message: result.reason instanceof Error ? result.reason.message : "Unknown provider error.",
    });
    return [];
  });

  const mergedItems = dedupeBySourceAndId(
    results
      .flatMap((result) => result.items)
      .sort((a, b) => {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
      }),
  );

  const totalCount = results.reduce((sum, result) => sum + result.totalCount, 0);
  const hasNext = results.some((result) => result.hasNext);
  const elapsed = Date.now() - startedAt;
  const partial = warnings.length > 0;

  let mode: "unified" | "source_tabs";
  if (MULTI_SEARCH_MODE === "unified") {
    mode = "unified";
  } else if (MULTI_SEARCH_MODE === "tabs" || MULTI_SEARCH_MODE === "source_tabs") {
    mode = "source_tabs";
  } else {
    mode = partial || elapsed >= FALLBACK_SLOW_SAFE ? "source_tabs" : "unified";
  }

  return {
    items: mergedItems,
    totalCount,
    page: input.page,
    hasNext,
    partial,
    warnings,
    mode,
  };
}

export async function aggregateGetById(input: {
  id: string;
  source?: SourceId;
  catalog?: SearchRequestInput["catalog"];
}) {
  const provider = input.source ? getProviderById(input.source) : null;
  const providers = provider ? [provider] : getEnabledProviders();
  for (const current of providers) {
    try {
      const item = await current.getById(
        { id: input.id, source: current.id, catalog: input.catalog },
        { timeoutMs: PROVIDER_TIMEOUT_SAFE },
      );
      if (item) return item;
    } catch {
      // Try next provider.
    }
  }
  return null;
}
