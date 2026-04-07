import { NextRequest, NextResponse } from "next/server";

import { searchFanza } from "@/lib/fanza";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const sort = searchParams.get("sort") ?? "rank";

  if (!keyword.trim()) {
    return NextResponse.json(
      { message: "q parameter is required." },
      { status: 400 },
    );
  }

  try {
    const data = await searchFanza({
      keyword,
      page: Number.isNaN(page) || page < 1 ? 1 : page,
      sort,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
