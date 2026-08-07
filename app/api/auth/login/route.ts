import { NextRequest, NextResponse } from "next/server";

import {
  createUserSession,
  loginByEmailAndPassword,
} from "@/lib/auth";
import { sanitizeEmail } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { getAuthMethods } from "@/lib/userStore";

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json(
      { message: "この公開環境ではアカウント同期は無効です。" },
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

  if (!email || !password) {
    return badRequest("email and password are required.");
  }

  const methods = await getAuthMethods(email);
  const user = await loginByEmailAndPassword(email, password);
  if (!user) {
    let message = "メールアドレスまたはパスワードが正しくありません。";
    if (methods.exists && !methods.hasPassword && methods.hasPasskey) {
      message =
        "このアカウントはパスキー登録です。パスキーでログインするか、パスキー確認後にパスワードを設定してください。";
    } else if (methods.exists && methods.hasPassword) {
      message =
        "パスワードが正しくありません。「パスワードを忘れた」から再設定を試せます。";
    }
    return NextResponse.json(
      {
        message,
        exists: methods.exists,
        hasPassword: methods.hasPassword,
        hasPasskey: methods.hasPasskey,
      },
      { status: 401 },
    );
  }

  await createUserSession(user.id);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
}
