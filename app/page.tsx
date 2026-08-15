import type { Metadata } from "next";

import { BrowseRail } from "@/components/BrowseRail";
import { CatalogTabs } from "@/components/CatalogTabs";
import { RecentQueriesBar } from "@/components/RecentQueriesBar";
import { FavoritesSection, HistorySection } from "@/components/SavedSection";
import { SearchBar } from "@/components/SearchBar";
import { SearchResultsInfinite } from "@/components/SearchResultsInfinite";
import { browsePath, parseBrowseView, sortForBrowse } from "@/lib/browse";
import { getCatalog } from "@/lib/catalogs";
import {
  BADGE_HAS_SAMPLE_VIDEO_LABEL,
  HOME_EMPTY_PROMPT,
  HOME_HEADING_DESCRIPTION,
  HOME_HEADING_TITLE,
  HOME_NO_RESULTS_HINT,
  HOME_NO_RESULTS_MESSAGE,
  badgePriceRangeJa,
  badgeReleaseDateJa,
} from "@/lib/home-copy";
import { filterNormalizedItems } from "@/lib/item-filters";
import { aggregateSearch } from "@/lib/search-aggregate";
import { homeMetadata } from "@/lib/seo";
import type { SearchResponse } from "@/lib/types";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    gte_date?: string;
    price_min?: string;
    price_max?: string;
    has_video?: string;
    cat?: string;
    debug?: string;
    view?: string;
  }>;
};

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  return homeMetadata({
    q: params.q,
    cat: params.cat,
    view: params.view,
  });
}

async function safeSearch(input: Parameters<typeof aggregateSearch>[0]): Promise<SearchResponse | null> {
  try {
    return await aggregateSearch(input);
  } catch {
    return null;
  }
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const view = parseBrowseView(params.view);
  const sort = q ? (params.sort ?? "rank") : view ? sortForBrowse(view) : (params.sort ?? "rank");
  const gteDate = params.gte_date ?? "";
  const pMin = Number(params.price_min ?? "") || 0;
  const pMax = Number(params.price_max ?? "") || 0;
  const hasVideo = params.has_video === "1";
  const catalog = getCatalog(params.cat).id;
  const debug = params.debug === "1";
  const buildVersion = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);
  const showBrowseList = Boolean(q || view);

  const raw = showBrowseList
    ? await safeSearch({
        keyword: q,
        page: 1,
        catalog,
        sort,
        ...(gteDate ? { gteDate } : {}),
      })
    : null;

  const rankRail = !showBrowseList
    ? await safeSearch({ keyword: "", page: 1, catalog, sort: "rank" })
    : null;
  const newRail = !showBrowseList
    ? await safeSearch({ keyword: "", page: 1, catalog, sort: "-date" })
    : null;

  const clientFilters = {
    priceMin: pMin,
    priceMax: pMax,
    hasVideo,
  };

  const filteredItems = raw != null ? filterNormalizedItems(raw.items, clientFilters) : [];

  const badges: { label: string; cls: string }[] = [];
  if (gteDate) badges.push({ label: badgeReleaseDateJa(gteDate.slice(0, 10)), cls: "bg-violet-500/15 text-violet-300" });
  if (pMin > 0 || pMax > 0) {
    badges.push({ label: badgePriceRangeJa(pMin, pMax), cls: "bg-emerald-500/15 text-emerald-300" });
  }
  if (hasVideo) badges.push({ label: BADGE_HAS_SAMPLE_VIDEO_LABEL, cls: "bg-amber-500/15 text-amber-300" });

  const tabParams = {
    q,
    sort,
    gte_date: gteDate,
    price_min: params.price_min,
    price_max: params.price_max,
    has_video: hasVideo ? "1" : undefined,
  };

  const infiniteKey = `${catalog}|${q}|${sort}|${view ?? ""}|${gteDate}|${pMin}|${pMax}|${hasVideo ? "1" : "0"}`;
  const listHeading = q
    ? null
    : view === "new"
      ? "新着"
      : view === "rank"
        ? "人気"
        : null;

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{HOME_HEADING_TITLE}</h1>
        <p className="text-sm text-neutral-400">{HOME_HEADING_DESCRIPTION}</p>
        {debug && (
          <p className="text-xs text-neutral-600">build: {buildVersion}</p>
        )}
      </section>

      <CatalogTabs active={catalog} tabParams={tabParams} />
      <SearchBar key={`searchbar-${catalog}`} />

      {!q && !view && <RecentQueriesBar />}

      {!showBrowseList && (
        <>
          <BrowseRail
            title="人気"
            href={browsePath(catalog, "rank")}
            items={rankRail?.items ?? []}
            catalog={catalog}
          />
          <BrowseRail
            title="新着"
            href={browsePath(catalog, "new")}
            items={newRail?.items ?? []}
            catalog={catalog}
          />
          <FavoritesSection />
          <HistorySection />
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
            {HOME_EMPTY_PROMPT}
          </section>
        </>
      )}

      {showBrowseList && raw && (
        <section className="space-y-4">
          {listHeading ? <h2 className="text-lg font-semibold">{listHeading}</h2> : null}
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.label} className={`rounded-full px-2.5 py-0.5 text-xs ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>

          {filteredItems.length === 0 && !raw.hasNext ? (
            <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
              <p>{HOME_NO_RESULTS_MESSAGE}</p>
              <p className="text-xs text-neutral-500">{HOME_NO_RESULTS_HINT}</p>
            </div>
          ) : (
            <SearchResultsInfinite
              key={infiniteKey}
              catalog={catalog}
              query={q}
              sort={sort}
              gteDate={gteDate}
              priceMin={pMin}
              priceMax={pMax}
              hasVideo={hasVideo}
              initialItems={filteredItems}
              totalCount={raw.totalCount}
              hasNext={raw.hasNext}
              mode={raw.mode}
              warnings={raw.warnings}
            />
          )}
        </section>
      )}
    </div>
  );
}
