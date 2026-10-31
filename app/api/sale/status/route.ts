import { NextResponse } from "next/server";

import { scanSales } from "@/lib/sale/scan";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const debug = new URL(request.url).searchParams.get("debug") === "1";
  const result = await scanSales({ debug });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
  });
}
