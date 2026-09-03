import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";
import { authenticateLocalAccount, parseLocalAuthAccounts } from "./localAuthAccounts";
import {
  createLocalSessionToken,
  LOCAL_SESSION_COOKIE,
  LOCAL_SESSION_TTL_SECONDS,
  readLocalSessionCookie,
  resolveLocalSessionUser,
} from "./localSession";

export { authenticateLocalAccount, parseLocalAuthAccounts } from "./localAuthAccounts";
export type { LocalAuthUser } from "./localAuthAccounts";

const MAX_FAILED_LOGINS = 5;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_RATE_LIMIT_KEYS = 1_000;
const failedLogins = new Map<string, number[]>();

function loginAttemptKey(ip: string | undefined, username: string): string {
  return `${ip || "unknown"}\u0000${username.trim().toLowerCase()}`;
}

function localSessionSigningSecret(): string {
  const secret = process.env.LOCAL_AUTH_SESSION_SECRET || ENV.localAuthSessionSecret;
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("Local session signing secret is unavailable.");
  }
  return secret;
}

export function isLoginRateLimited(key: string, now = Date.now()): boolean {
  const cutoff = now - FAILED_LOGIN_WINDOW_MS;
  const recent = (failedLogins.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  if (recent.length === 0) failedLogins.delete(key);
  else failedLogins.set(key, recent);
  return recent.length >= MAX_FAILED_LOGINS;
}

export function recordFailedLogin(key: string, now = Date.now()): void {
  if (!failedLogins.has(key) && failedLogins.size >= MAX_RATE_LIMIT_KEYS) {
    const oldestKey = failedLogins.keys().next().value;
    if (oldestKey) failedLogins.delete(oldestKey);
  }
  const cutoff = now - FAILED_LOGIN_WINDOW_MS;
  const recent = (failedLogins.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  recent.push(now);
  failedLogins.set(key, recent);
}

export function resetLoginRateLimitForTests(): void {
  failedLogins.clear();
}

export const localAuthRouter = router({
  login: publicProcedure
    .input(z.object({
      username: z.string().trim().min(1).max(64),
      password: z.string().min(1).max(256),
    }))
    .mutation(async ({ input, ctx }) => {
      const key = loginAttemptKey(ctx.req?.ip, input.username);
      if (isLoginRateLimited(key)) {
        return { success: false as const, reason: "rate_limited" as const };
      }
      try {
        const user = authenticateLocalAccount(ENV.localAuthAccountsJson, input.username, input.password);
        if (!user) {
          recordFailedLogin(key);
          return { success: false as const, reason: "invalid_credentials" as const };
        }

        const signingSecret = localSessionSigningSecret();
        const token = await createLocalSessionToken({ username: user.username }, signingSecret);
        ctx.res.cookie(LOCAL_SESSION_COOKIE, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: LOCAL_SESSION_TTL_SECONDS * 1000,
        });
        failedLogins.delete(key);
        return { success: true as const, user };
      } catch {
        return { success: false as const, reason: "unavailable" as const };
      }
    }),
  session: publicProcedure.query(async ({ ctx }) => {
    try {
      const user = await resolveLocalSessionUser(
        readLocalSessionCookie(ctx.req.headers.cookie),
        localSessionSigningSecret(),
        ENV.localAuthAccountsJson,
      );
      return { user } as const;
    } catch {
      return { user: null } as const;
    }
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(LOCAL_SESSION_COOKIE, {
      ...getSessionCookieOptions(ctx.req),
      maxAge: -1,
    });
    return { success: true } as const;
  }),
});
