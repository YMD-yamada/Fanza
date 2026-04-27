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

function buildHref(cat: CatalogId, p: CatalogTabParams): string {
  const params = new URLSearchParams();
  params.set("cat", cat);
  if (p.q?.trim()) params.set("q", p.q.trim());
  if (p.sort) params.set("sort", p.sort);
  if (p.gte_date) params.set("gte_date", p.gte_date);
  if (p.price_min) params.set("price_min", p.price_min);
  if (p.price_max) params.set("price_max", p.price_max);
  if (p.has_video === "1") params.set("has_video", "1");
  return `/?${params.toString()}`;
}

type Props = {
  active: CatalogId;
  tabParams: CatalogTabParams;
};

export function CatalogTabs({ active, tabParams }: Props) {
  const ids = Object.keys(CATALOGS) as CatalogId[];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
      {ids.map((id) => {
        const spec = CATALOGS[id];
        const isOn = active === id;
        return (
          <Link
            key={id}
            href={buildHref(id, tabParams)}
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
