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
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ message: "メールアドレス形式が正しくありません。" }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ message: "このメールアドレスは既に登録されています。" }, { status: 409 });
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
      residentKey: "preferred",
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
}
