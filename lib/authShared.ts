export const SESSION_COOKIE_NAME = "fanza_session";

/** Chromium caps persistent cookies around 400 days. Default is stay signed in. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;
export const SESSION_TRANSIENT_AGE_SECONDS = 60 * 60 * 24;
export const SESSION_MAX_PER_USER = 8;

export function readRememberMe(value: unknown): boolean {
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return true;
}

export type UserSession = {
  id: string;
  email: string;
  createdAt: string;
};

export function sanitizeEmail(input: unknown): string {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
