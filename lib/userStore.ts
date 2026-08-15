import { createHash, randomBytes, scryptSync } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { get, put } from "@vercel/blob";

import { SESSION_MAX_PER_USER } from "@/lib/authShared";
import {
  type FavoriteTerm,
  sanitizeFavoriteTerms,
} from "@/lib/favorite-terms";
import {
  type StoredPasskey,
  type WebAuthnChallengeRecord,
  isChallengeExpired,
} from "@/lib/passkey";
import type { SavedItem } from "@/lib/savedItem";
import { clampFavorites } from "@/lib/savedItem";

function resolveDataDir(): string {
  const override = process.env.FANZA_APP_DATA_DIR?.trim();
  if (override) return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
  return path.join(process.cwd(), ".data");
}

const DATA_DIR = resolveDataDir();
const DATA_FILE = path.join(DATA_DIR, "users.json");
const BLOB_PATH = "fanza/users.json";

type StoredUser = {
  id: string;
  email: string;
  /** Optional legacy password hash (`salt:hash`). Passkey-only accounts omit this. */
  passwordHash?: string;
  createdAt: string;
  favorites: SavedItem[];
  favoriteTerms: FavoriteTerm[];
  passkeys: StoredPasskey[];
};

type StoredSession = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  persist?: boolean;
};

type UserStoreShape = {
  users: StoredUser[];
  sessions: StoredSession[];
  webauthnChallenges: WebAuthnChallengeRecord[];
  passwordResetTokens: PasswordResetToken[];
};

type PasswordResetToken = {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  createdAt: string;
};

const EMPTY_STORE: UserStoreShape = {
  users: [],
  sessions: [],
  webauthnChallenges: [],
  passwordResetTokens: [],
};
let writeLock: Promise<void> = Promise.resolve();

function isBlobStoreEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toProfile(user: StoredUser): UserProfile {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

function sanitizePasskeys(input: unknown): StoredPasskey[] {
  if (!Array.isArray(input)) return [];
  const out: StoredPasskey[] = [];
  for (const value of input) {
    if (!value || typeof value !== "object") continue;
    const maybe = value as Partial<StoredPasskey>;
    if (typeof maybe.credentialId !== "string" || !maybe.credentialId) continue;
    if (typeof maybe.publicKey !== "string" || !maybe.publicKey) continue;
    out.push({
      credentialId: maybe.credentialId,
      publicKey: maybe.publicKey,
      counter: Number.isFinite(maybe.counter) ? Number(maybe.counter) : 0,
      ...(Array.isArray(maybe.transports) ? { transports: maybe.transports } : {}),
      ...(typeof maybe.deviceType === "string" ? { deviceType: maybe.deviceType } : {}),
      ...(typeof maybe.backedUp === "boolean" ? { backedUp: maybe.backedUp } : {}),
      createdAt:
        typeof maybe.createdAt === "string" ? maybe.createdAt : new Date().toISOString(),
    });
  }
  return out;
}

function normalizeStore(raw: Partial<UserStoreShape> | null | undefined): UserStoreShape {
  const users = Array.isArray(raw?.users)
    ? raw.users.map((user) => ({
        ...user,
        passwordHash:
          typeof user.passwordHash === "string" && user.passwordHash.length > 0
            ? user.passwordHash
            : undefined,
        favorites: Array.isArray(user.favorites) ? user.favorites : [],
        favoriteTerms: sanitizeFavoriteTerms(
          Array.isArray(user.favoriteTerms) ? user.favoriteTerms : [],
        ),
        passkeys: sanitizePasskeys(user.passkeys),
      }))
    : [];
  const sessions = Array.isArray(raw?.sessions)
    ? raw.sessions.filter(
        (item) =>
          item &&
          typeof item.tokenHash === "string" &&
          typeof item.userId === "string" &&
          typeof item.expiresAt === "string",
      )
    : [];
  const webauthnChallenges = Array.isArray(raw?.webauthnChallenges)
    ? raw.webauthnChallenges.filter(
        (item) =>
          item &&
          typeof item.challenge === "string" &&
          typeof item.email === "string" &&
          typeof item.userId === "string" &&
          typeof item.expiresAt === "string" &&
          (item.type === "registration" || item.type === "authentication"),
      )
    : [];
  const passwordResetTokens = Array.isArray(raw?.passwordResetTokens)
    ? raw.passwordResetTokens.filter(
        (item) =>
          item &&
          typeof item.tokenHash === "string" &&
          typeof item.userId === "string" &&
          typeof item.email === "string" &&
          typeof item.expiresAt === "string",
      )
    : [];
  return { users, sessions, webauthnChallenges, passwordResetTokens };
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_STORE, null, 2), "utf-8");
  }
}

