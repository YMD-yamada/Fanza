import { NextRequest, NextResponse } from "next/server";

import { getCatalog } from "@/lib/catalogs";
import { aggregateGetById } from "@/lib/search-aggregate";
import { isSourceId } from "@/lib/types";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const catalog = getCatalog(request.nextUrl.searchParams.get("cat")).id;
  const sourceQuery = request.nextUrl.searchParams.get("source");

  try {
    const item = await aggregateGetById({
      id,
      catalog,
      ...(isSourceId(sourceQuery) ? { source: sourceQuery } : {}),
    });

    if (!item) {
      return NextResponse.json({ message: "Item not found." }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
