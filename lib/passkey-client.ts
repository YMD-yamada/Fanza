import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

const SAME_ORIGIN: RequestInit = { credentials: "same-origin" };

type Result = { ok: true } | { ok: false; error: string; legacyPassword?: boolean };

function errorName(error: unknown): string {
  return error && typeof error === "object" && "name" in error ? String(error.name) : "";
}

export function explainPasskeyFailure(error: unknown, kind: "login" | "create"): string {
  const name = errorName(error);
  if (kind === "create" && name === "InvalidStateError") {
    return "この端末には、もうこのアカウントのパスキーがあります。「パスキーでログイン」を押してください。";
  }
  if (name === "NotAllowedError" || name === "AbortError") {
    return kind === "login"
      ? "ログインを中止しました。この端末にパスキーが無いときは、パスキーを作った端末（スマホなど）で開くか、画面のQRコードをそのスマホで読み取ってください。"
      : "パスキーの作成を中止しました。もう一度お試しください。";
  }
  if (name === "NotSupportedError" || typeof window === "undefined" || !window.PublicKeyCredential) {
    return "このブラウザはパスキーに対応していません。最新の Chrome か Safari でお試しください。";
  }
  return kind === "login" ? "パスキーでログインできませんでした。" : "パスキーを作れませんでした。";
}

async function postJson<T>(path: string, body: unknown): Promise<{ ok: boolean; data: T | null }> {
  const response = await fetch(path, {
    method: "POST",
    ...SAME_ORIGIN,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, data };
}

type ApiMessage = { message?: string; error?: string };

function pickMessage(data: ApiMessage | null, fallback: string): string {
  return data?.error ?? data?.message ?? fallback;
}

/** メール入力なし。端末に保存されたパスキーを選ぶだけでログインする。 */
export async function authenticateWithPasskey(): Promise<Result> {
  const options = await postJson<ApiMessage & {
    options?: PublicKeyCredentialRequestOptionsJSON;
    mode?: "email" | "discoverable";
  }>("/api/auth/passkey/login/options", {});
  if (!options.ok || !options.data?.options) {
    return { ok: false, error: pickMessage(options.data, "ログインの準備に失敗しました。") };
  }

  let assertion: AuthenticationResponseJSON;
  try {
    assertion = await startAuthentication({ optionsJSON: options.data.options });
  } catch (error) {
    return { ok: false, error: explainPasskeyFailure(error, "login") };
  }

  const verify = await postJson<ApiMessage & { user?: unknown }>("/api/auth/passkey/login/verify", {
    response: assertion,
    mode: options.data.mode ?? "discoverable",
    challenge: options.data.options.challenge,
  });
  if (!verify.ok || !verify.data?.user) {
    return { ok: false, error: pickMessage(verify.data, "パスキーでログインできませんでした。") };
  }
  return { ok: true };
}

/** はじめての人：メールアドレスでアカウントを作り、この端末にパスキーを保存する。 */
export async function createAccountWithPasskey(email: string): Promise<Result> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: "メールアドレスを入力してください。" };

  const options = await postJson<ApiMessage & {
    options?: PublicKeyCredentialCreationOptionsJSON;
    legacyPassword?: boolean;
  }>("/api/auth/passkey/register/options", { email: trimmed });
  if (!options.ok || !options.data?.options) {
    return {
      ok: false,
      error: pickMessage(options.data, "パスキー作成の準備に失敗しました。"),
      legacyPassword: Boolean(options.data?.legacyPassword),
    };
  }

  let attestation: RegistrationResponseJSON;
  try {
    attestation = await startRegistration({ optionsJSON: options.data.options });
  } catch (error) {
    return { ok: false, error: explainPasskeyFailure(error, "create") };
  }

  const verify = await postJson<ApiMessage & { user?: unknown }>("/api/auth/passkey/register/verify", {
    email: trimmed,
    response: attestation,
  });
  if (!verify.ok || !verify.data?.user) {
    return { ok: false, error: pickMessage(verify.data, "パスキーを作れませんでした。") };
  }
  return { ok: true };
}

/** ログイン中の人：この端末（または別の端末）にパスキーを追加する。 */
export async function addPasskeyToAccount(): Promise<Result> {
  const options = await postJson<ApiMessage & { options?: PublicKeyCredentialCreationOptionsJSON }>(
    "/api/auth/passkey/add/options",
    {},
  );
  if (!options.ok || !options.data?.options) {
    return { ok: false, error: pickMessage(options.data, "パスキー追加の準備に失敗しました。") };
  }

  let attestation: RegistrationResponseJSON;
  try {
    attestation = await startRegistration({ optionsJSON: options.data.options });
  } catch (error) {
    return { ok: false, error: explainPasskeyFailure(error, "create") };
  }

  const verify = await postJson<ApiMessage>("/api/auth/passkey/add/verify", { response: attestation });
  if (!verify.ok) {
    return { ok: false, error: pickMessage(verify.data, "パスキーを追加できませんでした。") };
  }
  return { ok: true };
}
