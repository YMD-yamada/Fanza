"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CATALOGS, isCatalogId, type CatalogId } from "@/lib/catalogs";
import { loadRecentQueries, type RecentQuery } from "@/lib/recent-queries";

function buildHref(entry: RecentQuery): string {
  const params = new URLSearchParams();
  params.set("cat", entry.cat);
  params.set("q", entry.q);
  params.set("sort", "rank");
  return `/?${params.toString()}`;
}

export function RecentQueriesBar() {
  const [items, setItems] = useState<RecentQuery[]>([]);

  const refresh = useCallback(() => {
    setItems(loadRecentQueries());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("fanza-recent-queries", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("fanza-recent-queries", onStorage);
    };
  }, [refresh]);

  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-neutral-500">最近の検索</span>
        <span className="text-[10px] text-neutral-600">端末に保存 · 最大10件</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((entry) => {
          const cat = (isCatalogId(entry.cat) ? entry.cat : "video") as CatalogId;
          const label = CATALOGS[cat].shortLabel;
          return (
            <Link
              key={`${entry.cat}:${entry.q}`}
              href={buildHref({ ...entry, cat })}
              className="max-w-full truncate rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-200 transition-colors hover:border-sky-500/50 hover:text-white"
            >
              <span className="text-neutral-500">{label}</span>
              <span className="mx-1 text-neutral-600">·</span>
              <span>{entry.q}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
