import { NextRequest, NextResponse } from "next/server";

import { sanitizeEmail } from "@/lib/authShared";
import { isValidEmail } from "@/lib/passkey";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { createPasswordResetToken, getAuthMethods } from "@/lib/userStore";

async function maybeSendResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "パスワード再設定 — Fanza Search",
        text: `パスワード再設定リンク（1時間有効）:\n${resetUrl}\n\n心当たりがない場合はこのメールを無視してください。`,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function siteBase(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = sanitizeEmail(body?.email);
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ message: "メールアドレス形式が正しくありません。" }, { status: 400 });
  }

  const methods = await getAuthMethods(email);
  const created = methods.exists ? await createPasswordResetToken(email) : null;

  const builtResetUrl = created
    ? `${siteBase(request)}/reset-password?token=${created.token}`
    : null;
  const emailed = builtResetUrl ? await maybeSendResetEmail(email, builtResetUrl) : false;
  const resetUrl =
    builtResetUrl && process.env.AUTH_RETURN_RESET_URL === "1" ? builtResetUrl : undefined;

  let message: string;
  if (emailed) {
    message = "再設定用のメールを送信しました。届かない場合は迷惑メールも確認してください。";
  } else if (resetUrl) {
    message = "再設定リンクを発行しました（AUTH_RETURN_RESET_URL）。";
  } else if (methods.hasPasskey) {
    message =
      "メール送信が未設定です。パスキーでログインしたあと、メニューから新しいパスワードを設定できます。";
  } else if (methods.exists && methods.hasPassword) {
    message =
      "メール送信（RESEND_API_KEY）が未設定のため、リンクを送れません。パスワードを思い出すか、運用側でメール再設定を有効にしてください。";
  } else if (methods.exists) {
    message = "このアカウントの再設定方法が見つかりません。";
  } else {
    message = "入力内容を受け付けました。登録がある場合は案内に従ってください。";
  }

  return NextResponse.json({
    ok: true,
    message,
    hasPasskey: methods.hasPasskey,
    hasPassword: methods.hasPassword,
    emailed,
    ...(resetUrl ? { resetUrl } : {}),
  });
}