async function readStoreFromFile(): Promise<UserStoreShape> {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return normalizeStore(JSON.parse(raw) as Partial<UserStoreShape>);
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStoreToFile(next: UserStoreShape) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
}

async function readStoreFromBlob(): Promise<UserStoreShape> {
  try {
    const result = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!result) return EMPTY_STORE;
    const text = await new Response(result.stream).text();
    if (!text.trim()) return EMPTY_STORE;
    return normalizeStore(JSON.parse(text) as Partial<UserStoreShape>);
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStoreToBlob(next: UserStoreShape) {
  await put(BLOB_PATH, JSON.stringify(next), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

async function readStore(): Promise<UserStoreShape> {
  return isBlobStoreEnabled() ? readStoreFromBlob() : readStoreFromFile();
}

async function writeStore(next: UserStoreShape) {
  writeLock = writeLock.then(async () => {
    if (isBlobStoreEnabled()) {
      await writeStoreToBlob(next);
    } else {
      await writeStoreToFile(next);
    }
  });
  await writeLock;
}

function removeExpiredSessions(store: UserStoreShape) {
  const now = Date.now();
  store.sessions = store.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > now,
  );
}

function pruneChallenges(store: UserStoreShape) {
  store.webauthnChallenges = store.webauthnChallenges.filter(
    (item) => !isChallengeExpired(item.expiresAt),
  );
}

export type CreateStoredUserResult =
  | { ok: true; user: UserProfile }
  | { ok: false; reason: "email_taken" };

export async function createStoredUser(
  email: string,
  passwordHash?: string,
  passkeys: StoredPasskey[] = [],
): Promise<CreateStoredUserResult> {
  const normalizedEmail = normalizeEmail(email);
  const store = await readStore();
  if (store.users.some((u) => u.email === normalizedEmail)) {
    return { ok: false, reason: "email_taken" };
  }

  const user: StoredUser = {
    id: randomBytes(16).toString("hex"),
    email: normalizedEmail,
    ...(passwordHash ? { passwordHash } : {}),
    createdAt: new Date().toISOString(),
    favorites: [],
    favoriteTerms: [],
    passkeys: sanitizePasskeys(passkeys),
  };
  store.users.unshift(user);
  await writeStore(store);
  return { ok: true, user: toProfile(user) };
}

export async function createPasskeyUser(params: {
  id: string;
  email: string;
  passkey: StoredPasskey;
}): Promise<CreateStoredUserResult> {
  const normalizedEmail = normalizeEmail(params.email);
  const store = await readStore();
  if (store.users.some((u) => u.email === normalizedEmail || u.id === params.id)) {
    return { ok: false, reason: "email_taken" };
  }

  const user: StoredUser = {
    id: params.id,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    favorites: [],
    favoriteTerms: [],
    passkeys: [params.passkey],
  };
  store.users.unshift(user);
  pruneChallenges(store);
  store.webauthnChallenges = store.webauthnChallenges.filter(
    (item) => item.email !== normalizedEmail,
  );
  await writeStore(store);
  return { ok: true, user: toProfile(user) };
}

export async function verifyUser(
  email: string,
  password: string,
): Promise<UserProfile | null> {
  const normalizedEmail = normalizeEmail(email);
  const store = await readStore();
  const user = store.users.find((u) => u.email === normalizedEmail);
  if (!user?.passwordHash) return null;

  const [salt, hashHex] = user.passwordHash.split(":");
  if (!salt || !hashHex) return null;

  const actualHash = scryptSync(password, salt, 64).toString("hex");
  return actualHash === hashHex ? toProfile(user) : null;
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const store = await readStore();
  return store.users.find((u) => u.email === normalizedEmail) ?? null;
}

export async function findUserById(userId: string): Promise<UserProfile | null> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  return user ? toProfile(user) : null;
}

export async function findUserByPasskeyId(
  credentialId: string,
): Promise<(StoredUser & { passkey: StoredPasskey }) | null> {
  const store = await readStore();
  for (const user of store.users) {
    const passkey = user.passkeys.find((item) => item.credentialId === credentialId);
    if (passkey) return { ...user, passkey };
  }
  return null;
}

export async function saveWebAuthnChallenge(record: WebAuthnChallengeRecord): Promise<void> {
  const store = await readStore();
  pruneChallenges(store);
  store.webauthnChallenges = store.webauthnChallenges.filter(
    (item) => !(item.email === record.email && item.type === record.type),
  );
  store.webauthnChallenges.push(record);
  await writeStore(store);
}

export async function consumeWebAuthnChallenge(params: {
  email: string;
  type: WebAuthnChallengeRecord["type"];
}): Promise<WebAuthnChallengeRecord | null> {
  const store = await readStore();
  pruneChallenges(store);
  const index = store.webauthnChallenges.findIndex(
    (item) => item.email === normalizeEmail(params.email) && item.type === params.type,
  );
  if (index < 0) {
    await writeStore(store);
    return null;
  }
  const [record] = store.webauthnChallenges.splice(index, 1);
  await writeStore(store);
  return record ?? null;
}

export async function consumeWebAuthnChallengeByValue(
  challenge: string,
  type: WebAuthnChallengeRecord["type"],
): Promise<WebAuthnChallengeRecord | null> {
  const store = await readStore();
  pruneChallenges(store);
  const index = store.webauthnChallenges.findIndex(
    (item) => item.challenge === challenge && item.type === type,
  );
  if (index < 0) {
    await writeStore(store);
    return null;
  }
  const [record] = store.webauthnChallenges.splice(index, 1);
  await writeStore(store);
  return record ?? null;
}

export async function addPasskeyToUser(
  userId: string,
  passkey: StoredPasskey,
): Promise<boolean> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return false;
  if (user.passkeys.some((item) => item.credentialId === passkey.credentialId)) {
    return true;
  }
  user.passkeys.push(passkey);
  await writeStore(store);
  return true;
}

