import { NextResponse } from "next/server";

import {
  getCurrentUser,
  getFavoritesCapacity,
  type AuthUser,
} from "@/lib/auth";
import { clampFavorites, estimateFavoritesSizeBytes, parseSavedItems } from "@/lib/savedItem";
import {
  getUserFavorites,
  setUserFavorites,
} from "@/lib/userStore";

function unauthorized() {
  return NextResponse.json(
    { message: "ログインが必要です。" },
    { status: 401 },
  );
}

async function readAuthUser(): Promise<AuthUser | null> {
  return getCurrentUser();
}

export async function GET() {
  const user = await readAuthUser();
  if (!user) return unauthorized();

  const favorites = await getUserFavorites(user.id);
  const capacity = getFavoritesCapacity();
  const usedBytes = estimateFavoritesSizeBytes(favorites);

  return NextResponse.json({
    favorites,
    capacity: {
      maxItems: capacity.maxItems,
      maxBytes: capacity.maxBytes,
      usedItems: favorites.length,
      usedBytes,
      usedPercent:
        capacity.maxBytes > 0 ? Math.min(100, Math.round((usedBytes / capacity.maxBytes) * 100)) : 0,
    },
  });
}

export async function PUT(request: Request) {
  const user = await readAuthUser();
  if (!user) return unauthorized();

  const payload = await request.json().catch(() => null);
  const parsed = parseSavedItems(payload);
  if (!parsed) {
    return NextResponse.json(
      { message: "favorites の形式が不正です。" },
      { status: 400 },
    );
  }

  const capacity = getFavoritesCapacity();
  const normalized = clampFavorites(parsed, capacity.maxItems, capacity.maxBytes);
  const ok = await setUserFavorites(user.id, normalized);
  if (!ok) {
    return NextResponse.json(
      { message: "お気に入り保存に失敗しました。" },
      { status: 500 },
    );
  }

  const usedBytes = estimateFavoritesSizeBytes(normalized);
  return NextResponse.json({
    favorites: normalized,
    capacity: {
      maxItems: capacity.maxItems,
      maxBytes: capacity.maxBytes,
      usedItems: normalized.length,
      usedBytes,
      usedPercent:
        capacity.maxBytes > 0 ? Math.min(100, Math.round((usedBytes / capacity.maxBytes) * 100)) : 0,
    },
  });
}
