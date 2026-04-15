"use client";

import { useCallback, useSyncExternalStore } from "react";

export type SavedItem = {
  id: string;
  title: string;
  imageUrl?: string;
  actressNames: string[];
  savedAt: number;
};

const FAVORITES_KEY = "fanza_favorites";
const HISTORY_KEY = "fanza_history";
const MAX_HISTORY = 50;

function getStore(key: string): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as SavedItem[];
  } catch {
    return [];
  }
}

function setStore(key: string, items: SavedItem[]) {
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function subscribe(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function useStore(key: string) {
  const items = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? "[]",
    () => "[]",
  );
  return JSON.parse(items) as SavedItem[];
}

export function useFavorites() {
  const items = useStore(FAVORITES_KEY);

  const isFav = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items],
  );

  const toggle = useCallback(
    (entry: Omit<SavedItem, "savedAt">) => {
      const current = getStore(FAVORITES_KEY);
      const exists = current.some((i) => i.id === entry.id);
      const next = exists
        ? current.filter((i) => i.id !== entry.id)
        : [{ ...entry, savedAt: Date.now() }, ...current];
      setStore(FAVORITES_KEY, next);
    },
    [],
  );

  return { items, isFav, toggle };
}

export function useHistory() {
  const items = useStore(HISTORY_KEY);

  const record = useCallback((entry: Omit<SavedItem, "savedAt">) => {
    const current = getStore(HISTORY_KEY).filter((i) => i.id !== entry.id);
    const next = [{ ...entry, savedAt: Date.now() }, ...current].slice(0, MAX_HISTORY);
    setStore(HISTORY_KEY, next);
  }, []);

  return { items, record };
}
