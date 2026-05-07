import { AccountPanel } from "@/components/AccountPanel";
import { CatalogTabs } from "@/components/CatalogTabs";
import { FavoritesSection, HistorySection } from "@/components/SavedSection";
import { SearchBar } from "@/components/SearchBar";
import { SearchResultsInfinite } from "@/components/SearchResultsInfinite";
import { getCatalog } from "@/lib/catalogs";
import {
  BADGE_HAS_SAMPLE_VIDEO_LABEL,
  HOME_EMPTY_PROMPT,
  HOME_HEADING_DESCRIPTION,
  HOME_HEADING_TITLE,
  HOME_NO_RESULTS_MESSAGE,
  badgePriceRangeJa,
  badgeReleaseDateJa,
} from "@/lib/home-copy";
import { filterNormalizedItems } from "@/lib/item-filters";
import { searchFanza } from "@/lib/fanza";

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
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const sort = params.sort ?? "rank";
  const gteDate = params.gte_date ?? "";
  const pMin = Number(params.price_min ?? "") || 0;
  const pMax = Number(params.price_max ?? "") || 0;
  const hasVideo = params.has_video === "1";
  const catalog = getCatalog(params.cat).id;
  const debug = params.debug === "1";
  const buildVersion = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);

  const raw = q
    ? await searchFanza({
        keyword: q,
        page: 1,
        catalog,
        sort,
        ...(gteDate ? { gteDate } : {}),
      })
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

  const infiniteKey = `${catalog}|${q}|${sort}|${gteDate}|${pMin}|${pMax}|${hasVideo ? "1" : "0"}`;

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{HOME_HEADING_TITLE}</h1>
        <p className="text-sm text-neutral-400">{HOME_HEADING_DESCRIPTION}</p>
        {debug && (
          <p className="text-xs text-neutral-600">build: {buildVersion}</p>
        )}
      </section>

      <AccountPanel />
      <CatalogTabs active={catalog} tabParams={tabParams} />
      <SearchBar key={`searchbar-${catalog}`} />

      {!q && (
        <>
          <FavoritesSection />
          <HistorySection />
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
            {HOME_EMPTY_PROMPT}
          </section>
        </>
      )}

      {q && raw && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.label} className={`rounded-full px-2.5 py-0.5 text-xs ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>

          {filteredItems.length === 0 && !raw.hasNext ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
              {HOME_NO_RESULTS_MESSAGE}
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
