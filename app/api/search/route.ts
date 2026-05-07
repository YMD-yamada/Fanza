import { NextRequest, NextResponse } from "next/server";

import { getCatalog } from "@/lib/catalogs";
import { aggregateSearch } from "@/lib/search-aggregate";
import { isSourceId, type ArticleType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const sort = searchParams.get("sort") ?? "rank";
  const gteDate = searchParams.get("gte_date") ?? "";
  const lteDate = searchParams.get("lte_date") ?? "";
  const article = (searchParams.get("article") ?? "") as ArticleType | "";
  const articleId = searchParams.get("article_id") ?? "";
  const catalog = getCatalog(searchParams.get("cat")).id;
  const source = searchParams.get("source");

  if (!keyword.trim()) {
    return NextResponse.json(
      { message: "q parameter is required." },
      { status: 400 },
    );
  }

  try {
    const data = await aggregateSearch({
      keyword,
      page: Number.isNaN(page) || page < 1 ? 1 : page,
      catalog,
      ...(isSourceId(source) ? { source } : {}),
      sort,
      ...(gteDate ? { gteDate } : {}),
      ...(lteDate ? { lteDate } : {}),
      ...(article && articleId ? { article: article as ArticleType, articleId } : {}),
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
