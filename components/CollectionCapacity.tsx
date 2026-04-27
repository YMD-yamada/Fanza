"use client";

import type { CollectionCapacity } from "@/lib/savedItem";

type CollectionCapacityProps = {
  capacity: CollectionCapacity;
};

export function CollectionCapacityMeter({ capacity }: CollectionCapacityProps) {
  const percentage = Math.min(100, Math.round(capacity.percent));
  return (
    <section className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-200">お気に入りコレクション容量</h2>
        <span className="text-xs text-neutral-400">
          {capacity.usedItems}/{capacity.maxItems} 件
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-pink-500 transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="space-y-1 text-xs text-neutral-500">
        <p>{percentage}% 使用中</p>
        <p>
          {capacity.usedBytes.toLocaleString()} / {capacity.maxBytes.toLocaleString()} bytes
        </p>
      </div>
    </section>
  );
}
