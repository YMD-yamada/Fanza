import { NextRequest, NextResponse } from "next/server";

type ClickEventPayload = {
  itemId?: string;
  title?: string;
};

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ClickEventPayload;

  console.log("[affiliate-click]", {
    itemId: payload.itemId ?? "unknown",
    title: payload.title ?? "unknown",
    at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
