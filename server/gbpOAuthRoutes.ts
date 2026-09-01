import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";

const GBP_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type GBPOAuthStatePayload = {
  purpose: "gbp_operator_authorization";
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

function encodePayload(payload: GBPOAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signature(payload: string, signingSecret: string): string {
  return createHmac("sha256", signingSecret).update(payload).digest("base64url");
}

/** Creates a short-lived HMAC-signed state token for the future operator-only GBP flow. */
export function createGBPOAuthState(
  now = Date.now(),
  signingSecret = ENV.cookieSecret,
): { state: string; nonce: string; expiresAt: number } {
  if (!signingSecret) throw new Error("GBP OAuth state cannot be created without a server signing secret.");
  const nonce = randomUUID();
  const payload = encodePayload({
    purpose: "gbp_operator_authorization",
    nonce,
    issuedAt: now,
    expiresAt: now + GBP_OAUTH_STATE_TTL_MS,
  });
  return { state: `${payload}.${signature(payload, signingSecret)}`, nonce, expiresAt: now + GBP_OAUTH_STATE_TTL_MS };
}

/** Returns valid signed state or null. Malformed, tampered, wrong-purpose, and expired state all fail closed. */
export function verifyGBPOAuthState(
  state: string | undefined,
  now = Date.now(),
  signingSecret = ENV.cookieSecret,
): GBPOAuthStatePayload | null {
  if (!state || !signingSecret) return null;
  const [payload, actualSignature, ...extraParts] = state.split(".");
  if (!payload || !actualSignature || extraParts.length > 0) return null;
  const expectedSignature = signature(payload, signingSecret);
  const actual = Buffer.from(actualSignature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GBPOAuthStatePayload;
    if (
      decoded.purpose !== "gbp_operator_authorization" ||
      typeof decoded.nonce !== "string" ||
      !decoded.nonce ||
      !Number.isFinite(decoded.issuedAt) ||
      !Number.isFinite(decoded.expiresAt) ||
      decoded.expiresAt <= now ||
      decoded.expiresAt - decoded.issuedAt > GBP_OAUTH_STATE_TTL_MS
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

const GBP_OAUTH_DISABLED_MESSAGE =
  "GBP OAuth authorization is disabled pending approved Performance API access and an explicit operator authorization step.";

function disabledGBPOAuthRoute(_req: Request, res: Response) {
  // Do not read, log, or exchange an authorization code while the integration is disabled.
  res.status(503).json({ status: "disabled_pending_google_approval", error: GBP_OAUTH_DISABLED_MESSAGE });
}

/**
 * The callback matches the registered production URI but deliberately fails closed.
 * A future enablement must bind signed state to an operator-only server session before
 * redirecting to Google, verify it before code exchange, and persist a refresh token only
 * after Google approves the Performance API and a UWS operator gives explicit approval.
 */
export function registerGBPOAuthRoutes(app: Express) {
  app.get("/api/gbp/oauth/start", disabledGBPOAuthRoute);
  app.get("/api/gbp/oauth/callback", disabledGBPOAuthRoute);
}
