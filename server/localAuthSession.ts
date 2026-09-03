import type { CookieOptions, Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookie } from "cookie";
import { resolveLocalAuthUser, type LocalAuthUser } from "./localAuth";

export const LOCAL_AUTH_COOKIE_NAME = "skedaddle_local_session";
export const LOCAL_AUTH_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
const LOCAL_AUTH_ISSUER = "skedaddle-portal";
const LOCAL_AUTH_AUDIENCE = "skedaddle-local-session";

export type LocalSessionUser = LocalAuthUser & { authSource: "local" };

export function isLocalSessionUser(user: unknown): user is LocalSessionUser {
  return Boolean(user && typeof user === "object" && "authSource" in user && user.authSource === "local");
}

function sessionKey(secret: string): Uint8Array {
  if (secret.length < 32) {
    throw new Error("Local authentication session secret must be at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createLocalSessionToken(
  user: LocalAuthUser,
  secret: string,
  now = new Date(),
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ authSource: "local" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.username)
    .setIssuer(LOCAL_AUTH_ISSUER)
    .setAudience(LOCAL_AUTH_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + LOCAL_AUTH_SESSION_MAX_AGE_SECONDS)
    .sign(sessionKey(secret));
}

export async function verifyLocalSessionToken(
  token: string,
  accountsJson: string | undefined,
  secret: string,
  now = new Date(),
): Promise<LocalSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, sessionKey(secret), {
      algorithms: ["HS256"],
      issuer: LOCAL_AUTH_ISSUER,
      audience: LOCAL_AUTH_AUDIENCE,
      currentDate: now,
    });
    if (payload.authSource !== "local" || typeof payload.sub !== "string") return null;
    const user = resolveLocalAuthUser(accountsJson, payload.sub);
    return user ? { ...user, authSource: "local" } : null;
  } catch {
    return null;
  }
}

export function readLocalSessionToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  try {
    return parseCookie(header)[LOCAL_AUTH_COOKIE_NAME] ?? null;
  } catch {
    return null;
  }
}

function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const values = Array.isArray(forwardedProto)
    ? forwardedProto
    : typeof forwardedProto === "string" ? forwardedProto.split(",") : [];
  return values.some((value) => value.trim().toLowerCase() === "https");
}

export function getLocalSessionCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
    maxAge: LOCAL_AUTH_SESSION_MAX_AGE_SECONDS * 1000,
  };
}
