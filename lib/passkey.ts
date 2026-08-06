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
};

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function getRelyingPartyConfig(request: Request): RelyingPartyConfig {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && configured.length > 0) {
    const url = new URL(configured);
    return {
      rpID: url.hostname,
      rpName: "Fanza Search Navigator",
      origin: url.origin,
    };
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  return {
    rpID: new URL(origin).hostname,
    rpName: "Fanza Search Navigator",
    origin,
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

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
