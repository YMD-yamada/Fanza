import { createHash, randomBytes, scryptSync } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { SavedItem } from "@/lib/savedItem";
import { clampFavorites } from "@/lib/savedItem";

function resolveDataDir(): string {
  const override = process.env.FANZA_APP_DATA_DIR?.trim();
  if (override) return path.isAbsolute(override) ? override : path.join(process.cwd(), override);
  return path.join(process.cwd(), ".data");
}

const DATA_DIR = resolveDataDir();
const DATA_FILE = path.join(DATA_DIR, "users.json");

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  favorites: SavedItem[];
};

type StoredSession = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
};

type UserStoreShape = {
  users: StoredUser[];
  sessions: StoredSession[];
};

export type UserProfile = {
  id: string;
  email: string;
  createdAt: string;
};

const EMPTY_STORE: UserStoreShape = { users: [], sessions: [] };
let writeLock: Promise<void> = Promise.resolve();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toProfile(user: StoredUser): UserProfile {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_STORE, null, 2), "utf-8");
  }
}

async function readStore(): Promise<UserStoreShape> {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<UserStoreShape>;
    const users = Array.isArray(parsed.users) ? parsed.users : [];
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    return { users, sessions };
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStore(next: UserStoreShape) {
  await ensureDataFile();
  writeLock = writeLock.then(async () => {
    await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  });
  await writeLock;
}

function removeExpiredSessions(store: UserStoreShape) {
  const now = Date.now();
  store.sessions = store.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > now,
  );
}

export type CreateStoredUserResult =
  | { ok: true; user: UserProfile }
  | { ok: false; reason: "email_taken" };

export async function createStoredUser(
  email: string,
  passwordHash: string,
): Promise<CreateStoredUserResult> {
  const normalizedEmail = normalizeEmail(email);
  const store = await readStore();
  if (store.users.some((u) => u.email === normalizedEmail)) {
    return { ok: false, reason: "email_taken" };
  }

  const user: StoredUser = {
    id: randomBytes(16).toString("hex"),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
    favorites: [],
  };
  store.users.unshift(user);
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
  if (!user) return null;

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

export async function createStoredSession(
  token: string,
  userId: string,
  expiresAt: Date,
): Promise<void> {
  const store = await readStore();
  removeExpiredSessions(store);
  store.sessions = store.sessions.filter((session) => session.userId !== userId);
  store.sessions.push({
    tokenHash: hashToken(token),
    userId,
    expiresAt: expiresAt.toISOString(),
  });
  await writeStore(store);
}

export async function getSessionUserId(token: string): Promise<string | null> {
  const store = await readStore();
  removeExpiredSessions(store);
  const tokenHash = hashToken(token);
  const session = store.sessions.find((s) => s.tokenHash === tokenHash);
  await writeStore(store);
  return session?.userId ?? null;
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
