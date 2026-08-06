"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  FAVORITE_TERMS_EVENT,
  FAVORITE_TERMS_KEY,
  type FavoriteTerm,
  type FavoriteTermKind,
  isFavoriteTerm,
  sanitizeFavoriteTerms,
  saveFavoriteTerms,
  toggleFavoriteTerm,
} from "@/lib/favorite-terms";
import {
  FAVORITES_LIMIT,
  FAVORITES_MAX_BYTES,
  type SavedItem,
  type SavedItemInput,
  sanitizeSavedItems,
} from "@/lib/savedItem";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";

const FAVORITES_KEY = "fanza_favorites";
const HISTORY_KEY = "fanza_history";
const MAX_HISTORY = 50;
const SYNC_MARKER = "fanza_favorites_synced_user";
const ACCOUNT_SYNC_ENABLED = isAccountSyncEnabled();

type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
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
      const response = await fetch("/api/auth/me", { cache: "no-store" });
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

export function useFavorites() {
  const localItems = useStore(FAVORITES_KEY);
  const { status, user } = useAuthState();
  const [remoteItems, setRemoteItems] = useState<SavedItem[]>([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  const refreshRemote = useCallback(async () => {
    if (!ACCOUNT_SYNC_ENABLED) {
      setRemoteItems([]);
      setRemoteLoaded(false);
      return;
    }
    if (!user) {
      setRemoteItems([]);
      setRemoteLoaded(false);
      return;
    }
    try {
      const response = await fetch("/api/favorites", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { favorites?: unknown };
      const synced = sanitizeSavedItems(data.favorites, FAVORITES_LIMIT);
      setRemoteItems(synced);
      setRemoteLoaded(true);
      notifyFavoritesChanged();
    } catch {
      // Keep local fallback behavior on network errors.
    }
  }, [user]);

  useEffect(() => {
    setTimeout(() => {
      if (!ACCOUNT_SYNC_ENABLED || status !== "authenticated" || !user) {
        setRemoteLoaded(false);
        setRemoteItems([]);
        return;
      }
      void refreshRemote();
    }, 0);
  }, [refreshRemote, status, user]);

  useEffect(() => subscribeEvent(FAVORITES_EVENT, () => void refreshRemote()), [refreshRemote]);

  useEffect(() => {
    if (!ACCOUNT_SYNC_ENABLED) return;
    if (!user) return;
    const marker = localStorage.getItem(SYNC_MARKER);
    if (marker === user.id) return;

    const localFavorites = sanitizeSavedItems(localItems, FAVORITES_LIMIT);
    if (localFavorites.length === 0) {
      localStorage.setItem(SYNC_MARKER, user.id);
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/favorites", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favorites: localFavorites }),
        });
        if (response.ok) {
          localStorage.setItem(SYNC_MARKER, user.id);
          await refreshRemote();
        }
      } catch {
        // Keep local fallback behavior on sync errors.
      }
    })();
  }, [localItems, refreshRemote, user]);

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
        const response = await fetch("/api/favorites", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favorites }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { favorites?: unknown };
        const synced = sanitizeSavedItems(data.favorites, FAVORITES_LIMIT);
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

const TERMS_SYNC_MARKER = "fanza_favorite_terms_synced_user";

function notifyFavoriteTermsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FAVORITE_TERMS_EVENT));
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
      setRemoteTerms([]);
      setRemoteLoaded(false);
      return;
    }
    try {
      const response = await fetch("/api/favorite-terms", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { terms?: unknown };
      setRemoteTerms(sanitizeFavoriteTerms(data.terms));
      setRemoteLoaded(true);
    } catch {
      // Keep local fallback on network errors.
    }
  }, [user]);

  useEffect(() => {
    setTimeout(() => {
      if (!ACCOUNT_SYNC_ENABLED || status !== "authenticated" || !user) {
        setRemoteLoaded(false);
        setRemoteTerms([]);
        return;
      }
      void refreshRemote();
    }, 0);
  }, [refreshRemote, status, user]);

  useEffect(() => subscribeEvent(FAVORITE_TERMS_EVENT, () => void refreshRemote()), [refreshRemote]);

  useEffect(() => {
    if (!ACCOUNT_SYNC_ENABLED || !user) return;
    const marker = localStorage.getItem(TERMS_SYNC_MARKER);
    if (marker === user.id) return;

    const local = sanitizeFavoriteTerms(localTerms);
    if (local.length === 0) {
      localStorage.setItem(TERMS_SYNC_MARKER, user.id);
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/favorite-terms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terms: local }),
        });
        if (response.ok) {
          localStorage.setItem(TERMS_SYNC_MARKER, user.id);
          await refreshRemote();
        }
      } catch {
        // Keep local fallback on sync errors.
      }
    })();
  }, [localTerms, refreshRemote, user]);

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
        const response = await fetch("/api/favorite-terms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terms: next }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { terms?: unknown };
        setRemoteTerms(sanitizeFavoriteTerms(data.terms));
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

