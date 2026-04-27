/**
 * FANZA アフィリエイト ItemList の site / service / floor。
 * FloorList API で現行値を確認できます: https://affiliate.dmm.com/api/v3/floorlist.html
 */
export type CatalogId = "video" | "doujin" | "game";

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
  video: {
    id: "video",
    label: "Fanza 動画",
    shortLabel: "動画",
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
  game: {
    id: "game",
    label: "PCゲーム",
    shortLabel: "ゲーム",
    site: "FANZA",
    service: "pcgame",
    floor: "digital_pcgame",
    supportsSampleVideo: false,
  },
};

const IDS = new Set<CatalogId>(["video", "doujin", "game"]);

export function isCatalogId(value: string): value is CatalogId {
  return IDS.has(value as CatalogId);
}

export function getCatalog(id: string | undefined | null): CatalogSpec {
  if (id && isCatalogId(id)) return CATALOGS[id];
  return CATALOGS.video;
}
