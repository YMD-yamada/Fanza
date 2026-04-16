"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  FAVORITES_LIMIT,
  FAVORITES_MAX_BYTES,
  type SavedItem,
  type SavedItemInput,
  sanitizeSavedItems,
} from "@/lib/savedItem";

const FAVORITES_KEY = "fanza_favorites";
const HISTORY_KEY = "fanza_history";
const MAX_HISTORY = 50;
const SYNC_MARKER = "fanza_favorites_synced_user";

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
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const refresh = useCallback(async (setLoading = false) => {
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
    setTimeout(() => {
      void refresh(true);
    }, 0);
  }, [refresh]);

  useEffect(() => subscribeEvent(AUTH_EVENT, () => void refresh()), [refresh]);

  return { ...state, refresh };
}

function upsertFavorite(base: SavedItem[], entry: SavedItemInput): SavedItem[] {
  const exists = base.some((item) => item.id === entry.id);
  const next = exists
    ? base.filter((item) => item.id !== entry.id)
    : [{ ...entry, savedAt: Date.now() }, ...base];
  return sanitizeSavedItems(next, FAVORITES_LIMIT);
}

export function useFavorites() {
  const localItems = useStore(FAVORITES_KEY);
  const { status, user } = useAuthState();
  const [remoteItems, setRemoteItems] = useState<SavedItem[]>([]);
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  const refreshRemote = useCallback(async () => {
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
      if (status !== "authenticated" || !user) {
        setRemoteLoaded(false);
        setRemoteItems([]);
        return;
      }
      void refreshRemote();
    }, 0);
  }, [refreshRemote, status, user]);

  useEffect(() => subscribeEvent(FAVORITES_EVENT, () => void refreshRemote()), [refreshRemote]);

  useEffect(() => {
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

  const isFav = useCallback((id: string) => items.some((item) => item.id === id), [items]);

  const saveRemote = useCallback(
    async (favorites: SavedItem[]) => {
      if (!(status === "authenticated" && user)) return;
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
      if (status === "authenticated" && user) {
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
    isSynced: status === "authenticated" && Boolean(user),
    capacity,
  };
}

export function useHistory() {
  const items = useStore(HISTORY_KEY);

  const record = useCallback((entry: SavedItemInput) => {
    const current = readStore(HISTORY_KEY).filter((item) => item.id !== entry.id);
    const next = sanitizeSavedItems([{ ...entry, savedAt: Date.now() }, ...current], MAX_HISTORY);
    writeStore(HISTORY_KEY, next);
  }, []);

  return { items, record };
}
