import Link from "next/link";

import { CATALOGS, type CatalogId } from "@/lib/catalogs";

export type CatalogTabParams = {
  q?: string;
  sort?: string;
  gte_date?: string;
  price_min?: string;
  price_max?: string;
  has_video?: string;
};

function buildHref(cat: CatalogId): string {
  const params = new URLSearchParams();
  params.set("cat", cat);
  // タブ切り替え時は、前タブの検索条件を引き継がない。
  // カテゴリごとに条件の意味が異なるため、UXとして都度リセットする。
  return `/?${params.toString()}`;
}

type Props = {
  active: CatalogId;
  tabParams: CatalogTabParams;
};

export function CatalogTabs({ active, tabParams }: Props) {
  const ids = Object.keys(CATALOGS) as CatalogId[];
  void tabParams;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
      {ids.map((id) => {
        const spec = CATALOGS[id];
        const isOn = active === id;
        return (
          <Link
            key={id}
            href={buildHref(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isOn
                ? "bg-sky-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
            }`}
          >
            {spec.shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
