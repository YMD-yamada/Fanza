import { NextResponse } from "next/server";

import { scanSales } from "@/lib/sale/scan";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await scanSales();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
  });
}
