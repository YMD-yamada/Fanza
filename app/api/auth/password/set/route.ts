import { NextRequest, NextResponse } from "next/server";

import { createPasswordHash, getCurrentUser } from "@/lib/auth";
import { validateAuthCredentials } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { setUserPasswordHash } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const validation = validateAuthCredentials(user.email, password);
  if (!validation.ok) {
    return NextResponse.json(
      { message: "パスワードは8文字以上で入力してください。" },
      { status: 400 },
    );
  }

  const ok = await setUserPasswordHash(user.id, createPasswordHash(password));
  if (!ok) {
    return NextResponse.json({ message: "パスワードの保存に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "パスワードを設定しました。" });
}
