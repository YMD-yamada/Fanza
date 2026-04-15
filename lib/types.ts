export type ArticleType = "actress" | "author" | "genre" | "maker" | "series" | "label";

export type SearchFilters = {
  keyword: string;
  page: number;
  sort?: string;
  gteDate?: string;
  lteDate?: string;
  article?: ArticleType;
  articleId?: string;
};

export type NormalizedItem = {
  id: string;
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
};

export type SearchResponse = {
  items: NormalizedItem[];
  totalCount: number;
  page: number;
  hasNext: boolean;
};
