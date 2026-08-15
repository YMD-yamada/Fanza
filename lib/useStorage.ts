"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  FAVORITE_TERMS_EVENT,
  FAVORITE_TERMS_KEY,
  type FavoriteTerm,
  type FavoriteTermKind,
  isFavoriteTerm,
  mergeFavoriteTerms,
  sanitizeFavoriteTerms,
  saveFavoriteTerms,
  toggleFavoriteTerm,
} from "@/lib/favorite-terms";
import {
  FAVORITES_LIMIT,
  FAVORITES_MAX_BYTES,
  type SavedItem,
  type SavedItemInput,
  mergeSavedItems,
  sanitizeSavedItems,
} from "@/lib/savedItem";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";

const FAVORITES_KEY = "fanza_favorites";
const HISTORY_KEY = "fanza_history";
const MAX_HISTORY = 50;
const SYNC_MARKER = "fanza_favorites_synced_user";
const TERMS_SYNC_MARKER = "fanza_favorite_terms_synced_user";
const ACCOUNT_SYNC_ENABLED = isAccountSyncEnabled();
const SAME_ORIGIN: RequestInit = { cache: "no-store", credentials: "same-origin" };

type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  hasPassword?: boolean;
  hasPasskey?: boolean;
};

type AuthState = {
  status: "loading" | "authenticated" | "guest";
  user: AuthUser | null;
};

type FavoriteCapacity = {
  usedItems: number;
  maxItems: number;
  percent: number;
  usedBytes: number;
  maxBytes: number;
};

const AUTH_EVENT = "fanza-auth-changed";
const FAVORITES_EVENT = "fanza-favorites-changed";

let favoritesHydrate: Promise<SavedItem[] | null> | null = null;
let favoritesHydrateUserId: string | null = null;
let termsHydrate: Promise<FavoriteTerm[] | null> | null = null;
let termsHydrateUserId: string | null = null;

function readStore(key: string): SavedItem[] {
  if (typeof window === "undefined") return [];
  return sanitizeSavedItems(JSON.parse(localStorage.getItem(key) ?? "[]"));
}

