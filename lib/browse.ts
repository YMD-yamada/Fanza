import type { CatalogId } from "@/lib/catalogs";

export type BrowseView = "rank" | "new";

export function parseBrowseView(value: string | undefined | null): BrowseView | null {
  if (value === "rank" || value === "new") return value;
  return null;
}

export function sortForBrowse(view: BrowseView): string {
  return view === "new" ? "-date" : "rank";
}

export function browsePath(catalog: CatalogId, view: BrowseView): string {
  const params = new URLSearchParams();
  if (catalog !== "video") params.set("cat", catalog);
  params.set("view", view);
  return `/?${params.toString()}`;
}

export function formatVolume(volume?: string): string | undefined {
  if (!volume) return undefined;
  const trimmed = volume.trim();
  if (!trimmed) return undefined;
  const minutes = Number(trimmed);
  if (Number.isFinite(minutes) && minutes > 0) {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return rest ? `${hours}時間${rest}分` : `${hours}時間`;
    }
    return `${minutes}分`;
  }
  return trimmed;
}
