/**
 * FANZA アフィリエイト ItemList の site / service / floor。
 * 参照: https://affiliate.dmm.com/api/v3/floorlist.html
 */
export type CatalogId = "books" | "pcgame" | "video" | "doujin" | "mono";

export type CatalogSpec = {
  id: CatalogId;
  label: string;
  shortLabel: string;
  site: string;
  service: string;
  floor: string;
  /** サンプル動画フィルタ・動画向けクイック検索を使う */
  supportsSampleVideo: boolean;
};

export const CATALOGS: Record<CatalogId, CatalogSpec> = {
  books: {
    id: "books",
    label: "FANZAブックス",
    shortLabel: "FANZAブックス",
    site: "FANZA",
    service: "ebook",
    floor: "comic",
    supportsSampleVideo: false,
  },
  pcgame: {
    id: "pcgame",
    label: "アダルトPCゲーム",
    shortLabel: "アダルトPCゲーム",
    site: "FANZA",
    service: "pcgame",
    floor: "digital_pcgame",
    supportsSampleVideo: false,
  },
  video: {
    id: "video",
    label: "動画（アダルト）",
    shortLabel: "動画（アダルト）",
    site: "FANZA",
    service: "digital",
    floor: "videoa",
    supportsSampleVideo: true,
  },
  doujin: {
    id: "doujin",
    label: "同人",
    shortLabel: "同人",
    site: "FANZA",
    service: "doujin",
    floor: "digital_doujin",
    supportsSampleVideo: false,
  },
  mono: {
    id: "mono",
    label: "通販（アダルト）",
    shortLabel: "通販（アダルト）",
    site: "FANZA",
    service: "mono",
    floor: "dvd",
    supportsSampleVideo: false,
  },
};

const IDS = new Set<CatalogId>(["books", "pcgame", "video", "doujin", "mono"]);

export function isCatalogId(value: string): value is CatalogId {
  return IDS.has(value as CatalogId);
}

export function getCatalog(id: string | undefined | null): CatalogSpec {
  // Backward compatibility for old query values.
  if (id === "game") return CATALOGS.pcgame;
  if (id && isCatalogId(id)) return CATALOGS[id];
  return CATALOGS.video;
}
