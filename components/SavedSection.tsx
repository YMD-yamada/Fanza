"use client";

import Link from "next/link";

import { CollectionCapacityMeter } from "@/components/CollectionCapacity";
import { SafeThumbnail } from "@/components/SafeMedia";
import { TermFavoriteButton } from "@/components/TermFavoriteButton";
import { itemDetailPath } from "@/lib/item-link";
import type { SavedItem } from "@/lib/savedItem";
import { useFavoriteTerms, useFavorites, useHistory } from "@/lib/useStorage";

function ItemRow({ item, onRemove }: { item: SavedItem; onRemove?: () => void }) {
  const href = itemDetailPath(item.id, item.catalog, item.source);

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-2 transition-colors hover:border-neutral-700">
      <Link href={href} className="relative h-16 w-11 shrink-0 overflow-hidden rounded border border-neutral-700">
        <SafeThumbnail src={item.imageUrl} alt={item.title} sizes="44px" className="object-cover" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="line-clamp-1 text-sm font-medium hover:text-sky-400">
          {item.title}
        </Link>
        {item.actressNames.length > 0 && (
          <p className="line-clamp-1 text-xs text-neutral-500">{item.actressNames.join("、")}</p>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-neutral-600 opacity-0 transition-opacity hover:text-neutral-300 group-hover:opacity-100"
          title="削除"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function termSearchHref(name: string): string {
  const params = new URLSearchParams();
  params.set("q", name);
  params.set("sort", "rank");
  return `/?${params.toString()}`;
}

export function FavoritesSection() {
  const { items, toggle, capacity, isSynced } = useFavorites();
  const { people, keywords } = useFavoriteTerms();
  if (items.length === 0 && people.length === 0 && keywords.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">
          <span className="mr-1.5 text-red-400">♥</span>お気に入り
          <span className="ml-1.5 text-xs text-neutral-500">
            (作品 {items.length} / 人 {people.length} / 項目 {keywords.length})
          </span>
        </h2>
        <span className="text-xs text-neutral-500">{isSynced ? "作品は同期中" : "この端末のみ"}</span>
      </div>

      {people.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-neutral-500">人</p>
          <div className="flex flex-wrap gap-1.5">
            {people.map((term) => (
              <span
                key={`person:${term.name}`}
                className="inline-flex items-center gap-0.5 rounded-full border border-neutral-700 bg-neutral-900 py-0.5 pl-2.5 pr-0.5"
              >
                <Link href={termSearchHref(term.name)} className="text-xs text-neutral-200 hover:text-white">
                  {term.name}
                </Link>
                <TermFavoriteButton kind="person" name={term.name} />
              </span>
            ))}
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-neutral-500">項目</p>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((term) => (
              <span
                key={`keyword:${term.name}`}
                className="inline-flex items-center gap-0.5 rounded-full border border-neutral-700 bg-neutral-900 py-0.5 pl-2.5 pr-0.5"
              >
                <Link href={termSearchHref(term.name)} className="text-xs text-neutral-200 hover:text-white">
                  {term.name}
                </Link>
                <TermFavoriteButton kind="keyword" name={term.name} />
              </span>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <CollectionCapacityMeter capacity={capacity} />
          <div className="grid gap-2 md:grid-cols-2">
            {items.slice(0, 10).map((item) => (
              <ItemRow
                key={`${item.source ?? "fanza"}:${item.id}`}
                item={item}
                onRemove={() =>
                  toggle({
                    id: item.id,
                    title: item.title,
                    imageUrl: item.imageUrl,
                    actressNames: item.actressNames,
                    catalog: item.catalog,
                    source: item.source,
                  })
                }
              />
            ))}
          </div>
          {items.length > 10 && <p className="text-xs text-neutral-500">他 {items.length - 10} 件</p>}
        </>
      )}
    </section>
  );
}

export function HistorySection() {
  const { items } = useHistory();
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">
        <span className="mr-1.5 text-neutral-500">◷</span>最近チェックした作品
      </h2>
      <div className="grid gap-2 md:grid-cols-2">
        {items.slice(0, 8).map((item) => (
          <ItemRow key={`${item.source ?? "fanza"}:${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}
