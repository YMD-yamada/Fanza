import type { CatalogId } from "@/lib/catalogs";
import type { SourceId } from "@/lib/types";

export type SavedItemInput = {
  id: string;
  title: string;
  imageUrl?: string;
  actressNames: string[];
  catalog?: CatalogId;
  source?: SourceId;
};

export type SavedItem = SavedItemInput & {
  savedAt: number;
};

export type CollectionCapacity = {
  usedItems: number;
  maxItems: number;
  percent: number;
  usedBytes: number;
  maxBytes: number;
};

export const FAVORITES_LIMIT = 500;
export const FAVORITES_MAX_BYTES = 3 * 1024 * 1024;

const textEncoder = new TextEncoder();

function toSavedItem(value: unknown): SavedItem | null {
  if (!value || typeof value !== "object") return null;
  const maybe = value as Partial<SavedItem>;
  if (typeof maybe.id !== "string" || maybe.id.length === 0) return null;
  if (typeof maybe.title !== "string" || maybe.title.length === 0) return null;

  const actressNames = Array.isArray(maybe.actressNames)
    ? maybe.actressNames
        .filter((name): name is string => typeof name === "string")
        .slice(0, 20)
    : [];

  const catalog =
    maybe.catalog === "books" ||
    maybe.catalog === "pcgame" ||
    maybe.catalog === "video" ||
    maybe.catalog === "doujin" ||
    maybe.catalog === "mono"
      ? maybe.catalog
      : maybe.catalog === "game"
        ? "pcgame"
        : undefined;
  const source =
    maybe.source === "fanza" || maybe.source === "partner"
      ? maybe.source
      : undefined;

  return {
    id: maybe.id,
    title: maybe.title,
    imageUrl:
      typeof maybe.imageUrl === "string" && maybe.imageUrl.length > 0
        ? maybe.imageUrl
        : undefined,
    actressNames,
    catalog,
    source,
    savedAt: Number.isFinite(maybe.savedAt) ? Number(maybe.savedAt) : Date.now(),
  };
}

export function sanitizeSavedItems(input: unknown, limit = FAVORITES_LIMIT): SavedItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((value) => toSavedItem(value))
    .filter((value): value is SavedItem => Boolean(value))
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, limit);
}

export function parseSavedItems(payload: unknown): SavedItem[] | null {
  if (!payload || typeof payload !== "object") return null;
  const rawItems =
    (payload as { items?: unknown }).items ??
    (payload as { favorites?: unknown }).favorites;
  if (!Array.isArray(rawItems)) return null;
  return sanitizeSavedItems(rawItems, FAVORITES_LIMIT * 2);
}

function estimateItemSizeBytes(item: SavedItem): number {
  return textEncoder.encode(JSON.stringify(item)).length;
}

export function estimateFavoritesSizeBytes(items: SavedItem[]): number {
  return items.reduce((sum, item) => sum + estimateItemSizeBytes(item), 0);
}

export function clampFavorites(
  items: SavedItem[],
  maxItems = FAVORITES_LIMIT,
  maxBytes = FAVORITES_MAX_BYTES,
): SavedItem[] {
  const unique = new Map<string, SavedItem>();
  for (const item of items.sort((a, b) => b.savedAt - a.savedAt)) {
    const key = `${item.source ?? "fanza"}:${item.id}`;
    if (!unique.has(key)) unique.set(key, item);
  }

  const limited: SavedItem[] = [];
  let usedBytes = 0;
  for (const item of unique.values()) {
    if (limited.length >= maxItems) break;
    const itemBytes = estimateItemSizeBytes(item);
    if (usedBytes + itemBytes > maxBytes) break;
    limited.push(item);
    usedBytes += itemBytes;
  }
  return limited;
}