function writeStore(key: string, items: SavedItem[]) {
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function subscribeStorage(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function useStore(key: string) {
  const serialized = useSyncExternalStore(
    subscribeStorage,
    () => localStorage.getItem(key) ?? "[]",
    () => "[]",
  );
  return sanitizeSavedItems(JSON.parse(serialized ?? "[]"));
}

function notifyEvent(name: string) {
  window.dispatchEvent(new Event(name));
}

function subscribeEvent(name: string, cb: () => void) {
  const handler = () => cb();
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}

export function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  notifyEvent(AUTH_EVENT);
}

function notifyFavoritesChanged() {
  notifyEvent(FAVORITES_EVENT);
}

export function useAuthState() {
  const [state, setState] = useState<AuthState>(
    ACCOUNT_SYNC_ENABLED ? { status: "loading", user: null } : { status: "guest", user: null },
  );

  const refresh = useCallback(async (setLoading = false) => {
    if (!ACCOUNT_SYNC_ENABLED) {
      setState({ status: "guest", user: null });
      return;
    }
    if (setLoading) {
      setState({ status: "loading", user: null });
    }
    try {
      const response = await fetch("/api/auth/me", SAME_ORIGIN);
      if (!response.ok) {
        setState({ status: "guest", user: null });
        return;
      }
      const data = (await response.json()) as { user?: AuthUser | null };
      setState(data.user ? { status: "authenticated", user: data.user } : { status: "guest", user: null });
    } catch {
      setState({ status: "guest", user: null });
    }
  }, []);

  useEffect(() => {
    if (!ACCOUNT_SYNC_ENABLED) return;
    setTimeout(() => {
      void refresh(true);
    }, 0);
  }, [refresh]);

  useEffect(() => subscribeEvent(AUTH_EVENT, () => void refresh()), [refresh]);

  return { ...state, refresh };
}

function upsertFavorite(base: SavedItem[], entry: SavedItemInput): SavedItem[] {
  const key = `${entry.source ?? "fanza"}:${entry.id}`;
  const exists = base.some((item) => `${item.source ?? "fanza"}:${item.id}` === key);
  const next = exists
    ? base.filter((item) => `${item.source ?? "fanza"}:${item.id}` !== key)
    : [{ ...entry, savedAt: Date.now() }, ...base];
  return sanitizeSavedItems(next, FAVORITES_LIMIT);
}

async function putFavorites(userId: string, favorites: SavedItem[]): Promise<SavedItem[] | null> {
  const response = await fetch("/api/favorites", {
    method: "PUT",
    ...SAME_ORIGIN,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ favorites }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { favorites?: unknown };
  const synced = sanitizeSavedItems(data.favorites, FAVORITES_LIMIT);
  favoritesHydrateUserId = userId;
  favoritesHydrate = Promise.resolve(synced);
  return synced;
}

async function hydrateFavoritesForUser(userId: string): Promise<SavedItem[] | null> {
  if (favoritesHydrate && favoritesHydrateUserId === userId) {
    return favoritesHydrate;
  }
  favoritesHydrateUserId = userId;
  favoritesHydrate = (async () => {
    const response = await fetch("/api/favorites", SAME_ORIGIN);
    if (!response.ok) return null;
    const data = (await response.json()) as { favorites?: unknown };
    const remote = sanitizeSavedItems(data.favorites, FAVORITES_LIMIT);
    const marker = localStorage.getItem(SYNC_MARKER);
    let next: SavedItem[];
    if (marker === userId) {
      next = remote;
    } else if (!marker) {
      const local = sanitizeSavedItems(
        JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as unknown,
        FAVORITES_LIMIT,
      );
      next = mergeSavedItems(local, remote);
      const saved = await putFavorites(userId, next);
      if (saved) next = saved;
    } else {
      next = remote;
    }
    writeStore(FAVORITES_KEY, next);
    localStorage.setItem(SYNC_MARKER, userId);
    favoritesHydrateUserId = userId;
    favoritesHydrate = Promise.resolve(next);
    return next;
  })();
  return favoritesHydrate;
}

export function useFavorites() {
  const localItems = useStore(FAVORITES_KEY);
  const { status, user } = useAuthState();
  const [remoteItems, setRemoteItems] = useState<SavedItem[]>([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  const refreshRemote = useCallback(async () => {
    if (!ACCOUNT_SYNC_ENABLED || !user) {
      setTimeout(() => {
        setRemoteItems([]);
        setRemoteLoaded(false);
      }, 0);
      return;
    }
    try {
      const synced = await hydrateFavoritesForUser(user.id);
      if (!synced) return;
      setRemoteItems(synced);
      setRemoteLoaded(true);
    } catch {
      // Keep local fallback behavior on network errors.
    }
  }, [user]);

  useEffect(() => {
    setTimeout(() => {
      if (!ACCOUNT_SYNC_ENABLED || status !== "authenticated" || !user) {
        favoritesHydrate = null;
        favoritesHydrateUserId = null;
        setRemoteLoaded(false);
        setRemoteItems([]);
        return;
      }
      void refreshRemote();
    }, 0);
  }, [refreshRemote, status, user]);

  useEffect(() => subscribeEvent(FAVORITES_EVENT, () => void refreshRemote()), [refreshRemote]);

  const items = useMemo(() => {
    if (status === "authenticated" && user && remoteLoaded) {
      return remoteItems;
    }
    return localItems;
  }, [localItems, remoteItems, remoteLoaded, status, user]);

  const isFav = useCallback(
    (id: string, source?: SavedItemInput["source"]) => {
      const key = `${source ?? "fanza"}:${id}`;
      return items.some((item) => `${item.source ?? "fanza"}:${item.id}` === key);
    },
    [items],
  );

  const saveRemote = useCallback(
    async (favorites: SavedItem[]) => {
      if (!ACCOUNT_SYNC_ENABLED || !(status === "authenticated" && user)) return;
      try {
        const synced = await putFavorites(user.id, favorites);
        if (!synced) return;
        writeStore(FAVORITES_KEY, synced);
        setRemoteItems(synced);
        notifyFavoritesChanged();
      } catch {
        // Keep local fallback behavior on save errors.
      }
    },
    [status, user],
  );

  const toggle = useCallback(
    (entry: SavedItemInput) => {
      const next = upsertFavorite(items, entry);
      writeStore(FAVORITES_KEY, next);
      if (ACCOUNT_SYNC_ENABLED && status === "authenticated" && user) {
        void saveRemote(next);
      } else {
        notifyFavoritesChanged();
      }
    },
    [items, saveRemote, status, user],
  );

  const capacity: FavoriteCapacity = {
    usedItems: items.length,
    maxItems: FAVORITES_LIMIT,
    percent: (items.length / FAVORITES_LIMIT) * 100,
    usedBytes: new TextEncoder().encode(JSON.stringify(items)).length,
    maxBytes: FAVORITES_MAX_BYTES,
  };

  return {
    items,
    isFav,
    toggle,
    isSynced: ACCOUNT_SYNC_ENABLED && status === "authenticated" && Boolean(user),
    capacity,
  };
}

export function useHistory() {
  const items = useStore(HISTORY_KEY);

  const record = useCallback((entry: SavedItemInput) => {
    const key = `${entry.source ?? "fanza"}:${entry.id}`;
    const current = readStore(HISTORY_KEY).filter(
      (item) => `${item.source ?? "fanza"}:${item.id}` !== key,
    );
    const next = sanitizeSavedItems([{ ...entry, savedAt: Date.now() }, ...current], MAX_HISTORY);
    writeStore(HISTORY_KEY, next);
  }, []);

  return { items, record };
}

function subscribeFavoriteTerms(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("storage", handler);
  window.addEventListener(FAVORITE_TERMS_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(FAVORITE_TERMS_EVENT, handler);
  };
}

function getFavoriteTermsSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(FAVORITE_TERMS_KEY) ?? "[]";
}

function notifyFavoriteTermsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FAVORITE_TERMS_EVENT));
}

