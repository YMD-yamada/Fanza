import { buildAffiliateUrl, getAffiliateId } from "@/lib/affiliate";
import type { ArticleType, NormalizedItem, SearchFilters, SearchResponse } from "@/lib/types";

const VALID_ARTICLES: ReadonlySet<ArticleType> = new Set([
  "actress", "author", "genre", "maker", "series", "label",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/;

function toApiDate(date: string, fallbackTime: string): string {
  return date.includes("T") ? date : `${date}T${fallbackTime}`;
}

const API_ENDPOINT = "https://api.dmm.com/affiliate/v3/ItemList";
const DMM_API_ID = process.env.DMM_API_ID ?? "";
const SITE = process.env.FANZA_SITE ?? "FANZA";
const SERVICE = process.env.FANZA_SERVICE ?? "digital";
const FLOOR = process.env.FANZA_FLOOR ?? "videoa";
const DEFAULT_HITS = 8;
const MAX_HITS = 12;
const parsedHits = Number(process.env.FANZA_HITS ?? String(DEFAULT_HITS));
const HITS = Number.isFinite(parsedHits) && parsedHits > 0 ? Math.min(Math.floor(parsedHits), MAX_HITS) : DEFAULT_HITS;

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry : getString((entry as { name?: string }).name)))
    .filter((entry): entry is string => Boolean(entry));
}

function parseReviewAverage(review: unknown): number | undefined {
  if (review == null) return undefined;
  if (typeof review === "object") {
    const avg = (review as Record<string, unknown>).average;
    const num = Number(avg);
    return Number.isFinite(num) ? num : undefined;
  }
  const num = Number(review);
  return Number.isFinite(num) ? num : undefined;
}

function parseReviewCount(review: unknown): number | undefined {
  if (review == null || typeof review !== "object") return undefined;
  const count = Number((review as Record<string, unknown>).count);
  return Number.isFinite(count) ? count : undefined;
}

function parsePriceMin(prices: unknown): number | undefined {
  if (prices == null || typeof prices !== "object") return undefined;
  const p = (prices as Record<string, unknown>).price;
  if (typeof p === "number") return p;
  if (typeof p === "string") {
    const n = parseInt(p.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parsePriceLabel(prices: unknown): string | undefined {
  if (prices == null || typeof prices !== "object") {
    return getString(prices);
  }
  const p = (prices as Record<string, unknown>).price;
  return typeof p === "string" ? `${p}円` : getString(p);
}

function normalizeItem(raw: Record<string, unknown>): NormalizedItem {
  const itemInfo = (raw.iteminfo as Record<string, unknown> | undefined) ?? {};
  const sampleImagesRaw = (raw.sampleImageURL as Record<string, unknown> | undefined) ?? {};
  const sampleSRaw = sampleImagesRaw.sample_s;
  const sampleList = Array.isArray(sampleSRaw) ? sampleSRaw : [];

  const actressInfo = (itemInfo.actress as unknown[] | undefined) ?? [];
  const genreInfo = (itemInfo.genre as unknown[] | undefined) ?? [];
  const rawAffiliateUrl = getString(raw.affiliateURL);
  const affiliateUrl = rawAffiliateUrl ?? buildAffiliateUrl(getString(raw.URL));

  const sampleMovie = (raw.sampleMovieURL as Record<string, unknown> | undefined) ?? {};
  const sampleVideoUrl =
    getString(sampleMovie.size_720_480) ??
    getString(sampleMovie.size_644_414) ??
    getString(sampleMovie.size_560_360) ??
    getString(sampleMovie.size_476_306);

  return {
    id: getString(raw.content_id) ?? getString(raw.product_id) ?? crypto.randomUUID(),
    title: getString(raw.title) ?? "タイトル不明",
    titleKana: getString(raw.title_kana),
    description: getString(raw.comment),
    actressNames: getArray(actressInfo.map((x) => (x as { name?: string }).name)),
    genres: getArray(genreInfo.map((x) => (x as { name?: string }).name)),
    packageImageUrl: getString((raw.imageURL as Record<string, unknown> | undefined)?.small),
    largeImageUrl: getString((raw.imageURL as Record<string, unknown> | undefined)?.large),
    sampleVideoUrl,
    sampleImages: sampleList
      .map((entry) => getString((entry as Record<string, unknown>).image))
      .filter((entry): entry is string => Boolean(entry))
      .slice(0, 8),
    listPrice: parsePriceLabel(raw.prices),
    priceMin: parsePriceMin(raw.prices),
    releaseDate: getString(raw.date),
    reviewAverage: parseReviewAverage(raw.review),
    reviewCount: parseReviewCount(raw.review),
    productUrl: getString(raw.URL),
    affiliateUrl: affiliateUrl || "#",
  };
}

function ensureConfig() {
  if (!DMM_API_ID) {
    throw new Error("DMM_API_ID is missing.");
  }
  const affiliateId = getAffiliateId();
  if (!affiliateId) {
    throw new Error("DMM_AFFILIATE_ID is missing.");
  }
  if (!/^[A-Za-z0-9._-]+-990$/.test(affiliateId) || affiliateId.toLowerCase() === "affiliate-990") {
    throw new Error("DMM_AFFILIATE_ID is invalid. Set your issued affiliate id (example: xxxxx-990).");
  }
}

type RawSearchResult = {
  result?: {
    result_count?: number;
    total_count?: number;
    first_position?: number;
    items?: Record<string, unknown>[];
  };
};

export async function searchFanza(filters: SearchFilters): Promise<SearchResponse> {
  ensureConfig();

  const params = new URLSearchParams({
    api_id: DMM_API_ID,
    affiliate_id: getAffiliateId(),
    site: SITE,
    service: SERVICE,
    floor: FLOOR,
    keyword: filters.keyword,
    sort: filters.sort ?? "rank",
    output: "json",
    hits: String(HITS),
    offset: String((filters.page - 1) * HITS + 1),
  });

  if (filters.gteDate && DATE_RE.test(filters.gteDate)) {
    params.set("gte_date", toApiDate(filters.gteDate, "00:00:00"));
  }
  if (filters.lteDate && DATE_RE.test(filters.lteDate)) {
    params.set("lte_date", toApiDate(filters.lteDate, "23:59:59"));
  }
  if (
    filters.article &&
    VALID_ARTICLES.has(filters.article) &&
    filters.articleId
  ) {
    params.set("article", filters.article);
    params.set("article_id", filters.articleId);
  }

  const response = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Fanza API request failed (${response.status}): ${errBody.slice(0, 160)}`);
  }

  const json = (await response.json()) as RawSearchResult & Record<string, unknown>;

  const items = (json.result?.items ?? []).map(normalizeItem);
  const totalCount = json.result?.total_count ?? 0;
  const page = filters.page;
  const hasNext = page * HITS < totalCount;

  return { items, totalCount, page, hasNext };
}

export async function getFanzaItemById(contentId: string): Promise<NormalizedItem | null> {
  const result = await searchFanza({
    keyword: contentId,
    page: 1,
    sort: "rank",
  });

  return result.items.find((item) => item.id === contentId) ?? result.items[0] ?? null;
}
