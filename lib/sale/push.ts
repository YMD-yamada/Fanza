import webpush from "web-push";

import { readSaleState, writeSaleState, type SaleState, type StoredSubscription } from "@/lib/sale/store";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

type VapidKeys = { publicKey: string; privateKey: string };

let cachedKeys: VapidKeys | null = null;

/**
 * 通知用の鍵を用意する。
 * 1) 環境変数 SALE_VAPID_PUBLIC_KEY / SALE_VAPID_PRIVATE_KEY があればそれを使う
 * 2) 無ければ非公開 Blob の状態ファイルにある鍵を使う
 * 3) それも無ければ初回に作って保存する（人が鍵を作って貼る作業を無くすため）
 */
export async function getVapidKeys(state?: SaleState): Promise<VapidKeys> {
  if (cachedKeys) return cachedKeys;
  const envPublic = process.env.SALE_VAPID_PUBLIC_KEY ?? "";
  const envPrivate = process.env.SALE_VAPID_PRIVATE_KEY ?? "";
  if (envPublic && envPrivate) {
    cachedKeys = { publicKey: envPublic, privateKey: envPrivate };
    return cachedKeys;
  }
  const current = state ?? (await readSaleState());
  if (!current.vapid) {
    current.vapid = webpush.generateVAPIDKeys();
    await writeSaleState(current);
    // 同時に作られた場合に備え、保存されたほうを使う
    const saved = await readSaleState();
    if (saved.vapid) current.vapid = saved.vapid;
  }
  cachedKeys = current.vapid;
  return cachedKeys;
}

/** 送れなかった（期限切れ・解除済み）通知先の endpoint を返す */
export async function sendToAll(
  subscriptions: StoredSubscription[],
  payload: PushPayload,
  state?: SaleState,
): Promise<{ sent: number; gone: string[]; failed: number }> {
  if (subscriptions.length === 0) return { sent: 0, gone: [], failed: 0 };
  const keys = await getVapidKeys(state);
  const options = {
    TTL: 60 * 60 * 12,
    urgency: "normal" as const,
    vapidDetails: {
      subject: process.env.SALE_VAPID_SUBJECT ?? "https://ko-fi.com/ymdapps",
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    },
  };
  const body = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  // 10件ずつ順番に送る
  for (let i = 0; i < subscriptions.length; i += 10) {
    const batch = subscriptions.slice(i, i + 10);
    const results = await Promise.allSettled(batch.map((sub) => webpush.sendNotification(sub, body, options)));
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        sent += 1;
        return;
      }
      const status = (r.reason as { statusCode?: number } | undefined)?.statusCode;
      if (status === 404 || status === 410) gone.push(batch[idx].endpoint);
      else failed += 1;
    });
  }
  return { sent, gone, failed };
}
