import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";

import { createUserSession, getCurrentUser } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/authShared";
import {
  getRelyingPartyConfig,
  isChallengeExpired,
  isValidEmail,
  toBase64Url,
  type StoredPasskey,
} from "@/lib/passkey";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { consumeWebAuthnChallenge, createPasskeyUser } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }
  if (await getCurrentUser()) {
    return NextResponse.json({ message: "すでにログインしています。" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    response?: RegistrationResponseJSON;
  } | null;
  const email = sanitizeEmail(body?.email);
  if (!email || !isValidEmail(email) || !body?.response) {
    return NextResponse.json({ message: "登録情報が不正です。" }, { status: 400 });
  }

  const challenge = await consumeWebAuthnChallenge({ email, type: "registration" });
  if (!challenge || isChallengeExpired(challenge.expiresAt)) {
    return NextResponse.json({ message: "登録セッションが期限切れです。もう一度お試しください。" }, { status: 400 });
  }

  const rp = getRelyingPartyConfig(request);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: false,
    });
  } catch {
    return NextResponse.json({ message: "パスキーの検証に失敗しました。" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ message: "パスキーの検証に失敗しました。" }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const passkey: StoredPasskey = {
    credentialId: credential.id,
    publicKey: toBase64Url(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    createdAt: new Date().toISOString(),
  };

  const created = await createPasskeyUser({
    id: challenge.userId,
    email,
    passkey,
  });
  if (!created.ok) {
    return NextResponse.json({ message: "このメールアドレスは既に登録されています。" }, { status: 409 });
  }

  await createUserSession(created.user.id);
  return NextResponse.json({
    ok: true,
    user: created.user,
    message: "パスキーでアカウントを作成しました。",
  });
}
