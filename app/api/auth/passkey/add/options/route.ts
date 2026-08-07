import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { challengeExpiresAt, getRelyingPartyConfig } from "@/lib/passkey";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { findUserByEmail, saveWebAuthnChallenge } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
  }

  const stored = await findUserByEmail(user.email);
  if (!stored) {
    return NextResponse.json({ message: "ユーザーが見つかりません。" }, { status: 404 });
  }

  const rp = getRelyingPartyConfig(request);
  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userName: user.email,
    userDisplayName: user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: stored.passkeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports,
    })),
  });

  await saveWebAuthnChallenge({
    challenge: options.challenge,
    type: "registration",
    email: user.email,
    userId: user.id,
    expiresAt: challengeExpiresAt(),
  });

  return NextResponse.json({ options });
}
