import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/authShared";
import {
  challengeExpiresAt,
  getRelyingPartyConfig,
  isValidEmail,
} from "@/lib/passkey";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { findUserByEmail, saveWebAuthnChallenge } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }
  if (await getCurrentUser()) {
    return NextResponse.json({ message: "すでにログインしています。" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = sanitizeEmail(body?.email);
  const rp = getRelyingPartyConfig(request);

  // Discoverable / conditional login without email
  if (!email) {
    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      userVerification: "preferred",
      allowCredentials: [],
    });
    await saveWebAuthnChallenge({
      challenge: options.challenge,
      type: "authentication",
      email: "__discoverable__",
      userId: "",
      expiresAt: challengeExpiresAt(),
    });
    return NextResponse.json({ options, mode: "discoverable" });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "メールアドレス形式が正しくありません。" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user || user.passkeys.length === 0) {
    return NextResponse.json(
      { message: "このメールのパスキーが見つかりません。新規作成するか、別の端末のパスキーを使ってください。" },
      { status: 404 },
    );
  }

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: "preferred",
    allowCredentials: user.passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports?.length
        ? passkey.transports
        : ["internal", "hybrid", "usb"],
    })),
  });

  await saveWebAuthnChallenge({
    challenge: options.challenge,
    type: "authentication",
    email,
    userId: user.id,
    expiresAt: challengeExpiresAt(),
  });

  return NextResponse.json({ options, mode: "email" });
}
