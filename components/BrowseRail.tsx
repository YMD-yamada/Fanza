import Link from "next/link";

import { CompactItemCard } from "@/components/CompactItemCard";
import type { CatalogId } from "@/lib/catalogs";
import type { NormalizedItem } from "@/lib/types";

export function BrowseRail({
  title,
  href,
  items,
  catalog,
}: {
  title: string;
  href: string;
  items: NormalizedItem[];
  catalog?: CatalogId;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
        <Link href={href} className="text-xs text-sky-400 hover:underline">
          すべて見る
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.slice(0, 8).map((item) => (
          <CompactItemCard key={`${item.source}:${item.id}`} item={item} catalog={catalog} />
        ))}
      </div>
    </section>
  );
}
