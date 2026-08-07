import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, loginByEmailAndPassword } from "@/lib/auth";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { clearAllPasskeysForUser, getAuthMethodsByUserId } from "@/lib/userStore";

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
  if (!password) {
    return NextResponse.json(
      { message: "本人確認のため、現在のパスワードを入力してください。" },
      { status: 400 },
    );
  }

  const methods = await getAuthMethodsByUserId(user.id);
  if (!methods.hasPassword) {
    return NextResponse.json(
      {
        message:
          "先にパスワードを設定してください。パスワードがないとログイン手段がなくなります。",
        hasPassword: false,
        hasPasskey: methods.hasPasskey,
      },
      { status: 400 },
    );
  }

  if (!methods.hasPasskey) {
    return NextResponse.json(
      { message: "削除するパスキーはありません。", hasPassword: true, hasPasskey: false },
      { status: 400 },
    );
  }

  const verified = await loginByEmailAndPassword(user.email, password);
  if (!verified || verified.id !== user.id) {
    return NextResponse.json({ message: "パスワードが正しくありません。" }, { status: 401 });
  }

  const result = await clearAllPasskeysForUser(user.id);
  if (!result.ok) {
    return NextResponse.json(
      { message: "パスキーの削除に失敗しました。パスワードが設定されているか確認してください。" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    cleared: result.cleared,
    hasPassword: true,
    hasPasskey: false,
    message: "パスキーを削除しました。今後はパスワードでログインしてください。",
  });
}
