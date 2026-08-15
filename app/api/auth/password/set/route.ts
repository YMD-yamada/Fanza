import { NextRequest, NextResponse } from "next/server";

import { createPasswordHash, getCurrentUser, loginByEmailAndPassword } from "@/lib/auth";
import { validateAuthCredentials } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { getAuthMethodsByUserId, setUserPasswordHash } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json(
      { error: "この環境ではアカウント同期は無効です。", message: "この環境ではアカウント同期は無効です。" },
      { status: 404 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "ログインが必要です。", message: "ログインが必要です。" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
    currentPassword?: unknown;
  } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const validation = validateAuthCredentials(user.email, password);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "パスワードは8文字以上で入力してください。", message: "パスワードは8文字以上で入力してください。" },
      { status: 400 },
    );
  }

  const methods = await getAuthMethodsByUserId(user.id);
  if (methods.hasPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        {
          error: "現在のパスワードを入力してください。",
          message: "現在のパスワードを入力してください。",
        },
        { status: 400 },
      );
    }
    const verified = await loginByEmailAndPassword(user.email, currentPassword);
    if (!verified || verified.id !== user.id) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません。", message: "現在のパスワードが正しくありません。" },
        { status: 401 },
      );
    }
  }

  const ok = await setUserPasswordHash(user.id, createPasswordHash(password));
  if (!ok) {
    return NextResponse.json(
      { error: "パスワードの保存に失敗しました。", message: "パスワードの保存に失敗しました。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "パスワードを設定しました。" });
}
