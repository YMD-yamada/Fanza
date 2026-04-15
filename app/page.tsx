import Link from "next/link";

import { ItemCard } from "@/components/ItemCard";
import { FavoritesSection, HistorySection } from "@/components/SavedSection";
import { SearchBar } from "@/components/SearchBar";
import { searchFanza } from "@/lib/fanza";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    gte_date?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Number(params.page ?? "1");
  const sort = params.sort ?? "rank";
  const gteDate = params.gte_date ?? "";

  const resolvedPage = Number.isNaN(page) || page < 1 ? 1 : page;
  const result = q
    ? await searchFanza({
        keyword: q,
        page: resolvedPage,
        sort,
        ...(gteDate ? { gteDate } : {}),
      })
    : null;

  const createPageHref = (nextPage: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("sort", sort);
    p.set("page", String(nextPage));
    if (gteDate) p.set("gte_date", gteDate);
    return `/?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Fanza 検索ナビ
        </h1>
        <p className="text-sm text-neutral-400">
          画像・サンプル動画・購入リンクを1画面で確認
        </p>
      </section>

      <SearchBar />

      {!q && (
        <>
          <FavoritesSection />
          <HistorySection />
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
            キーワードを入力するか、クイック検索から選んでください
          </section>
        </>
      )}

      {q && result && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3 text-sm">
            <span className="tabular-nums font-semibold text-white">
              {result.totalCount.toLocaleString()}
            </span>
            <span className="text-neutral-400">件ヒット</span>
            {gteDate && (
              <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs text-violet-300">
                {gteDate.slice(0, 10)}〜
              </span>
            )}
          </div>

          {result.items.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
              該当する作品が見つかりませんでした
            </div>
          ) : (
            <div className="grid gap-4">
              {result.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* pagination */}
          <nav className="flex items-center justify-center gap-1 pt-2">
            <Link
              href={createPageHref(Math.max(1, resolvedPage - 1))}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                resolvedPage <= 1
                  ? "pointer-events-none text-neutral-700"
                  : "text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              ← 前へ
            </Link>
            <span className="min-w-[3rem] rounded-lg bg-neutral-800 px-3 py-2 text-center text-sm tabular-nums font-medium">
              {result.page}
            </span>
            <Link
              href={createPageHref(resolvedPage + 1)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                result.hasNext
                  ? "text-neutral-300 hover:bg-neutral-800"
                  : "pointer-events-none text-neutral-700"
              }`}
            >
              次へ →
            </Link>
          </nav>
        </section>
      )}
    </div>
  );
}
