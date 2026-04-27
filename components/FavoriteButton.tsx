"use client";

import type { CatalogId } from "@/lib/catalogs";
import { useFavorites } from "@/lib/useStorage";
import type { SavedItemInput } from "@/lib/savedItem";

type Props = {
  id: string;
  title: string;
  imageUrl?: string;
  actressNames: string[];
  catalog?: CatalogId;
  size?: "sm" | "md";
};

export function FavoriteButton({ id, title, imageUrl, actressNames, catalog, size = "sm" }: Props) {
  const { isFav, toggle } = useFavorites();
  const active = isFav(id);
  const entry: SavedItemInput = { id, title, imageUrl, actressNames, catalog };

  return (
    <button
      type="button"
      onClick={() => toggle(entry)}
      title={active ? "‚¨‹C‚É“ü‚è‰ðœ" : "‚¨‹C‚É“ü‚è“o˜^"}
      className={`inline-flex items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-red-500/40 bg-red-500/15 text-red-400"
          : "border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
      } ${size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg"}`}
    >
      {active ? "?" : "?"}
    </button>
  );
}