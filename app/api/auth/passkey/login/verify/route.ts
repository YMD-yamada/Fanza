import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { NextRequest, NextResponse } from "next/server";

import { createUserSession, getCurrentUser } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/authShared";
import {
  fromBase64Url,
  getRelyingPartyConfig,
  isChallengeExpired,
} from "@/lib/passkey";
import { isAccountSyncEnabled } from "@/lib/runtimeConfig";
import {
  consumeWebAuthnChallenge,
  consumeWebAuthnChallengeByValue,
  findUserByPasskeyId,
  updatePasskeyCounter,
} from "@/lib/userStore";

export async function POST(request: NextRequest) {
  if (!isAccountSyncEnabled()) {
    return NextResponse.json({ message: "この環境ではアカウント同期は無効です。" }, { status: 404 });
  }
  if (await getCurrentUser()) {
    return NextResponse.json({ message: "すでにログインしています。" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    response?: AuthenticationResponseJSON;
    mode?: "email" | "discoverable";
    challenge?: string;
  } | null;

  if (!body?.response?.id) {
    return NextResponse.json({ message: "認証情報が不正です。" }, { status: 400 });
  }

  const mode = body.mode === "discoverable" ? "discoverable" : "email";
  const challenge =
    mode === "discoverable"
      ? await consumeWebAuthnChallengeByValue(
          typeof body.challenge === "string" ? body.challenge : "",
          "authentication",
        )
      : await consumeWebAuthnChallenge({
          email: sanitizeEmail(body.email),
          type: "authentication",
        });

  if (!challenge || isChallengeExpired(challenge.expiresAt)) {
    return NextResponse.json({ message: "認証セッションが期限切れです。もう一度お試しください。" }, { status: 400 });
  }

  const matched = await findUserByPasskeyId(body.response.id);
  if (!matched) {
    return NextResponse.json({ message: "パスキーが見つかりません。" }, { status: 401 });
  }

  if (mode === "email" && matched.email !== sanitizeEmail(body.email)) {
    return NextResponse.json({ message: "パスキーが見つかりません。" }, { status: 401 });
  }

  const rp = getRelyingPartyConfig(request);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: false,
      credential: {
        id: matched.passkey.credentialId,
        publicKey: fromBase64Url(matched.passkey.publicKey),
        counter: matched.passkey.counter,
        transports: matched.passkey.transports,
      },
    });
  } catch {
    return NextResponse.json({ message: "パスキーの検証に失敗しました。" }, { status: 401 });
  }

  if (!verification.verified) {
    return NextResponse.json({ message: "パスキーの検証に失敗しました。" }, { status: 401 });
  }

  await updatePasskeyCounter(
    matched.id,
    matched.passkey.credentialId,
    verification.authenticationInfo.newCounter,
  );
  await createUserSession(matched.id);

  return NextResponse.json({
    ok: true,
    user: {
      id: matched.id,
      email: matched.email,
      createdAt: matched.createdAt,
    },
    message: "パスキーでログインしました。",
  });
}
