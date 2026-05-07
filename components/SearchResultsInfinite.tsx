"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CatalogId } from "@/lib/catalogs";
import { filterNormalizedItems } from "@/lib/item-filters";
import type { NormalizedItem, SearchMode, SearchWarning, SourceId } from "@/lib/types";

import { ItemCard } from "@/components/ItemCard";

type SearchApiPayload = {
  items: NormalizedItem[];
  totalCount: number;
  page: number;
  hasNext: boolean;
  mode?: SearchMode;
  warnings?: SearchWarning[];
};

type Props = {
  catalog: CatalogId;
  query: string;
  sort: string;
  gteDate: string;
  priceMin: number;
  priceMax: number;
  hasVideo: boolean;
  initialItems: NormalizedItem[];
  totalCount: number;
  hasNext: boolean;
  mode?: SearchMode;
  warnings?: SearchWarning[];
};

export function SearchResultsInfinite({
  catalog,
  query,
  sort,
  gteDate,
  priceMin,
  priceMax,
  hasVideo,
  initialItems,
  totalCount,
  hasNext,
  mode,
  warnings,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [apiHasNext, setApiHasNext] = useState(hasNext);
  const [lastApiPage, setLastApiPage] = useState(1);
  const [activeSource, setActiveSource] = useState<SourceId | "all">("all");
  const [responseMode, setResponseMode] = useState<SearchMode>(mode ?? "unified");
  const [apiWarnings, setApiWarnings] = useState<SearchWarning[]>(warnings ?? []);
  const seenIds = useRef(new Set(initialItems.map((i) => `${i.source}:${i.id}`)));
  const busy = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busy.current || !apiHasNext) return;
    busy.current = true;
    setLoading(true);
    try {
      const nextPage = lastApiPage + 1;
      const p = new URLSearchParams();
      p.set("q", query);
      p.set("page", String(nextPage));
      p.set("sort", sort);
      p.set("cat", catalog);
      if (activeSource !== "all") p.set("source", activeSource);
      if (gteDate) p.set("gte_date", gteDate);

      const res = await fetch(`/api/search?${p.toString()}`);
      if (!res.ok) return;

      const data = (await res.json()) as SearchApiPayload;
      const filtered = filterNormalizedItems(data.items, {
        priceMin,
        priceMax,
        hasVideo,
      });

      setItems((prev) => {
        const out = [...prev];
        for (const item of filtered) {
          const key = `${item.source}:${item.id}`;
          if (seenIds.current.has(key)) continue;
          seenIds.current.add(key);
          out.push(item);
        }
        return out;
      });
      setLastApiPage(data.page);
      setApiHasNext(data.hasNext);
      setResponseMode(data.mode ?? "unified");
      setApiWarnings(data.warnings ?? []);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [
    apiHasNext,
    lastApiPage,
    catalog,
    query,
    sort,
    gteDate,
    activeSource,
    priceMin,
    priceMax,
    hasVideo,
  ]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { root: null, rootMargin: "400px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const sourceCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.source] = (acc[item.source] ?? 0) + 1;
    return acc;
  }, {});

  const displayItems = activeSource === "all"
    ? items
    : items.filter((item) => item.source === activeSource);

  return (
    <>
      {apiWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-200">
          一部の提供元で取得に失敗しました: {apiWarnings.map((w) => `${w.source}(${w.message})`).join(" / ")}
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <span className="tabular-nums font-semibold text-white">
          {totalCount.toLocaleString()}
        </span>
        <span className="text-neutral-400">件ヒット</span>
        <span className="text-neutral-500">·</span>
        <span className="text-neutral-400">
          表示{" "}
          <span className="tabular-nums font-medium text-neutral-200">
            {items.length}
          </span>
          件
        </span>
        <span className="text-xs text-neutral-600">
          （下端までスクロールで続きを読み込み）
        </span>
        {responseMode === "source_tabs" && (
          <span className="text-xs text-amber-300">（速度優先モード: 提供元切替）</span>
        )}
      </div>
      {responseMode === "source_tabs" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSource("all")}
            className={`rounded-full px-3 py-1 text-xs ${
              activeSource === "all" ? "bg-sky-600 text-white" : "bg-neutral-800 text-neutral-300"
            }`}
          >
            すべて ({items.length})
          </button>
          {Object.entries(sourceCounts).map(([source, count]) => (
            <button
              key={source}
              type="button"
              onClick={() => setActiveSource(source as SourceId)}
              className={`rounded-full px-3 py-1 text-xs ${
                activeSource === source ? "bg-sky-600 text-white" : "bg-neutral-800 text-neutral-300"
              }`}
            >
              {source.toUpperCase()} ({count})
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {displayItems.map((item) => (
          <ItemCard key={`${item.source}:${item.id}`} item={item} catalog={catalog} />
        ))}
      </div>

      <div
        ref={sentinelRef}
        className="flex min-h-10 justify-center py-6"
        aria-hidden
      >
        {loading && (
          <span className="text-sm text-neutral-500">読み込み中…</span>
        )}
        {!loading && !apiHasNext && items.length > 0 && (
          <span className="text-xs text-neutral-600">すべて表示しました</span>
        )}
      </div>
    </>
  );
}
