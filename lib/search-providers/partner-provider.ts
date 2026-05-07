import type { NormalizedItem } from "@/lib/types";
import type { ItemLookup, ProviderSearchFilters, SearchProvider } from "@/lib/search-providers/types";
import { withTimeout } from "@/lib/search-providers/utils";

const PARTNER_API_BASE_URL = (process.env.R18_PARTNER_API_BASE_URL ?? "").replace(/\/+$/, "");
const PARTNER_API_KEY = process.env.R18_PARTNER_API_KEY ?? "";
const PARTNER_API_KEY_HEADER = process.env.R18_PARTNER_API_KEY_HEADER ?? "x-api-key";
const PARTNER_AFFILIATE_FALLBACK = process.env.R18_PARTNER_AFFILIATE_FALLBACK_URL ?? "#";

type PartnerItem = {
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

type PartnerSearchPayload = {
  items?: PartnerItem[];
  totalCount?: number;
  hasNext?: boolean;
  page?: number;
};

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function normalize(item: PartnerItem): NormalizedItem | null {
  if (!item.id || !item.title) return null;
  return {
    id: item.id,
    source: "partner",
    sourceLabel: "R18 Partner",
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
    affiliateUrl: item.affiliateUrl || PARTNER_AFFILIATE_FALLBACK,
    score: typeof item.reviewAverage === "number" ? item.reviewAverage : 0,
  };
}

async function fetchPartner(path: string, params?: URLSearchParams) {
  if (!PARTNER_API_BASE_URL) {
    throw new Error("R18_PARTNER_API_BASE_URL is missing.");
  }
  const url = `${PARTNER_API_BASE_URL}${path}${params ? `?${params.toString()}` : ""}`;
  const headers = new Headers();
  if (PARTNER_API_KEY) headers.set(PARTNER_API_KEY_HEADER, PARTNER_API_KEY);
  const response = await fetch(url, {
    headers,
    next: { revalidate: 120 },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`partner-provider failed (${response.status}): ${body.slice(0, 160)}`);
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

async function searchRaw(filters: ProviderSearchFilters): Promise<PartnerSearchPayload> {
  const json = await fetchPartner("/search", buildSearchParams(filters));
  if (!json || typeof json !== "object") return {};
  return json as PartnerSearchPayload;
}

async function getByIdRaw(lookup: ItemLookup): Promise<PartnerItem | null> {
  const params = new URLSearchParams();
  if (lookup.catalog) params.set("cat", lookup.catalog);
  const json = await fetchPartner(`/items/${encodeURIComponent(lookup.id)}`, params);
  if (!json || typeof json !== "object") return null;
  return json as PartnerItem;
}

export const partnerProvider: SearchProvider = {
  id: "partner",
  label: "R18 Partner",
  isEnabled() {
    return Boolean(PARTNER_API_BASE_URL);
  },
  async search(filters, ctx) {
    const data = await withTimeout(
      searchRaw(filters),
      ctx.timeoutMs,
      "partner-provider.search",
    );
    const items = (data.items ?? [])
      .map(normalize)
      .filter((item): item is NormalizedItem => Boolean(item));
    return {
      source: "partner",
      items,
      totalCount: typeof data.totalCount === "number" ? data.totalCount : items.length,
      page: typeof data.page === "number" ? data.page : filters.page,
      hasNext: Boolean(data.hasNext),
    };
  },
  async getById(lookup, ctx) {
    const raw = await withTimeout(
      getByIdRaw(lookup),
      ctx.timeoutMs,
      "partner-provider.getById",
    );
    return raw ? normalize(raw) : null;
  },
};
