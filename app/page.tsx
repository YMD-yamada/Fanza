import Link from "next/link";
import { cookies } from "next/headers";

import { AccountPanel } from "@/components/AccountPanel";
import { ItemCard } from "@/components/ItemCard";
import { FavoritesSection, HistorySection } from "@/components/SavedSection";
import { SearchBar } from "@/components/SearchBar";
import { searchFanza } from "@/lib/fanza";
import { PRIVATE_MODE_COOKIE_NAME } from "@/lib/privateMode";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    gte_date?: string;
    price_min?: string;
    price_max?: string;
    has_video?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const cookieStore = await cookies();
  const privateMode = cookieStore.get(PRIVATE_MODE_COOKIE_NAME)?.value === "1";
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Number(params.page ?? "1");
  const sort = params.sort ?? "rank";
  const gteDate = params.gte_date ?? "";
  const pMin = Number(params.price_min ?? "") || 0;
  const pMax = Number(params.price_max ?? "") || 0;
  const hasVideo = params.has_video === "1";

  const resolvedPage = Number.isNaN(page) || page < 1 ? 1 : page;

  /* --- API call (only when query exists) --- */
  const raw = q
    ? await searchFanza({
        keyword: q,
        page: resolvedPage,
        sort,
        ...(gteDate ? { gteDate } : {}),
      })
    : null;

  /* --- Client-side filters --- */
  const result = raw
    ? {
        ...raw,
        items: raw.items.filter((item) => {
          if (hasVideo && !item.sampleVideoUrl) return false;
          if (pMax > 0 && (item.priceMin == null || item.priceMin > pMax)) return false;
          if (pMin > 0 && (item.priceMin == null || item.priceMin < pMin)) return false;
          return true;
        }),
      }
    : null;

  /* --- Pagination URL builder (preserves all params) --- */
  const createPageHref = (nextPage: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("sort", sort);
    p.set("page", String(nextPage));
    if (gteDate) p.set("gte_date", gteDate);
    if (params.price_min) p.set("price_min", params.price_min);
    if (params.price_max) p.set("price_max", params.price_max);
    if (hasVideo) p.set("has_video", "1");
    return `/?${p.toString()}`;
  };

  /* --- Active filter badges --- */
  const badges: { label: string; cls: string }[] = [];
  if (gteDate) badges.push({ label: `${gteDate.slice(0, 10)}〜`, cls: "bg-violet-500/15 text-violet-300" });
  if (pMin > 0 || pMax > 0) {
    const label = pMin > 0 && pMax > 0 ? `${pMin}〜${pMax}円` : pMax > 0 ? `〜${pMax}円` : `${pMin}円〜`;
    badges.push({ label, cls: "bg-emerald-500/15 text-emerald-300" });
  }
  if (hasVideo) badges.push({ label: "動画あり", cls: "bg-amber-500/15 text-amber-300" });
  const returnToParams = new URLSearchParams();
  if (q) returnToParams.set("q", q);
  returnToParams.set("sort", sort);
  returnToParams.set("page", String(resolvedPage));
  if (gteDate) returnToParams.set("gte_date", gteDate);
  if (params.price_min) returnToParams.set("price_min", params.price_min);
  if (params.price_max) returnToParams.set("price_max", params.price_max);
  if (hasVideo) returnToParams.set("has_video", "1");
  const returnTo = `/?${returnToParams.toString()}`;

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

      <AccountPanel />
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
          <div className="flex flex-wrap items-baseline gap-2 text-sm">
            <span className="tabular-nums font-semibold text-white">
              {result.totalCount.toLocaleString()}
            </span>
            <span className="text-neutral-400">
              件中 {result.items.length} 件表示
            </span>
            {badges.map((b) => (
              <span
                key={b.label}
                className={`rounded-full px-2.5 py-0.5 text-xs ${b.cls}`}
              >
                {b.label}
              </span>
            ))}
          </div>

          {result.items.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
              該当する作品が見つかりませんでした
            </div>
          ) : (
            <div className="grid gap-4">
              {result.items.map((item) => (
                <ItemCard key={item.id} item={item} returnTo={returnTo} privateMode={privateMode} />
              ))}
            </div>
          )}

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
