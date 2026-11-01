import { NextResponse } from "next/server";

import { sendToAll } from "@/lib/sale/push";
import { scanSales } from "@/lib/sale/scan";
import { readSaleState, writeSaleState } from "@/lib/sale/store";
import { summarizeScan } from "@/lib/sale/summary";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 見かけなくなってからこの日数たった作品は、また10円になったら通知し直す */
const FORGET_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

/** 合言葉なしで呼ばれたときは、前回から この時間 たっていなければ何もしない */
const PUBLIC_MIN_INTERVAL_MS = 2 * 60 * 60 * 1000;
let lastRunInInstance = 0;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * 定期チェック（Vercel Cron が1日数回呼ぶ）。
 * 新しく10円になった作品があれば、登録している全員へまとめて1通だけ通知する。
 */
export async function GET(request: Request) {
  // CRON_SECRET を設定すれば Vercel Cron は合言葉つきで呼ぶ。未設定でも動くよう、
  // 合言葉なしの呼び出しは「2時間に1回まで」に絞って受ける（何度呼ばれても通知は増えない）。
  const isAuthorized = authorized(request);
  const isTest = new URL(request.url).searchParams.get("test") === "1";
  if (isTest && !isAuthorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAuthorized) {
    if (Date.now() - lastRunInInstance < 10 * 60 * 1000) {
      return NextResponse.json({ skipped: "too-soon" }, { status: 429 });
    }
    lastRunInInstance = Date.now();
  }

  const state = await readSaleState();
  const now = new Date();
  const nowIso = now.toISOString();

  if (!isAuthorized && state.lastCheckAt && now.getTime() - new Date(state.lastCheckAt).getTime() < PUBLIC_MIN_INTERVAL_MS) {
    return NextResponse.json({ skipped: "checked-recently", lastCheckAt: state.lastCheckAt });
  }

  if (isTest) {
    const result = await sendToAll(state.subscriptions, {
      title: "10円ベル",
      body: "テスト通知です。10円の作品が出たら、このように届きます。",
      url: "/sale",
      tag: "sale-test",
    }, state);
    if (result.gone.length) {
      state.subscriptions = state.subscriptions.filter((s) => !result.gone.includes(s.endpoint));
      await writeSaleState(state);
    }
    return NextResponse.json({ test: true, subscribers: state.subscriptions.length, ...result, gone: result.gone.length });
  }

  const scan = await scanSales();
  const failedFloors = new Set(scan.floors.filter((f) => !f.ok).map((f) => f.floorId));
  const current = scan.floors.flatMap((f) => f.items);
  const newItems = current.filter((item) => !state.notified[item.id]);

  for (const item of current) state.notified[item.id] = nowIso;
  for (const [id, seenAt] of Object.entries(state.notified)) {
    const floorId = id.split(":")[0];
    if (failedFloors.has(floorId)) continue;
    if (now.getTime() - new Date(seenAt).getTime() > FORGET_AFTER_MS) delete state.notified[id];
  }
  state.lastCheckAt = nowIso;

  let push: { sent: number; gone: number; failed: number } | null = null;
  if (newItems.length > 0 && state.subscriptions.length > 0) {
    const summary = summarizeScan(scan);
    const result = await sendToAll(state.subscriptions, {
      title: "10円ベル",
      body: `いま10円: ${summary}`,
      url: "/sale",
      tag: "sale-found",
    }, state);
    state.subscriptions = state.subscriptions.filter((s) => !result.gone.includes(s.endpoint));
    state.lastNotifyAt = nowIso;
    push = { sent: result.sent, gone: result.gone.length, failed: result.failed };
  }

  await writeSaleState(state);

  return NextResponse.json({
    scannedAt: scan.scannedAt,
    total: scan.total,
    newItems: newItems.length,
    failedFloors: [...failedFloors],
    subscribers: state.subscriptions.length,
    push,
  });
}
