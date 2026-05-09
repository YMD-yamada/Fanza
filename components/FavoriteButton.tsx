"use client";

import type { CatalogId } from "@/lib/catalogs";
import type { SourceId } from "@/lib/types";
import { useFavorites } from "@/lib/useStorage";
import type { SavedItemInput } from "@/lib/savedItem";

type Props = {
  id: string;
  title: string;
  imageUrl?: string;
  actressNames: string[];
  catalog?: CatalogId;
  source?: SourceId;
  size?: "sm" | "md";
};

export function FavoriteButton({ id, title, imageUrl, actressNames, catalog, source, size = "sm" }: Props) {
  const { isFav, toggle } = useFavorites();
  const active = isFav(id, source);
  const entry: SavedItemInput = { id, title, imageUrl, actressNames, catalog, source };

  const titleSaved = "\u304a\u6c17\u306b\u5165\u308a\u6e08\u307f";
  const titleAdd = "\u304a\u6c17\u306b\u5165\u308a\u306b\u8ffd\u52a0";

  return (
    <button
      type="button"
      onClick={() => toggle(entry)}
      title={active ? titleSaved : titleAdd}
      className={`inline-flex items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-red-500/40 bg-red-500/15 text-red-400"
          : "border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
      } ${size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg"}`}
    >
      {active ? "\u2605" : "\u2606"}
    </button>
  );
}