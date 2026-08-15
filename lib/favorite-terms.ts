export const FAVORITE_TERMS_KEY = "fanza_favorite_terms_v1";
export const FAVORITE_TERMS_EVENT = "fanza-favorite-terms";
export const MAX_FAVORITE_PEOPLE = 50;
export const MAX_FAVORITE_KEYWORDS = 50;

export type FavoriteTermKind = "person" | "keyword";

export type FavoriteTerm = {
  kind: FavoriteTermKind;
  name: string;
  savedAt: number;
};

function limitFor(kind: FavoriteTermKind): number {
  return kind === "person" ? MAX_FAVORITE_PEOPLE : MAX_FAVORITE_KEYWORDS;
}

function toFavoriteTerm(value: unknown): FavoriteTerm | null {
  if (!value || typeof value !== "object") return null;
  const maybe = value as Partial<FavoriteTerm>;
  if (maybe.kind !== "person" && maybe.kind !== "keyword") return null;
  if (typeof maybe.name !== "string") return null;
  const name = maybe.name.trim();
  if (!name || name.length > 80) return null;
  return {
    kind: maybe.kind,
    name,
    savedAt: Number.isFinite(maybe.savedAt) ? Number(maybe.savedAt) : Date.now(),
  };
}

export function mergeFavoriteTerms(local: FavoriteTerm[], remote: FavoriteTerm[]): FavoriteTerm[] {
  return sanitizeFavoriteTerms([...remote, ...local]);
}

export function sanitizeFavoriteTerms(input: unknown): FavoriteTerm[] {
  if (!Array.isArray(input)) return [];
  const people: FavoriteTerm[] = [];
  const keywords: FavoriteTerm[] = [];
  const seen = new Set<string>();

  const sorted = input
    .map((value) => toFavoriteTerm(value))
    .filter((value): value is FavoriteTerm => Boolean(value))
    .sort((a, b) => b.savedAt - a.savedAt);

  for (const term of sorted) {
    const key = `${term.kind}:${term.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (term.kind === "person") {
      if (people.length < MAX_FAVORITE_PEOPLE) people.push(term);
    } else if (keywords.length < MAX_FAVORITE_KEYWORDS) {
      keywords.push(term);
    }
  }

  return [...people, ...keywords].sort((a, b) => b.savedAt - a.savedAt);
}

export function loadFavoriteTerms(): FavoriteTerm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITE_TERMS_KEY);
    if (!raw) return [];
    return sanitizeFavoriteTerms(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeFavoriteTerms(terms: FavoriteTerm[]): void {
  localStorage.setItem(FAVORITE_TERMS_KEY, JSON.stringify(terms));
  window.dispatchEvent(new StorageEvent("storage", { key: FAVORITE_TERMS_KEY }));
  window.dispatchEvent(new Event(FAVORITE_TERMS_EVENT));
}

export function isFavoriteTerm(terms: FavoriteTerm[], kind: FavoriteTermKind, name: string): boolean {
  const normalized = name.trim();
  return terms.some((term) => term.kind === kind && term.name === normalized);
}

export function toggleFavoriteTerm(
  terms: FavoriteTerm[],
  kind: FavoriteTermKind,
  name: string,
): FavoriteTerm[] {
  const normalized = name.trim();
  if (!normalized) return terms;

  const exists = terms.some((term) => term.kind === kind && term.name === normalized);
  const next = exists
    ? terms.filter((term) => !(term.kind === kind && term.name === normalized))
    : [{ kind, name: normalized, savedAt: Date.now() }, ...terms];

  return sanitizeFavoriteTerms(next).slice(0, limitFor("person") + limitFor("keyword"));
}

export function saveFavoriteTerms(terms: FavoriteTerm[]): void {
  if (typeof window === "undefined") return;
  writeFavoriteTerms(sanitizeFavoriteTerms(terms));
}
