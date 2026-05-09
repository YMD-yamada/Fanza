export const RECENT_QUERIES_KEY = "fanza_recent_queries_v1";
export const MAX_RECENT = 10;

export type RecentQuery = {
  q: string;
  cat: string;
};

export function loadRecentQueries(): RecentQuery[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_QUERIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentQuery =>
          Boolean(x) &&
          typeof x === "object" &&
          typeof (x as RecentQuery).q === "string" &&
          typeof (x as RecentQuery).cat === "string",
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberRecentQuery(entry: RecentQuery): void {
  if (typeof window === "undefined") return;
  const q = entry.q.trim();
  if (!q) return;
  const cat = entry.cat.trim() || "video";
  const prev = loadRecentQueries().filter((x) => !(x.q === q && x.cat === cat));
  const next = [{ q, cat }, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("fanza-recent-queries"));
}
