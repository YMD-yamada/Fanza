import { NextRequest, NextResponse } from "next/server";

import { isValidEmail, sanitizeEmail } from "@/lib/authShared";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { createPasswordResetToken, getAuthMethods } from "@/lib/userStore";

const GENERIC_MESSAGE =
  "入力されたメールアドレス宛に案内を送りました。届かない場合は迷惑メールも確認してください。";

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
    return NextResponse.json(
      { error: "この環境ではアカウント同期は無効です。", message: "この環境ではアカウント同期は無効です。" },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = sanitizeEmail(body?.email);
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "メールアドレス形式が正しくありません。", message: "メールアドレス形式が正しくありません。" },
      { status: 400 },
    );
  }

  const methods = await getAuthMethods(email);
  const created = methods.exists ? await createPasswordResetToken(email) : null;

  const builtResetUrl = created
    ? `${siteBase(request)}/reset-password?token=${created.token}`
    : null;
  const mailConfigured = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim());
  let emailed = false;
  if (builtResetUrl && mailConfigured) {
    emailed = await maybeSendResetEmail(email, builtResetUrl);
  }
  const resetUrl =
    builtResetUrl && process.env.AUTH_RETURN_RESET_URL === "1" ? builtResetUrl : undefined;

  let message = GENERIC_MESSAGE;
  if (!mailConfigured) {
    message =
      "再設定メールの送信設定がありません。パスキーが残っている端末から入るか、メール再設定を有効にしてください。";
  } else if (builtResetUrl && !emailed) {
    message = "案内メールの送信に失敗しました。時間をおいて再度お試しください。";
  }

  return NextResponse.json({
    ok: true,
    message,
    emailed,
    ...(resetUrl ? { resetUrl } : {}),
  });
}
