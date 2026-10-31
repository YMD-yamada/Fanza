import { promises as fs } from "fs";
import path from "path";

import { get, put } from "@vercel/blob";

/**
 * 10円ベルの保存先。中身は1つの JSON だけ（通知先の一覧と、通知済みの作品ID）。
 * Vercel では Blob（BLOB_READ_WRITE_TOKEN があるとき）、手元ではファイル。
 * Blob の無料枠を食わないよう、読むのは「登録・解除」と「定期チェック」のときだけ。
 */

export type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
};

export type SaleState = {
  subscriptions: StoredSubscription[];
  /** 作品ID → 最後に見かけた日時（ISO） */
  notified: Record<string, string>;
  lastCheckAt?: string;
  lastNotifyAt?: string;
  /** 通知用の鍵。環境変数が無いとき、アプリが初回に自分で作って非公開 Blob に保存する */
  vapid?: { publicKey: string; privateKey: string };
};

const BLOB_PATH = "sale-watch/state.json";
const DATA_FILE = path.join(process.env.FANZA_APP_DATA_DIR ?? path.join(process.cwd(), ".data"), "sale-watch.json");
const MAX_SUBSCRIPTIONS = 5000;

function emptyState(): SaleState {
  return { subscriptions: [], notified: {} };
}

function normalize(raw: Partial<SaleState> | null | undefined): SaleState {
  return {
    subscriptions: Array.isArray(raw?.subscriptions) ? raw.subscriptions : [],
    notified: raw?.notified && typeof raw.notified === "object" ? raw.notified : {},
    lastCheckAt: raw?.lastCheckAt,
    lastNotifyAt: raw?.lastNotifyAt,
    vapid:
      typeof raw?.vapid?.publicKey === "string" && typeof raw?.vapid?.privateKey === "string" ? raw.vapid : undefined,
  };
}

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readSaleState(): Promise<SaleState> {
  try {
    if (blobEnabled()) {
      const result = await get(BLOB_PATH, { access: "private", useCache: false });
      if (!result) return emptyState();
      const text = await new Response(result.stream).text();
      return text.trim() ? normalize(JSON.parse(text)) : emptyState();
    }
    const text = await fs.readFile(DATA_FILE, "utf-8");
    return normalize(JSON.parse(text));
  } catch {
    return emptyState();
  }
}

export async function writeSaleState(state: SaleState): Promise<void> {
  const body = JSON.stringify(state);
  if (blobEnabled()) {
    await put(BLOB_PATH, body, {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, body, "utf-8");
}

export function isValidSubscription(value: unknown): value is Omit<StoredSubscription, "createdAt"> {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const keys = v.keys as Record<string, unknown> | undefined;
  return (
    typeof v.endpoint === "string" &&
    v.endpoint.startsWith("https://") &&
    v.endpoint.length < 1000 &&
    typeof keys?.p256dh === "string" &&
    typeof keys?.auth === "string" &&
    keys.p256dh.length < 200 &&
    keys.auth.length < 100
  );
}

export async function addSubscription(sub: Omit<StoredSubscription, "createdAt">): Promise<void> {
  const state = await readSaleState();
  if (state.subscriptions.some((s) => s.endpoint === sub.endpoint)) return;
  state.subscriptions.push({
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    createdAt: new Date().toISOString(),
  });
  if (state.subscriptions.length > MAX_SUBSCRIPTIONS) {
    state.subscriptions = state.subscriptions.slice(-MAX_SUBSCRIPTIONS);
  }
  await writeSaleState(state);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const state = await readSaleState();
  const next = state.subscriptions.filter((s) => s.endpoint !== endpoint);
  if (next.length === state.subscriptions.length) return;
  state.subscriptions = next;
  await writeSaleState(state);
}
