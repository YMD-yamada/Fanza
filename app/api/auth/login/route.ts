import { NextRequest, NextResponse } from "next/server";

import { createUserSession, loginByEmailAndPassword } from "@/lib/auth";
import { passkeyRecoveryFlags } from "@/lib/authRecovery";
import { readRememberMe, sanitizeEmail } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { getAuthMethods } from "@/lib/userStore";

function badRequest(message: string) {
  return NextResponse.json({ error: message, message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json(
      { error: "この公開環境ではアカウント同期は無効です。", message: "この公開環境ではアカウント同期は無効です。" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON body is required.");
  }

  const email = sanitizeEmail((body as { email?: unknown }).email);
  const password = String((body as { password?: unknown }).password ?? "");
  const persist = readRememberMe((body as { remember?: unknown }).remember);

  if (!email || !password) {
    return badRequest("email and password are required.");
  }

  const methods = await getAuthMethods(email);
  const user = await loginByEmailAndPassword(email, password);
  if (!user) {
    const flags = passkeyRecoveryFlags(methods);
    const message = flags.canClaimPassword
      ? "パスワードが未設定です。同じ画面のボタンで、今のパスワードを設定して入れます。"
      : flags.canPasskey
        ? "パスワードが未設定のアカウントです。この端末にパスキーが無いときは、メールでパスワードを設定してください。"
        : "メールアドレスまたはパスワードが正しくありません。";
    return NextResponse.json(
      {
        error: message,
        message,
        ...flags,
      },
      { status: 401 },
    );
  }

  await createUserSession(user.id, persist);
  const after = await getAuthMethods(user.email);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      hasPassword: after.hasPassword,
      hasPasskey: after.hasPasskey,
    },
  });
}
