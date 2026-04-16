export const SESSION_COOKIE_NAME = "fanza_session";

export type UserSession = {
  id: string;
  email: string;
  createdAt: string;
};

type CredentialValidationResult =
  | { ok: true; email: string; password: string }
  | { ok: false; message: string; reason: "invalid_email" | "invalid_password" };

export function sanitizeEmail(input: unknown): string {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export function validateAuthCredentials(email: string, password: string): {
  ok: boolean;
  reason?: "invalid_email" | "invalid_password";
} {
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!validEmail) {
    return { ok: false, reason: "invalid_email" };
  }
  if (password.length < 8) {
    return { ok: false, reason: "invalid_password" };
  }
  return { ok: true };
}

export function validateAuthPayload(emailInput: unknown, passwordInput: unknown): CredentialValidationResult {
  const email = sanitizeEmail(emailInput);
  const password = typeof passwordInput === "string" ? passwordInput : "";
  const validation = validateAuthCredentials(email, password);

  if (!validation.ok) {
    if (validation.reason === "invalid_email") {
      return { ok: false, reason: "invalid_email", message: "メールアドレス形式が正しくありません。" };
    }
    return { ok: false, reason: "invalid_password", message: "パスワードは8文字以上で入力してください。" };
  }

  return { ok: true, email, password };
}
