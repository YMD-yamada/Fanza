"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CatalogId } from "@/lib/catalogs";
import { filterNormalizedItems } from "@/lib/item-filters";
import type { NormalizedItem } from "@/lib/types";

import { ItemCard } from "@/components/ItemCard";

type SearchApiPayload = {
  items: NormalizedItem[];
  totalCount: number;
  page: number;
  hasNext: boolean;
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
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [apiHasNext, setApiHasNext] = useState(hasNext);
  const [lastApiPage, setLastApiPage] = useState(1);
  const seenIds = useRef(new Set(initialItems.map((i) => i.id)));
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
          if (seenIds.current.has(item.id)) continue;
          seenIds.current.add(item.id);
          out.push(item);
        }
        return out;
      });
      setLastApiPage(data.page);
      setApiHasNext(data.hasNext);
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

  return (
    <>
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
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} catalog={catalog} />
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
