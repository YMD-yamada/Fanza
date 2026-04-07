import { buildAffiliateUrl, getAffiliateId } from "@/lib/affiliate";
import type { NormalizedItem, SearchFilters, SearchResponse } from "@/lib/types";

const API_ENDPOINT = "https://api.dmm.com/affiliate/v3/ItemList";
const DMM_API_ID = process.env.DMM_API_ID ?? "";
const SITE = process.env.FANZA_SITE ?? "FANZA";
const SERVICE = process.env.FANZA_SERVICE ?? "digital";
const FLOOR = process.env.FANZA_FLOOR ?? "videoa";
const HITS = Number(process.env.FANZA_HITS ?? "24");

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry : getString((entry as { name?: string }).name)))
    .filter((entry): entry is string => Boolean(entry));
}

function normalizeItem(raw: Record<string, unknown>): NormalizedItem {
  const itemInfo = (raw.iteminfo as Record<string, unknown> | undefined) ?? {};
  const sampleImagesRaw = (raw.sampleImageURL as Record<string, unknown> | undefined) ?? {};
  const sampleList = (sampleImagesRaw.sample_s as unknown[] | undefined) ?? [];

  const actressInfo = (itemInfo.actress as unknown[] | undefined) ?? [];
  const genreInfo = (itemInfo.genre as unknown[] | undefined) ?? [];
  const affiliateUrl = getString(raw.affiliateURL) ?? getString(raw.URL) ?? "#";

  return {
    id: getString(raw.content_id) ?? getString(raw.product_id) ?? crypto.randomUUID(),
    title: getString(raw.title) ?? "タイトル不明",
    titleKana: getString(raw.title_kana),
    description: getString(raw.comment),
    actressNames: getArray(actressInfo.map((x) => (x as { name?: string }).name)),
    genres: getArray(genreInfo.map((x) => (x as { name?: string }).name)),
    packageImageUrl: getString((raw.imageURL as Record<string, unknown> | undefined)?.small),
    largeImageUrl: getString((raw.imageURL as Record<string, unknown> | undefined)?.large),
    sampleVideoUrl: getString((raw.sampleMovieURL as Record<string, unknown> | undefined)?.size_720_480),
    sampleImages: sampleList
      .map((entry) => getString((entry as Record<string, unknown>).image))
      .filter((entry): entry is string => Boolean(entry)),
    listPrice: getString(raw.prices),
    releaseDate: getString(raw.date),
    reviewAverage:
      typeof raw.review_average === "number"
        ? raw.review_average
        : Number.isNaN(Number(raw.review_average))
          ? undefined
          : Number(raw.review_average),
    productUrl: getString(raw.URL),
    affiliateUrl: buildAffiliateUrl(affiliateUrl),
  };
}

function ensureConfig() {
  if (!DMM_API_ID) {
    throw new Error("DMM_API_ID is missing.");
  }
  if (!getAffiliateId()) {
    throw new Error("DMM_AFFILIATE_ID is missing.");
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

  const response = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    throw new Error(`Fanza API request failed (${response.status}).`);
  }

  const json = (await response.json()) as RawSearchResult;
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
