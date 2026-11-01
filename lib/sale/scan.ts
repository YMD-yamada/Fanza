import { buildAffiliateUrl, getAffiliateId } from "@/lib/affiliate";

/**
 * FANZA の「10円セール」を DMM アフィリエイト API（ItemList）だけで見つける。
 * 各フロアを「安い順」で1回ずつ取得し、10円以下（0円は除く）の作品を拾う。
 * 1回のスキャンで API を叩くのは SALE_FLOORS の数だけ（6回）。
 */

const API_ENDPOINT = "https://api.dmm.com/affiliate/v3/ItemList";

export type SaleFloor = {
  id: string;
  label: string;
  service: string;
  floor: string;
  /**
   * price: 10円以下の作品を全部拾う
   * campaign: キャンペーン名に「10円」が入っている作品だけ拾う
   *   （同人は新作の「95%OFF・5円」が毎日大量にあり、価格だけだと通知が鳴りっぱなしになるため）
   */
  mode: "price" | "campaign";
};

export const SALE_FLOORS: SaleFloor[] = [
  { id: "video", label: "動画", service: "digital", floor: "videoa", mode: "price" },
  { id: "amateur", label: "素人動画", service: "digital", floor: "videoc", mode: "price" },
  { id: "anime", label: "アニメ", service: "digital", floor: "anime", mode: "price" },
  { id: "books", label: "コミック", service: "ebook", floor: "comic", mode: "price" },
  { id: "pcgame", label: "PCゲーム", service: "pcgame", floor: "digital_pcgame", mode: "price" },
  { id: "doujin", label: "同人", service: "doujin", floor: "digital_doujin", mode: "campaign" },
];

export const SALE_MAX_PRICE = 10;

export type SaleItem = {
  id: string;
  floorId: string;
  title: string;
  price: number;
  listPrice?: number;
  imageUrl?: string;
  url: string;
  campaignTitle?: string;
  campaignEnd?: string;
};

export type FloorResult = {
  floorId: string;
  label: string;
  ok: boolean;
  error?: string;
  items: SaleItem[];
  /** 調査用: 安い順の先頭数件の価格 */
  cheapest?: { price?: number; raw?: unknown; campaign?: unknown }[];
};

export type ScanResult = {
  scannedAt: string;
  floors: FloorResult[];
  total: number;
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseInt(value.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const TEN_YEN_RE = /10\s*円/;

function firstCampaign(raw: Record<string, unknown>): { title?: string; end?: string } {
  const c = raw.campaign;
  const list = Array.isArray(c) ? c : c && typeof c === "object" ? [c] : [];
  const hit = (list as Record<string, unknown>[]).find((x) => TEN_YEN_RE.test(String(x?.title ?? "")))
    ?? (list as Record<string, unknown>[])[0];
  if (!hit) return {};
  return { title: str(hit.title), end: str(hit.date_end) };
}

function toSaleItem(raw: Record<string, unknown>, floor: SaleFloor): SaleItem | null {
  const floorId = floor.id;
  const prices = (raw.prices as Record<string, unknown> | undefined) ?? {};
  const price = toNumber(prices.price);
  if (price === undefined || price <= 0 || price > SALE_MAX_PRICE) return null;
  const campaign = firstCampaign(raw);
  if (floor.mode === "campaign" && !TEN_YEN_RE.test(campaign.title ?? "")) return null;
  const image = (raw.imageURL as Record<string, unknown> | undefined) ?? {};
  const productUrl = str(raw.URL);
  return {
    id: `${floorId}:${str(raw.content_id) ?? str(raw.product_id) ?? str(raw.title) ?? "unknown"}`,
    floorId,
    title: str(raw.title) ?? "タイトル不明",
    price,
    listPrice: toNumber(prices.list_price),
    imageUrl: str(image.small) ?? str(image.list),
    url: str(raw.affiliateURL) ?? buildAffiliateUrl(productUrl),
    campaignTitle: campaign.title,
    campaignEnd: campaign.end,
  };
}

async function scanFloor(floor: SaleFloor, debug: boolean): Promise<FloorResult> {
  const apiId = process.env.DMM_API_ID ?? "";
  const affiliateId = getAffiliateId();
  if (!apiId || !affiliateId) {
    return { floorId: floor.id, label: floor.label, ok: false, error: "api-not-configured", items: [] };
  }
  const params = new URLSearchParams({
    api_id: apiId,
    affiliate_id: affiliateId,
    site: "FANZA",
    service: floor.service,
    floor: floor.floor,
    sort: "-price",
    hits: "100",
    offset: "1",
    output: "json",
  });
  try {
    const res = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
      // 同じ時間帯の再取得は Vercel のデータキャッシュから返す（API への負荷を抑える）
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { floorId: floor.id, label: floor.label, ok: false, error: `http-${res.status}`, items: [] };
    }
    const json = (await res.json()) as { result?: { items?: Record<string, unknown>[] } };
    const raws = json.result?.items ?? [];
    const items = raws
      .map((raw) => toSaleItem(raw, floor))
      .filter((x): x is SaleItem => x !== null);
    const result: FloorResult = { floorId: floor.id, label: floor.label, ok: true, items };
    if (debug) {
      result.cheapest = raws.slice(0, 5).map((raw) => ({
        price: toNumber((raw.prices as Record<string, unknown> | undefined)?.price),
        raw: raw.prices,
        campaign: raw.campaign,
      }));
    }
    return result;
  } catch (error) {
    return {
      floorId: floor.id,
      label: floor.label,
      ok: false,
      error: error instanceof Error ? error.name : "fetch-failed",
      items: [],
    };
  }
}

export async function scanSales(options?: { debug?: boolean }): Promise<ScanResult> {
  const floors: FloorResult[] = [];
  // 同時に投げず1本ずつ（API への配慮）
  for (const floor of SALE_FLOORS) {
    floors.push(await scanFloor(floor, Boolean(options?.debug)));
  }
  return {
    scannedAt: new Date().toISOString(),
    floors,
    total: floors.reduce((sum, f) => sum + f.items.length, 0),
  };
}
