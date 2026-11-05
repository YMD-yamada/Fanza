import { NextResponse } from "next/server";

import { sendToAll } from "@/lib/sale/push";
import { addSubscription, isValidSubscription, readSaleState, removeSubscription } from "@/lib/sale/store";

export const dynamic = "force-dynamic";

// 1つの端末につき1分に2回まで
const hits = new Map<string, number[]>();
function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 2;
}

/** この端末にだけテスト通知を送る。登録が無ければ登録し直す */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { subscription?: unknown } | null;
  const sub = body?.subscription;
  if (!isValidSubscription(sub)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (limited(sub.endpoint)) return NextResponse.json({ error: "too-many" }, { status: 429 });

  const state = await readSaleState();
  if (!state.subscriptions.some((s) => s.endpoint === sub.endpoint)) {
    await addSubscription(sub);
  }
  const result = await sendToAll([{ ...sub, createdAt: new Date().toISOString() }], {
    title: "10円ベル",
    body: "テスト通知です。これが見えていれば、10円の作品が出たときも届きます。",
    url: "/sale",
    tag: "sale-test",
  });
  if (result.gone.length) {
    await removeSubscription(sub.endpoint);
    return NextResponse.json({ error: "gone" }, { status: 410 });
  }
  if (result.sent === 0) return NextResponse.json({ error: "send-failed" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
