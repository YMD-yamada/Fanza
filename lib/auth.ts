import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_TRANSIENT_AGE_SECONDS,
  validateAuthCredentials,
} from "@/lib/authShared";
import {
  type AuthMethods,
  clearStoredSession,
  createStoredSession,
  extendStoredSession,
  getSessionSnapshot,
  verifyUser,
} from "@/lib/userStore";
import { FAVORITES_LIMIT, FAVORITES_MAX_BYTES } from "@/lib/savedItem";

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
const HASH_LENGTH = 64;
const SESSION_TOUCH_AFTER_SECONDS = SESSION_MAX_AGE_SECONDS / 2;

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function setSessionCookie(token: string, persist = true) {
  const cookieStore = await cookies();
  const maxAge = persist ? SESSION_MAX_AGE_SECONDS : undefined;
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge
      ? { maxAge, expires: new Date(Date.now() + maxAge * 1000) }
      : {}),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  return (await readCurrentSession())?.user ?? null;
}

async function readCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const snapshot = await getSessionSnapshot(token);
  return snapshot ? { token, ...snapshot } : null;
}

/** Refresh a persistent cookie so returning visitors stay signed in. */
export async function touchCurrentSession() {
  return (await touchCurrentSessionWithAuthMethods())?.user ?? null;
}

export async function touchCurrentSessionWithAuthMethods(): Promise<
  { user: AuthUser; methods: AuthMethods } | null
> {
  const session = await readCurrentSession();
  if (!session) return null;
  if (session.persist) {
    const remainingMs = session.expiresAt.getTime() - Date.now();
    if (remainingMs < SESSION_TOUCH_AFTER_SECONDS * 1000) {
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
      await extendStoredSession(session.token, expiresAt);
      await setSessionCookie(session.token, true);
    }
  }
  return { user: session.user, methods: session.methods };
}

export async function createUserSession(userId: string, persist = true) {
  const token = createSessionToken();
  const maxAge = persist ? SESSION_MAX_AGE_SECONDS : SESSION_TRANSIENT_AGE_SECONDS;
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  await createStoredSession(token, userId, expiresAt, persist);
  await setSessionCookie(token, persist);
}

export async function loginByEmailAndPassword(email: string, password: string) {
  const user = await verifyUser(email, password);
  return user;
}

export function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, HASH_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) return false;

  const expectedHash = Buffer.from(hashHex, "hex");
  const actualHash = scryptSync(password, salt, HASH_LENGTH);
  if (expectedHash.length !== actualHash.length) return false;
  return timingSafeEqual(expectedHash, actualHash);
}

export function assertValidCredentials(email: string, password: string): {
  ok: boolean;
  reason?: "invalid_email" | "invalid_password";
} {
  const result = validateAuthCredentials(email, password);
  return result.ok ? { ok: true } : result;
}

export async function logoutCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await clearStoredSession(token);
  }
  await clearSessionCookie();
}

export function getFavoritesCapacity() {
  return {
    maxItems: FAVORITES_LIMIT,
    maxBytes: FAVORITES_MAX_BYTES,
  };
}
