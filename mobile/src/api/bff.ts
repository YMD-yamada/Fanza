import { getApiBaseUrl } from "../lib/config";
import type { NormalizedItem, SearchResponse } from "../types";

function requireBase(): string {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not set.");
  }
  return base;
}

export async function searchItems(
  q: string,
  page = 1,
  sort = "rank",
  catalog?: string,
): Promise<SearchResponse> {
  const base = requireBase();
  const params = new URLSearchParams({
    q: q.trim(),
    page: String(page),
    sort,
  });
  if (catalog) params.set("cat", catalog);
  const res = await fetch(`${base}/api/search?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`search failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as SearchResponse;
}

export async function getItemById(id: string, catalog?: string): Promise<NormalizedItem> {
  const base = requireBase();
  const qs = catalog ? `?cat=${encodeURIComponent(catalog)}` : "";
  const res = await fetch(`${base}/api/items/${encodeURIComponent(id)}${qs}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`item failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as NormalizedItem;
}

export async function trackAffiliateClick(item: { id: string; title: string }): Promise<void> {
  const base = requireBase();
  try {
    await fetch(`${base}/api/track-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, title: item.title }),
    });
  } catch {
    // ベストエフォート; 遷移は止めない
  }
}
