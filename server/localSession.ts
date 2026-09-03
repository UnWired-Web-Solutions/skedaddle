import { jwtVerify, SignJWT } from "jose";
import { parse as parseCookie } from "cookie";
import { findLocalAuthUser, type LocalAuthUser } from "./localAuthAccounts";

export const LOCAL_SESSION_COOKIE = "skedaddle_local_session";
export const LOCAL_SESSION_TTL_SECONDS = 8 * 60 * 60;

type LocalSessionClaims = { username: string };

function sessionKey(signingSecret: string): Uint8Array {
  if (Buffer.byteLength(signingSecret, "utf8") < 32) {
    throw new Error("Local session signing secret must be at least 32 characters.");
  }
  return new TextEncoder().encode(signingSecret);
}

export async function createLocalSessionToken(
  claims: LocalSessionClaims,
  signingSecret: string,
  ttlSeconds = LOCAL_SESSION_TTL_SECONDS,
  now = new Date(),
): Promise<string> {
  const username = claims.username.trim().toLowerCase();
  if (!username || ttlSeconds < 60 || ttlSeconds > 24 * 60 * 60) {
    throw new Error("Local session claims are invalid.");
  }
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(username)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttlSeconds)
    .sign(sessionKey(signingSecret));
}

export async function verifyLocalSessionToken(
  token: string | undefined,
  signingSecret: string,
  now = new Date(),
): Promise<LocalSessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(signingSecret), {
      algorithms: ["HS256"],
      currentDate: now,
    });
    if (typeof payload.sub !== "string" || !payload.sub.trim()) return null;
    return { username: payload.sub.trim().toLowerCase() };
  } catch {
    return null;
  }
}

export async function resolveLocalSessionUser(
  token: string | undefined,
  signingSecret: string,
  accountRegistry: string | undefined,
  now = new Date(),
): Promise<LocalAuthUser | null> {
  const claims = await verifyLocalSessionToken(token, signingSecret, now);
  if (!claims) return null;
  try {
    return findLocalAuthUser(accountRegistry, claims.username);
  } catch {
    return null;
  }
}

export function readLocalSessionCookie(cookieHeader: string | string[] | undefined): string | undefined {
  const header = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
  if (!header) return undefined;
  return parseCookie(header)[LOCAL_SESSION_COOKIE];
}
