import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

export type StoredPasskey = {
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType?: string;
  backedUp?: boolean;
  createdAt: string;
};

export type WebAuthnChallengeRecord = {
  challenge: string;
  type: "registration" | "authentication";
  email: string;
  userId: string;
  expiresAt: string;
};

export type RelyingPartyConfig = {
  rpID: string;
  rpName: string;
  origin: string;
  /** Origins accepted during verification (aliases / configured site URL). */
  origins: string[];
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function originFromHost(host: string, protoHint?: string | null): string {
  const proto =
    protoHint?.split(",")[0]?.trim() ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Prefer the request Host so browser origin and RP ID always match the URL the user opened.
 * Also accept NEXT_PUBLIC_SITE_URL as an alternate allowed origin during verification.
 */
export function getRelyingPartyConfig(request: Request): RelyingPartyConfig {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = request.headers.get("host");
  const host = forwardedHost || hostHeader || new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto");
  const requestOrigin = originFromHost(host, proto);

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const configuredOrigin =
    configured && configured.length > 0 ? new URL(configured).origin : null;

  const origins = Array.from(
    new Set([requestOrigin, configuredOrigin].filter((value): value is string => Boolean(value))),
  );

  return {
    rpID: new URL(requestOrigin).hostname,
    rpName: "Fanza Search Navigator",
    origin: requestOrigin,
    origins,
  };
}

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(value, "base64url");
  const copy = new Uint8Array(buf.length);
  copy.set(buf);
  return copy;
}

export function challengeExpiresAt(now = Date.now()): string {
  return new Date(now + CHALLENGE_TTL_MS).toISOString();
}

export function isChallengeExpired(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}

export { isValidEmail } from "@/lib/authShared";
