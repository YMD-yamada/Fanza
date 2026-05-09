import type { NormalizedItem, SourceId } from "@/lib/types";
import type { ItemLookup, ProviderSearchFilters, SearchProvider } from "@/lib/search-providers/types";

/** Lowercase slug for source query param / favorites key */
const SOURCE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;

export type HttpJsonProviderConfig = {
  id: string;
  label: string;
  baseUrl: string;
  apiKey?: string;
  apiKeyHeader?: string;
  affiliateFallbackUrl?: string;
  mergePriority?: number;
};

type RemoteItem = {
  id?: string;
  title?: string;
  titleKana?: string;
  description?: string;
  actresses?: string[];
  genres?: string[];
  image?: string;
  imageLarge?: string;
  sampleVideo?: string;
  sampleImages?: string[];
  priceLabel?: string;
  priceMin?: number;
  releaseDate?: string;
  reviewAverage?: number;
  reviewCount?: number;
  productUrl?: string;
  affiliateUrl?: string;
};

type RemoteSearchPayload = {
  items?: RemoteItem[];
  totalCount?: number;
  hasNext?: boolean;
  page?: number;
};

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

/**
 * Adapter for an official HTTP JSON API that matches this contract:
 * - GET {base}/search?q=&page=&sort=... (& optional cat, gte_date, lte_date)
 * - GET {base}/items/{id} (& optional cat)
 * Response fields are normalized into NormalizedItem (see normalize below).
 */
export function createHttpJsonProvider(config: HttpJsonProviderConfig): SearchProvider | null {
  if (!SOURCE_ID_RE.test(config.id)) {
    console.warn(`[http-json-provider] invalid id (use a-z0-9_-): ${config.id}`);
    return null;
  }

  const id = config.id as SourceId;
  const base = config.baseUrl.replace(/\/+$/, "");
  const headerName = (config.apiKeyHeader ?? "x-api-key").trim() || "x-api-key";
  const affiliateFallback = (config.affiliateFallbackUrl ?? "#").trim() || "#";
  const mergePriority =
    typeof config.mergePriority === "number" && Number.isFinite(config.mergePriority)
      ? config.mergePriority
      : 50;

  function normalize(item: RemoteItem): NormalizedItem | null {
    if (!item.id || !item.title) return null;
    return {
      id: item.id,
      source: id,
      sourceLabel: config.label,
      title: item.title,
      titleKana: item.titleKana,
      description: item.description,
      actressNames: toArray(item.actresses),
      genres: toArray(item.genres),
      packageImageUrl: item.image,
      largeImageUrl: item.imageLarge,
      sampleVideoUrl: item.sampleVideo,
      sampleImages: toArray(item.sampleImages).slice(0, 8),
      listPrice: item.priceLabel,
      priceMin: typeof item.priceMin === "number" ? item.priceMin : undefined,
      releaseDate: item.releaseDate,
      reviewAverage: typeof item.reviewAverage === "number" ? item.reviewAverage : undefined,
      reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : undefined,
      productUrl: item.productUrl,
      affiliateUrl: item.affiliateUrl || affiliateFallback,
      score: typeof item.reviewAverage === "number" ? item.reviewAverage : 0,
    };
  }

  async function fetchJson(path: string, params: URLSearchParams | undefined, signal: AbortSignal) {
    const url = `${base}${path}${params ? `?${params.toString()}` : ""}`;
    const headers = new Headers();
    if (config.apiKey) headers.set(headerName, config.apiKey);
    const response = await fetch(url, {
      headers,
      signal,
      next: { revalidate: 120 },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`http-json-provider(${config.id}) failed (${response.status}): ${body.slice(0, 160)}`);
    }
    return response.json() as Promise<unknown>;
  }

  function buildSearchParams(filters: ProviderSearchFilters): URLSearchParams {
    const params = new URLSearchParams({
      q: filters.keyword,
      page: String(filters.page),
      sort: filters.sort ?? "rank",
    });
    if (filters.gteDate) params.set("gte_date", filters.gteDate);
    if (filters.lteDate) params.set("lte_date", filters.lteDate);
    if (filters.catalog) params.set("cat", filters.catalog);
    return params;
  }

  async function searchRaw(filters: ProviderSearchFilters, timeoutMs: number): Promise<RemoteSearchPayload> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const json = await fetchJson("/search", buildSearchParams(filters), controller.signal);
      if (!json || typeof json !== "object") return {};
      return json as RemoteSearchPayload;
    } finally {
      clearTimeout(timer);
    }
  }

  async function getByIdRaw(lookup: ItemLookup, timeoutMs: number): Promise<RemoteItem | null> {
    const params = new URLSearchParams();
    if (lookup.catalog) params.set("cat", lookup.catalog);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const json = await fetchJson(`/items/${encodeURIComponent(lookup.id)}`, params, controller.signal);
      if (!json || typeof json !== "object") return null;
      return json as RemoteItem;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    id,
    label: config.label,
    mergePriority,
    isEnabled() {
      return Boolean(base);
    },
    async search(filters, ctx) {
      const data = await searchRaw(filters, ctx.timeoutMs);
      const items = (data.items ?? [])
        .map(normalize)
        .filter((item): item is NormalizedItem => Boolean(item));
      return {
        source: id,
        items,
        totalCount: typeof data.totalCount === "number" ? data.totalCount : items.length,
        page: typeof data.page === "number" ? data.page : filters.page,
        hasNext: Boolean(data.hasNext),
      };
    },
    async getById(lookup, ctx) {
      const raw = await getByIdRaw(lookup, ctx.timeoutMs);
      return raw ? normalize(raw) : null;
    },
  };
}
