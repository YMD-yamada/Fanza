import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/authShared";
import { isMailConfigured, sendCodeMail } from "@/lib/mailer";
import { isValidEmail } from "@/lib/passkey";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { findUserByEmail, issueEmailCode } from "@/lib/userStore";

/** はじめての方：メールに6桁の確認コードを送る。メール送信が未設定なら { enabled: false } を返す。 */
export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json({ enabled: false });
  }
  if (await getCurrentUser()) {
    return NextResponse.json({ message: "すでにログインしています。" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = sanitizeEmail(body?.email);
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ message: "メールアドレス形式が正しくありません。" }, { status: 400 });
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { message: "このメールアドレスは登録済みです。「パスキーでログイン」を押してください。" },
      { status: 409 },
    );
  }

  const issued = await issueEmailCode(email);
  if (!issued.ok) {
    return NextResponse.json(
      { message: "少し前に送ったばかりです。30秒ほど待ってからもう一度お試しください。" },
      { status: 429 },
    );
  }
  try {
    await sendCodeMail({ to: email, code: issued.code, appName: "Fanza Search Navigator" });
  } catch (error) {
    console.error("[email-code] send failed", error);
    return NextResponse.json({ message: "メールを送れませんでした。時間をおいてお試しください。" }, { status: 502 });
  }
  return NextResponse.json({ enabled: true, sent: true });
}
