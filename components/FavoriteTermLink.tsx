"use client";

import Link from "next/link";

import { TermFavoriteButton } from "@/components/TermFavoriteButton";
import type { CatalogId } from "@/lib/catalogs";
import type { FavoriteTermKind } from "@/lib/favorite-terms";

type Props = {
  kind: FavoriteTermKind;
  name: string;
  catalog?: CatalogId;
  showFavorite?: boolean;
};

function searchHref(name: string, catalog?: CatalogId): string {
  const params = new URLSearchParams();
  if (catalog && catalog !== "video") params.set("cat", catalog);
  params.set("q", name);
  params.set("sort", "rank");
  return `/?${params.toString()}`;
}

export function FavoriteTermLink({ kind, name, catalog, showFavorite = true }: Props) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <Link
        href={searchHref(name, catalog)}
        className="max-w-[14rem] truncate text-sm text-sky-300/90 underline-offset-2 hover:text-sky-300 hover:underline"
        title={`${name} で検索`}
      >
        {name}
      </Link>
      {showFavorite && <TermFavoriteButton kind={kind} name={name} />}
    </span>
  );
}

export function FavoriteGenreChip({
  name,
  catalog,
  showFavorite = true,
}: {
  name: string;
  catalog?: CatalogId;
  showFavorite?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-neutral-800 py-0.5 pl-1.5 pr-0.5 text-[11px] text-neutral-300">
      <Link
        href={searchHref(name, catalog)}
        className="hover:text-white"
        title={`${name} で検索`}
      >
        {name}
      </Link>
      {showFavorite && <TermFavoriteButton kind="keyword" name={name} />}
    </span>
  );
}
