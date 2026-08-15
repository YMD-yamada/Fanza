import { startAuthentication } from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

const SAME_ORIGIN: RequestInit = { credentials: "same-origin" };

export async function authenticateWithPasskey(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: "メールアドレスを入力してください。" };
  }

  const optionsRes = await fetch("/api/auth/passkey/login/options", {
    method: "POST",
    ...SAME_ORIGIN,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: trimmed }),
  });
  const optionsData = (await optionsRes.json().catch(() => null)) as {
    options?: PublicKeyCredentialRequestOptionsJSON;
    mode?: "email" | "discoverable";
    message?: string;
    error?: string;
  } | null;
  if (!optionsRes.ok || !optionsData?.options) {
    return {
      ok: false,
      error: optionsData?.error ?? optionsData?.message ?? "パスキー認証の準備に失敗しました。",
    };
  }

  let assertion: AuthenticationResponseJSON;
  try {
    assertion = await startAuthentication({ optionsJSON: optionsData.options });
  } catch {
    return { ok: false, error: "パスキー認証がキャンセルされたか失敗しました。" };
  }

  const verifyRes = await fetch("/api/auth/passkey/login/verify", {
    method: "POST",
    ...SAME_ORIGIN,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: trimmed,
      response: assertion,
      mode: optionsData.mode ?? "email",
      challenge: optionsData.options.challenge,
    }),
  });
  const verifyData = (await verifyRes.json().catch(() => null)) as {
    user?: unknown;
    message?: string;
    error?: string;
  } | null;
  if (!verifyRes.ok || !verifyData?.user) {
    return {
      ok: false,
      error: verifyData?.error ?? verifyData?.message ?? "パスキーログインに失敗しました。",
    };
  }
  return { ok: true };
}
