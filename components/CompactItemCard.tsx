import Link from "next/link";

import { formatVolume } from "@/lib/browse";
import type { CatalogId } from "@/lib/catalogs";
import { itemDetailPath } from "@/lib/item-link";
import type { NormalizedItem } from "@/lib/types";
import { ItemCardThumbnail } from "@/components/ItemCardThumbnail";

export function CompactItemCard({
  item,
  catalog,
}: {
  item: NormalizedItem;
  catalog?: CatalogId;
}) {
  const href = itemDetailPath(item.id, catalog, item.source);
  const duration = formatVolume(item.volume);
  const maker = item.makerNames?.[0];

  return (
    <Link
      href={href}
      className="w-36 shrink-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 transition-colors hover:border-neutral-600"
    >
      <div className="relative h-48 w-full">
        <ItemCardThumbnail
          src={item.packageImageUrl}
          alt={item.title}
          sizes="144px"
          className="object-cover"
        />
      </div>
      <div className="space-y-1 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-neutral-100">{item.title}</p>
        <p className="truncate text-[10px] text-neutral-500">
          {[maker, duration, item.sampleVideoUrl ? "サンプルあり" : null].filter(Boolean).join(" · ")}
        </p>
        {item.listPrice ? <p className="text-[11px] text-neutral-300">{item.listPrice}</p> : null}
      </div>
    </Link>
  );
}
