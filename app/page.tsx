import { AccountPanel } from "@/components/AccountPanel";
import { CatalogTabs } from "@/components/CatalogTabs";
import { FavoritesSection, HistorySection } from "@/components/SavedSection";
import { SearchBar } from "@/components/SearchBar";
import { SearchResultsInfinite } from "@/components/SearchResultsInfinite";
import { getCatalog } from "@/lib/catalogs";
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

  const filteredItems =
    raw != null ? filterNormalizedItems(raw.items, clientFilters) : [];

  const badges: { label: string; cls: string }[] = [];
  if (gteDate) badges.push({ label: `${gteDate.slice(0, 10)}?`, cls: "bg-violet-500/15 text-violet-300" });
  if (pMin > 0 || pMax > 0) {
    const label = pMin > 0 && pMax > 0 ? `${pMin}?${pMax}�~` : pMax > 0 ? `?${pMax}�~` : `${pMin}�~?`;
    badges.push({ label, cls: "bg-emerald-500/15 text-emerald-300" });
  }
  if (hasVideo) badges.push({ label: "���悠��", cls: "bg-amber-500/15 text-amber-300" });

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
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Fanza �����i�r
        </h1>
        <p className="text-sm text-neutral-400">
          �摜�E�T���v������E�w�������N��1��ʂŊm�F
        </p>
      </section>

      <AccountPanel />
      <CatalogTabs active={catalog} tabParams={tabParams} />
      <SearchBar />

      {!q && (
        <>
          <FavoritesSection />
          <HistorySection />
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
            �L�[���[�h����͂��邩�A�N�C�b�N��������I��ł�������
          </section>
        </>
      )}

      {q && raw && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.label}
                className={`rounded-full px-2.5 py-0.5 text-xs ${b.cls}`}
              >
                {b.label}
              </span>
            ))}
          </div>

          {filteredItems.length === 0 && !raw.hasNext ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-5 py-8 text-center text-sm text-neutral-400">
              �Y�������i��������܂���ł����i�t�B���^�ŏ��O���ꂽ�\��������܂��j
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
            />
          )}
        </section>
      )}
    </div>
  );
}