"use client";

import Link from "next/link";

import { CollectionCapacityMeter } from "@/components/CollectionCapacity";
import { SafeThumbnail } from "@/components/SafeMedia";
import { itemDetailPath } from "@/lib/item-link";
import type { SavedItem } from "@/lib/savedItem";
import { useFavorites, useHistory } from "@/lib/useStorage";

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

export function FavoritesSection() {
  const { items, toggle, capacity, isSynced } = useFavorites();
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">
          <span className="mr-1.5 text-red-400">♥</span>お気に入り
          <span className="ml-1.5 text-xs text-neutral-500">({items.length})</span>
        </h2>
        <span className="text-xs text-neutral-500">{isSynced ? "同期中" : "この端末のみ"}</span>
      </div>
      <CollectionCapacityMeter capacity={capacity} />
      <div className="grid gap-2 md:grid-cols-2">
        {items.slice(0, 10).map((item) => (
          <ItemRow
            key={item.id}
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
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}