import { NextRequest, NextResponse } from "next/server";

import { createPasswordHash, createUserSession, getCurrentUser } from "@/lib/auth";
import { passkeyRecoveryFlags } from "@/lib/authRecovery";
import { validateAuthPayload } from "@/lib/authShared";
import { isAccountSyncEnabled, isPasswordResetEmailConfigured } from "@/lib/runtimeConfig";
import { findUserByEmail, getAuthMethods, setUserPasswordHash } from "@/lib/userStore";

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, message, ...extra }, { status });
}

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return jsonError("この環境ではアカウント同期は無効です。", 404);
  }
  if (await getCurrentUser()) {
    return jsonError("すでにログインしています。", 400);
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;
  const validation = validateAuthPayload(body?.email, body?.password);
  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  const methods = await getAuthMethods(validation.email);
  const flags = passkeyRecoveryFlags(methods);
  if (!methods.exists) {
    return jsonError("メールアドレスまたはパスワードが正しくありません。", 401);
  }
  if (methods.hasPassword) {
    return jsonError("すでにパスワードがあります。ログインしてください。", 400);
  }
  if (!flags.canPasskey) {
    return jsonError("この操作はパスキーのみの口座向けです。", 400);
  }
  if (isPasswordResetEmailConfigured()) {
    return jsonError("メールでパスワードを設定してください。", 403, flags);
  }

  const user = await findUserByEmail(validation.email);
  if (!user) {
    return jsonError("メールアドレスまたはパスワードが正しくありません。", 401);
  }

  const saved = await setUserPasswordHash(user.id, createPasswordHash(validation.password));
  if (!saved) {
    return jsonError("パスワードの保存に失敗しました。", 500);
  }

  await createUserSession(user.id);
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      hasPassword: true,
      hasPasskey: user.passkeys.length > 0,
    },
    message: "パスワードを設定してログインしました。",
  });
}