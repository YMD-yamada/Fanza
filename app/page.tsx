import Link from "next/link";

import { ItemCard } from "@/components/ItemCard";
import { SearchBar } from "@/components/SearchBar";
import { searchFanza } from "@/lib/fanza";
import type { ArticleType } from "@/lib/types";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    gte_date?: string;
    lte_date?: string;
    article?: string;
    article_id?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Number(params.page ?? "1");
  const sort = params.sort ?? "rank";
  const gteDate = params.gte_date ?? "";
  const lteDate = params.lte_date ?? "";
  const article = (params.article ?? "") as ArticleType | "";
  const articleId = params.article_id ?? "";

  const resolvedPage = Number.isNaN(page) || page < 1 ? 1 : page;
  const result = q
    ? await searchFanza({
        keyword: q,
        page: resolvedPage,
        sort,
        ...(gteDate ? { gteDate } : {}),
        ...(lteDate ? { lteDate } : {}),
        ...(article && articleId ? { article: article as ArticleType, articleId } : {}),
      })
    : null;

  const createPageHref = (nextPage: number) => {
    const nextParams = new URLSearchParams();
    if (q) nextParams.set("q", q);
    nextParams.set("sort", sort);
    nextParams.set("page", String(nextPage));
    if (gteDate) nextParams.set("gte_date", gteDate);
    if (lteDate) nextParams.set("lte_date", lteDate);
    if (article && articleId) {
      nextParams.set("article", article);
      nextParams.set("article_id", articleId);
    }
    return `/?${nextParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Fanza検索を最短で</h1>
        <p className="text-sm text-neutral-300">
          画像・サンプル動画・購入導線を1画面で確認できます。
        </p>
      </section>
      <SearchBar />

      {!q && (
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-sm text-neutral-300">
          検索キーワードを入力して作品を探してください。例: 女優名、シリーズ名、ジャンル
        </section>
      )}

      {q && result && (
        <section className="space-y-4">
          <div className="text-sm text-neutral-300">
            <span className="font-semibold text-white">{result.totalCount}</span> 件ヒット
            / ページ {result.page}
          </div>
          {(gteDate || lteDate || article) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {gteDate && (
                <span className="rounded-full bg-sky-900/50 px-2 py-1 text-sky-300">
                  {gteDate.slice(0, 10)}〜
                </span>
              )}
              {lteDate && (
                <span className="rounded-full bg-sky-900/50 px-2 py-1 text-sky-300">
                  〜{lteDate.slice(0, 10)}
                </span>
              )}
              {article && articleId && (
                <span className="rounded-full bg-purple-900/50 px-2 py-1 text-purple-300">
                  {article}: {articleId}
                </span>
              )}
            </div>
          )}
          {result.items.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-sm text-neutral-300">
              該当作品がありません。キーワードを変えて再検索してください。
            </div>
          ) : (
            <div className="grid gap-4">
              {result.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link
              href={createPageHref(Math.max(1, resolvedPage - 1))}
              className={`rounded-md border px-3 py-2 text-sm ${
                resolvedPage <= 1
                  ? "pointer-events-none border-neutral-800 text-neutral-600"
                  : "border-neutral-700 hover:bg-neutral-800"
              }`}
            >
              前へ
            </Link>
            <Link
              href={createPageHref(resolvedPage + 1)}
              className={`rounded-md border px-3 py-2 text-sm ${
                result.hasNext
                  ? "border-neutral-700 hover:bg-neutral-800"
                  : "pointer-events-none border-neutral-800 text-neutral-600"
              }`}
            >
              次へ
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
