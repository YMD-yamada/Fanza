"use client";

import type { FavoriteTermKind } from "@/lib/favorite-terms";
import { useFavoriteTerms } from "@/lib/useStorage";

type Props = {
  kind: FavoriteTermKind;
  name: string;
  size?: "xs" | "sm";
};

export function TermFavoriteButton({ kind, name, size = "xs" }: Props) {
  const { isFav, toggle } = useFavoriteTerms();
  const active = isFav(kind, name);
  const label = kind === "person" ? "人" : "項目";
  const titleSaved = `\u304a\u6c17\u306b\u5165\u308a\u6e08\u307f\uff08${label}\uff09`;
  const titleAdd = `\u304a\u6c17\u306b\u5165\u308a\u306b\u8ffd\u52a0\uff08${label}\uff09`;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(kind, name);
      }}
      title={active ? titleSaved : titleAdd}
      aria-label={active ? titleSaved : titleAdd}
      className={`inline-flex shrink-0 items-center justify-center rounded border transition-colors ${
        active
          ? "border-red-500/40 bg-red-500/15 text-red-400"
          : "border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
      } ${size === "xs" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-sm"}`}
    >
      {active ? "\u2605" : "\u2606"}
    </button>
  );
}