async function putFavoriteTerms(userId: string, terms: FavoriteTerm[]): Promise<FavoriteTerm[] | null> {
  const response = await fetch("/api/favorite-terms", {
    method: "PUT",
    ...SAME_ORIGIN,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { terms?: unknown };
  const synced = sanitizeFavoriteTerms(data.terms);
  termsHydrateUserId = userId;
  termsHydrate = Promise.resolve(synced);
  return synced;
}

async function hydrateTermsForUser(userId: string): Promise<FavoriteTerm[] | null> {
  if (termsHydrate && termsHydrateUserId === userId) {
    return termsHydrate;
  }
  termsHydrateUserId = userId;
  termsHydrate = (async () => {
    const response = await fetch("/api/favorite-terms", SAME_ORIGIN);
    if (!response.ok) return null;
    const data = (await response.json()) as { terms?: unknown };
    const remote = sanitizeFavoriteTerms(data.terms);
    const marker = localStorage.getItem(TERMS_SYNC_MARKER);
    let next: FavoriteTerm[];
    if (marker === userId) {
      next = remote;
    } else if (!marker) {
      const local = sanitizeFavoriteTerms(
        JSON.parse(localStorage.getItem(FAVORITE_TERMS_KEY) ?? "[]") as unknown,
      );
      next = mergeFavoriteTerms(local, remote);
      const saved = await putFavoriteTerms(userId, next);
      if (saved) next = saved;
    } else {
      next = remote;
    }
    saveFavoriteTerms(next);
    localStorage.setItem(TERMS_SYNC_MARKER, userId);
    termsHydrateUserId = userId;
    termsHydrate = Promise.resolve(next);
    return next;
  })();
  return termsHydrate;
}

export function useFavoriteTerms() {
  const localSerialized = useSyncExternalStore(
    subscribeFavoriteTerms,
    getFavoriteTermsSnapshot,
    () => "[]",
  );
  const localTerms = useMemo(() => sanitizeFavoriteTermsFromJson(localSerialized), [localSerialized]);

  const { status, user } = useAuthState();
  const [remoteTerms, setRemoteTerms] = useState<FavoriteTerm[]>([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  const refreshRemote = useCallback(async () => {
    if (!ACCOUNT_SYNC_ENABLED || !user) {
      setTimeout(() => {
        setRemoteTerms([]);
        setRemoteLoaded(false);
      }, 0);
      return;
    }
    try {
      const synced = await hydrateTermsForUser(user.id);
      if (!synced) return;
      setRemoteTerms(synced);
      setRemoteLoaded(true);
    } catch {
      // Keep local fallback on network errors.
    }
  }, [user]);

  useEffect(() => {
    setTimeout(() => {
      if (!ACCOUNT_SYNC_ENABLED || status !== "authenticated" || !user) {
        termsHydrate = null;
        termsHydrateUserId = null;
        setRemoteLoaded(false);
        setRemoteTerms([]);
        return;
      }
      void refreshRemote();
    }, 0);
  }, [refreshRemote, status, user]);

  useEffect(() => subscribeEvent(FAVORITE_TERMS_EVENT, () => void refreshRemote()), [refreshRemote]);

  const terms = useMemo(() => {
    if (status === "authenticated" && user && remoteLoaded) {
      return remoteTerms;
    }
    return localTerms;
  }, [localTerms, remoteLoaded, remoteTerms, status, user]);

  const people = useMemo(() => terms.filter((term) => term.kind === "person"), [terms]);
  const keywords = useMemo(() => terms.filter((term) => term.kind === "keyword"), [terms]);

  const isFav = useCallback(
    (kind: FavoriteTermKind, name: string) => isFavoriteTerm(terms, kind, name),
    [terms],
  );

  const saveRemote = useCallback(
    async (next: FavoriteTerm[]) => {
      if (!ACCOUNT_SYNC_ENABLED || !(status === "authenticated" && user)) return;
      try {
        const synced = await putFavoriteTerms(user.id, next);
        if (!synced) return;
        saveFavoriteTerms(synced);
        setRemoteTerms(synced);
        notifyFavoriteTermsChanged();
      } catch {
        // Keep local fallback on save errors.
      }
    },
    [status, user],
  );

  const toggle = useCallback(
    (kind: FavoriteTermKind, name: string) => {
      const next = toggleFavoriteTerm(terms, kind, name);
      saveFavoriteTerms(next);
      if (ACCOUNT_SYNC_ENABLED && status === "authenticated" && user) {
        void saveRemote(next);
      } else {
        notifyFavoriteTermsChanged();
      }
    },
    [saveRemote, status, terms, user],
  );

  return {
    terms,
    people,
    keywords,
    isFav,
    toggle,
    isSynced: ACCOUNT_SYNC_ENABLED && status === "authenticated" && Boolean(user),
  };
}

function sanitizeFavoriteTermsFromJson(serialized: string): FavoriteTerm[] {
  try {
    return sanitizeFavoriteTerms(JSON.parse(serialized) as unknown);
  } catch {
    return [];
  }
}