export async function clearAllPasskeysForUser(
  userId: string,
): Promise<{ ok: boolean; cleared: number; hasPassword: boolean }> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { ok: false, cleared: 0, hasPassword: false };
  const hasPassword = Boolean(user.passwordHash);
  if (!hasPassword) {
    return { ok: false, cleared: 0, hasPassword: false };
  }
  const cleared = user.passkeys.length;
  user.passkeys = [];
  await writeStore(store);
  return { ok: true, cleared, hasPassword: true };
}

export async function updatePasskeyCounter(
  userId: string,
  credentialId: string,
  counter: number,
): Promise<boolean> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return false;
  const passkey = user.passkeys.find((item) => item.credentialId === credentialId);
  if (!passkey) return false;
  passkey.counter = counter;
  await writeStore(store);
  return true;
}

export type AuthMethods = {
  exists: boolean;
  hasPassword: boolean;
  hasPasskey: boolean;
};

export async function getAuthMethods(email: string): Promise<AuthMethods> {
  const user = await findUserByEmail(email);
  if (!user) return { exists: false, hasPassword: false, hasPasskey: false };
  return {
    exists: true,
    hasPassword: Boolean(user.passwordHash),
    hasPasskey: user.passkeys.length > 0,
  };
}

export async function getAuthMethodsByUserId(userId: string): Promise<AuthMethods> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { exists: false, hasPassword: false, hasPasskey: false };
  return {
    exists: true,
    hasPassword: Boolean(user.passwordHash),
    hasPasskey: user.passkeys.length > 0,
  };
}

export async function setUserPasswordHash(
  userId: string,
  passwordHash: string,
): Promise<boolean> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return false;
  user.passwordHash = passwordHash;
  await writeStore(store);
  return true;
}

