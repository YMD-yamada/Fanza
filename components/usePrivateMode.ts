"use client";

import { useSyncExternalStore } from "react";

import { PRIVATE_MODE_CHANGE_EVENT, getPrivateModeClient } from "@/lib/privateMode";

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(PRIVATE_MODE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(PRIVATE_MODE_CHANGE_EVENT, handler);
}

function getSnapshot(): boolean {
  return getPrivateModeClient();
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrivateModeEnabled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
