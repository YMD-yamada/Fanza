import { CompactItemCard } from "@/components/CompactItemCard";
import type { CatalogId } from "@/lib/catalogs";
import type { NormalizedItem } from "@/lib/types";

export function RelatedWorks({
  items,
  catalog,
  label,
}: {
  items: NormalizedItem[];
  catalog?: CatalogId;
  label: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">関連作品（{label}）</h2>
      <p className="text-xs text-neutral-500">同じ出演またはジャンルの作品を並べて比較できます。購入は各公式ページです。</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <CompactItemCard key={`${item.source}:${item.id}`} item={item} catalog={catalog} />
        ))}
      </div>
    </section>
  );
}
