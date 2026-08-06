import { NextResponse } from "next/server";

import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { sanitizeFavoriteTerms } from "@/lib/favorite-terms";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { getUserFavoriteTerms, setUserFavoriteTerms } from "@/lib/userStore";

function unauthorized() {
  return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
}

function syncDisabled() {
  return NextResponse.json({ message: "アカウント同期は現在無効です。" }, { status: 404 });
}

async function readAuthUser(): Promise<AuthUser | null> {
  return getCurrentUser();
}

export async function GET() {
  if (!isAccountSyncEnabled()) return syncDisabled();
  const user = await readAuthUser();
  if (!user) return unauthorized();

  const terms = await getUserFavoriteTerms(user.id);
  return NextResponse.json({ terms });
}

export async function PUT(request: Request) {
  if (!isAccountSyncEnabled()) return syncDisabled();
  const user = await readAuthUser();
  if (!user) return unauthorized();

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "terms の形式が不正です。" }, { status: 400 });
  }

  const rawTerms =
    (payload as { terms?: unknown }).terms ??
    (payload as { favoriteTerms?: unknown }).favoriteTerms;
  if (!Array.isArray(rawTerms)) {
    return NextResponse.json({ message: "terms の形式が不正です。" }, { status: 400 });
  }

  const normalized = sanitizeFavoriteTerms(rawTerms);
  const ok = await setUserFavoriteTerms(user.id, normalized);
  if (!ok) {
    return NextResponse.json({ message: "お気に入り保存に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ terms: normalized });
}
