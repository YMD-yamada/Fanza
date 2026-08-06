"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { CATALOGS, isCatalogId, type CatalogId } from "@/lib/catalogs";
import { MAX_RECENT, RECENT_QUERIES_KEY, type RecentQuery } from "@/lib/recent-queries";

function buildHref(entry: RecentQuery): string {
  const params = new URLSearchParams();
  params.set("cat", entry.cat);
  params.set("q", entry.q);
  params.set("sort", "rank");
  return `/?${params.toString()}`;
}

function subscribeRecentQueries(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("storage", handler);
  window.addEventListener("fanza-recent-queries", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("fanza-recent-queries", handler);
  };
}

function getRecentQueriesSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(RECENT_QUERIES_KEY) ?? "[]";
}

function parseRecentQueries(serialized: string): RecentQuery[] {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentQuery =>
          Boolean(x) &&
          typeof x === "object" &&
          typeof (x as RecentQuery).q === "string" &&
          typeof (x as RecentQuery).cat === "string",
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function RecentQueriesBar() {
  const serialized = useSyncExternalStore(
    subscribeRecentQueries,
    getRecentQueriesSnapshot,
    () => "[]",
  );
  const items = useMemo(() => parseRecentQueries(serialized), [serialized]);

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
