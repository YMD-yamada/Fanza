import { NextRequest, NextResponse } from "next/server";

import { createUserSession, loginByEmailAndPassword } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { getAuthMethods } from "@/lib/userStore";

/**
 * パスワードでのログインは廃止。
 * ここは「以前パスワードで登録した人が、パスキーへ切り替えるため」だけの入口。
 * - まだパスキーが1つも無いアカウントだけ受け付ける
 * - 入ったらすぐ画面側でパスキーを作らせ、作れた時点でパスワードは消える（passkey/add/verify）
 */
export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = sanitizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ message: "メールアドレスと以前のパスワードを入力してください。" }, { status: 400 });
  }

  const methods = await getAuthMethods(email);
  if (methods.exists && methods.hasPasskey) {
    return NextResponse.json(
      { message: "このアカウントはパスキーに切り替え済みです。「パスキーでログイン」を押してください。" },
      { status: 403 },
    );
  }

  const user = methods.hasPassword ? await loginByEmailAndPassword(email, password) : null;
  if (!user) {
    return NextResponse.json({ message: "メールアドレスか以前のパスワードが違います。" }, { status: 401 });
  }

  await createUserSession(user.id, true);
  return NextResponse.json({ ok: true, needsPasskey: true });
}
