import { NextResponse } from "next/server";

import { getVapidKeys, sendToAll } from "@/lib/sale/push";
import { addSubscription, isValidSubscription, removeSubscription } from "@/lib/sale/store";

export const dynamic = "force-dynamic";

// 同じインスタンスへの連打を止める簡易制限（Blob の無料枠を守る）
const hits = new Map<string, number[]>();
function limited(request: Request, max = 5): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}

/** 通知の登録に使う公開鍵（秘密ではない） */
export async function GET(request: Request) {
  if (limited(request, 10)) return NextResponse.json({ error: "too-many" }, { status: 429 });
  const { publicKey } = await getVapidKeys();
  return NextResponse.json({ publicKey }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (limited(request)) return NextResponse.json({ error: "too-many" }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { subscription?: unknown } | null;
  const sub = body?.subscription;
  if (!isValidSubscription(sub)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await addSubscription(sub);
  // 登録できたことが分かるよう、その端末にだけ1通送る
  await sendToAll([{ ...sub, createdAt: new Date().toISOString() }], {
    title: "10円ベル",
    body: "通知をオンにしました。10円の作品が出たらお知らせします。",
    url: "/sale",
    tag: "sale-welcome",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (limited(request)) return NextResponse.json({ error: "too-many" }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  await removeSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
