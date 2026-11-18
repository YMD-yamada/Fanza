import { randomBytes } from "node:crypto";

import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/authShared";
import {
  challengeExpiresAt,
  getRelyingPartyConfig,
  isValidEmail,
} from "@/lib/passkey";
import { isMailConfigured } from "@/lib/mailer";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { checkEmailCode, findUserByEmail, getAuthMethods, saveWebAuthnChallenge } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }

  try {
    if (await getCurrentUser()) {
      return NextResponse.json({ message: "すでにログインしています。" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
    const email = sanitizeEmail(body?.email);
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ message: "メールアドレス形式が正しくありません。" }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      const methods = await getAuthMethods(email);
      return NextResponse.json(
        {
          message:
            methods.hasPassword && !methods.hasPasskey
              ? "以前パスワードで登録したアカウントです。下の「以前パスワードで登録した方」から、1回だけパスキーへの切り替えをしてください。"
              : "このメールアドレスは登録済みです。「パスキーでログイン」を押してください。",
          legacyPassword: methods.hasPassword && !methods.hasPasskey,
          exists: true,
          hasPassword: methods.hasPassword,
          hasPasskey: methods.hasPasskey,
        },
        { status: 409 },
      );
    }

    // メール送信が設定済みなら、メールに届いた6桁のコードで本人のメールか確かめてから作る
    if (isMailConfigured()) {
      const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
      const checked = code.length === 6 ? await checkEmailCode(email, code) : "wrong";
      if (checked !== "ok") {
        const message =
          checked === "expired"
            ? "確認コードの期限が切れました。「コードを送り直す」を押してください。"
            : checked === "locked"
              ? "確認コードを何度もまちがえたため使えなくなりました。「コードを送り直す」を押してください。"
              : "確認コードが違います。メールに届いた6桁を入れてください。";
        return NextResponse.json({ message, codeError: checked }, { status: 400 });
      }
    }

    const rp = getRelyingPartyConfig(request);
    const userId = randomBytes(16).toString("hex");
    const options = await generateRegistrationOptions({
      rpName: rp.rpName,
      rpID: rp.rpID,
      userName: email,
      userDisplayName: email,
      userID: new TextEncoder().encode(userId),
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
      excludeCredentials: [],
    });

    await saveWebAuthnChallenge({
      challenge: options.challenge,
      type: "registration",
      email,
      userId,
      expiresAt: challengeExpiresAt(),
    });

    return NextResponse.json({ options });
  } catch (error) {
    console.error("[passkey/register/options]", error);
    return NextResponse.json(
      { message: "パスキー登録の準備に失敗しました。時間をおいてもう一度お試しください。" },
      { status: 500 },
    );
  }
}
