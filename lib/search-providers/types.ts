import type { CatalogId } from "@/lib/catalogs";
import type { ArticleType, NormalizedItem, SearchFilters, SourceId } from "@/lib/types";

export type ProviderSearchFilters = Omit<SearchFilters, "source"> & {
  source?: SourceId;
};

export type ProviderContext = {
  timeoutMs: number;
};

export type ProviderSearchResult = {
  source: SourceId;
  items: NormalizedItem[];
  totalCount: number;
  page: number;
  hasNext: boolean;
};

export type ItemLookup = {
  id: string;
  catalog?: CatalogId;
  source?: SourceId;
};

export interface SearchProvider {
  readonly id: SourceId;
  readonly label: string;
  isEnabled(): boolean;
  search(filters: ProviderSearchFilters, ctx: ProviderContext): Promise<ProviderSearchResult>;
  getById(lookup: ItemLookup, ctx: ProviderContext): Promise<NormalizedItem | null>;
}

export type SearchRequestInput = {
  keyword: string;
  page: number;
  catalog?: CatalogId;
  sort?: string;
  gteDate?: string;
  lteDate?: string;
  article?: ArticleType;
  articleId?: string;
  source?: SourceId;
};
