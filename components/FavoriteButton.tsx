"use client";

import { useFavorites } from "@/lib/useStorage";

type Props = {
  id: string;
  title: string;
  imageUrl?: string;
  actressNames: string[];
  size?: "sm" | "md";
};

export function FavoriteButton({ id, title, imageUrl, actressNames, size = "sm" }: Props) {
  const { isFav, toggle } = useFavorites();
  const active = isFav(id);

  return (
    <button
      type="button"
      onClick={() => toggle({ id, title, imageUrl, actressNames })}
      title={active ? "お気に入り解除" : "お気に入り登録"}
      className={`inline-flex items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-red-500/40 bg-red-500/15 text-red-400"
          : "border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
      } ${size === "sm" ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg"}`}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
