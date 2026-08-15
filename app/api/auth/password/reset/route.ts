import { NextRequest, NextResponse } from "next/server";

import { createPasswordHash, createUserSession } from "@/lib/auth";
import { readRememberMe, validateAuthCredentials } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { consumePasswordResetToken, findUserById, setUserPasswordHash } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    password?: unknown;
    remember?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token) {
    return NextResponse.json({ message: "再設定トークンが無効です。" }, { status: 400 });
  }

  const record = await consumePasswordResetToken(token);
  if (!record) {
    return NextResponse.json(
      { message: "再設定リンクの期限切れか、すでに使用済みです。" },
      { status: 400 },
    );
  }

  const validation = validateAuthCredentials(record.email, password);
  if (!validation.ok) {
    return NextResponse.json(
      { message: "パスワードは8文字以上で入力してください。" },
      { status: 400 },
    );
  }

  const ok = await setUserPasswordHash(record.userId, createPasswordHash(password));
  if (!ok) {
    return NextResponse.json({ message: "パスワードの保存に失敗しました。" }, { status: 500 });
  }

  const user = await findUserById(record.userId);
  if (!user) {
    return NextResponse.json({ message: "ユーザーが見つかりません。" }, { status: 404 });
  }

  await createUserSession(user.id, readRememberMe(body?.remember));
  return NextResponse.json({
    ok: true,
    user,
    message: "パスワードを再設定してログインしました。",
  });
}
