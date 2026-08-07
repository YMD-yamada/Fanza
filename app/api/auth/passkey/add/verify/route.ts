import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  getRelyingPartyConfig,
  isChallengeExpired,
  toBase64Url,
  type StoredPasskey,
} from "@/lib/passkey";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import { addPasskeyToUser, consumeWebAuthnChallenge } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    response?: RegistrationResponseJSON;
  } | null;
  if (!body?.response) {
    return NextResponse.json({ message: "登録情報が不正です。" }, { status: 400 });
  }

  const challenge = await consumeWebAuthnChallenge({
    email: user.email,
    type: "registration",
  });
  if (!challenge || isChallengeExpired(challenge.expiresAt) || challenge.userId !== user.id) {
    return NextResponse.json({ message: "登録セッションが期限切れです。" }, { status: 400 });
  }

  const rp = getRelyingPartyConfig(request);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origins,
      expectedRPID: rp.rpID,
      requireUserVerification: false,
    });
  } catch (error) {
    console.error("[passkey/add/verify]", error);
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

  const ok = await addPasskeyToUser(user.id, passkey);
  if (!ok) {
    return NextResponse.json({ message: "パスキーの保存に失敗しました。" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "パスキーを追加しました。" });
}
