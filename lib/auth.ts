import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { validateAuthCredentials } from "@/lib/authShared";
import {
  clearStoredSession,
  createStoredSession,
  getSessionUserId,
  findUserById,
  verifyUser,
} from "@/lib/userStore";
import { FAVORITES_LIMIT, FAVORITES_MAX_BYTES } from "@/lib/savedItem";

export const SESSION_COOKIE_NAME = "fanza_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const HASH_LENGTH = 64;

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = await getSessionUserId(token);
  if (!userId) return null;
  const user = await findUserById(userId);
  if (!user) return null;
  return user;
}

export async function createUserSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await createStoredSession(token, userId, expiresAt);
  await setSessionCookie(token);
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
