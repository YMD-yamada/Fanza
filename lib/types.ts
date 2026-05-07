import type { CatalogId } from "@/lib/catalogs";

export type ArticleType = "actress" | "author" | "genre" | "maker" | "series" | "label";
export type SourceId = "fanza" | "partner";
export type SearchMode = "unified" | "source_tabs";
export function isSourceId(value: string | null | undefined): value is SourceId {
  return value === "fanza" || value === "partner";
}

export type SearchFilters = {
  keyword: string;
  page: number;
  /** ItemList のフロア（省略時は動画） */
  catalog?: CatalogId;
  source?: SourceId;
  sort?: string;
  gteDate?: string;
  lteDate?: string;
  article?: ArticleType;
  articleId?: string;
};

export type NormalizedItem = {
  id: string;
  source: SourceId;
  sourceLabel: string;
  title: string;
  titleKana?: string;
  description?: string;
  actressNames: string[];
  genres: string[];
  packageImageUrl?: string;
  largeImageUrl?: string;
  sampleVideoUrl?: string;
  sampleImages: string[];
  listPrice?: string;
  priceMin?: number;
  releaseDate?: string;
  reviewAverage?: number;
  reviewCount?: number;
  productUrl?: string;
  affiliateUrl: string;
  score?: number;
};

export type SearchWarning = {
  source: SourceId;
  message: string;
};

export type SearchResponse = {
  items: NormalizedItem[];
  totalCount: number;
  page: number;
  hasNext: boolean;
  partial?: boolean;
  mode?: SearchMode;
  warnings?: SearchWarning[];
};