export async function createPasswordResetToken(
  email: string,
): Promise<{ token: string; userId: string } | null> {
  const normalizedEmail = normalizeEmail(email);
  const store = await readStore();
  const user = store.users.find((u) => u.email === normalizedEmail);
  if (!user) return null;

  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  store.passwordResetTokens = store.passwordResetTokens.filter(
    (item) => item.email !== normalizedEmail && new Date(item.expiresAt).getTime() > now,
  );
  store.passwordResetTokens.push({
    tokenHash: hashToken(token),
    userId: user.id,
    email: normalizedEmail,
    expiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
  });
  await writeStore(store);
  return { token, userId: user.id };
}

export async function consumePasswordResetToken(
  token: string,
): Promise<{ userId: string; email: string } | null> {
  const store = await readStore();
  const now = Date.now();
  store.passwordResetTokens = store.passwordResetTokens.filter(
    (item) => new Date(item.expiresAt).getTime() > now,
  );
  const tokenHash = hashToken(token);
  const index = store.passwordResetTokens.findIndex((item) => item.tokenHash === tokenHash);
  if (index < 0) {
    await writeStore(store);
    return null;
  }
  const [record] = store.passwordResetTokens.splice(index, 1);
  await writeStore(store);
  return record ? { userId: record.userId, email: record.email } : null;
}

export async function createStoredSession(
  token: string,
  userId: string,
  expiresAt: Date,
  persist = true,
): Promise<void> {
  const store = await readStore();
  removeExpiredSessions(store);
  const others = store.sessions.filter((session) => session.userId !== userId);
  const mine = store.sessions
    .filter((session) => session.userId === userId)
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  const keptMine = mine.slice(Math.max(0, mine.length - (SESSION_MAX_PER_USER - 1)));
  store.sessions = [
    ...others,
    ...keptMine,
    {
      tokenHash: hashToken(token),
      userId,
      expiresAt: expiresAt.toISOString(),
      persist,
    },
  ];
  await writeStore(store);
}

export async function getSessionRecord(
  token: string,
): Promise<{ userId: string; persist: boolean; expiresAt: Date } | null> {
  const store = await readStore();
  const beforeCount = store.sessions.length;
  removeExpiredSessions(store);
  const tokenHash = hashToken(token);
  const session = store.sessions.find((s) => s.tokenHash === tokenHash);
  if (store.sessions.length !== beforeCount) {
    await writeStore(store);
  }
  if (!session) return null;
  return {
    userId: session.userId,
    persist: session.persist !== false,
    expiresAt: new Date(session.expiresAt),
  };
}

export async function getSessionUserId(token: string): Promise<string | null> {
  const record = await getSessionRecord(token);
  return record?.userId ?? null;
}

export async function extendStoredSession(token: string, expiresAt: Date): Promise<boolean> {
  const store = await readStore();
  removeExpiredSessions(store);
  const tokenHash = hashToken(token);
  const session = store.sessions.find((s) => s.tokenHash === tokenHash);
  if (!session) return false;
  session.expiresAt = expiresAt.toISOString();
  await writeStore(store);
  return true;
}

export async function clearStoredSession(token: string): Promise<void> {
  const store = await readStore();
  const tokenHash = hashToken(token);
  store.sessions = store.sessions.filter((session) => session.tokenHash !== tokenHash);
  await writeStore(store);
}

export async function getUserFavorites(userId: string): Promise<SavedItem[]> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  return user?.favorites ?? [];
}

export async function setUserFavorites(userId: string, favorites: SavedItem[]): Promise<boolean> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return false;
  user.favorites = clampFavorites(favorites);
  await writeStore(store);
  return true;
}

export async function getUserFavoriteTerms(userId: string): Promise<FavoriteTerm[]> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  return sanitizeFavoriteTerms(user?.favoriteTerms ?? []);
}

export async function setUserFavoriteTerms(
  userId: string,
  terms: FavoriteTerm[],
): Promise<boolean> {
  const store = await readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return false;
  user.favoriteTerms = sanitizeFavoriteTerms(terms);
  await writeStore(store);
  return true;
}
