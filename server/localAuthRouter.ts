import { z } from "zod";
import { ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";
import { authenticateLocalAccount } from "./localAuth";
import {
  createLocalSessionToken,
  getLocalSessionCookieOptions,
  isLocalSessionUser,
  LOCAL_AUTH_COOKIE_NAME,
} from "./localAuthSession";

export { authenticateLocalAccount, parseLocalAuthAccounts } from "./localAuth";
export type { LocalAuthUser } from "./localAuth";

const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const MAX_RATE_LIMIT_KEYS = 10_000;
const failedLogins = new Map<string, number[]>();

function loginAttemptKey(ip: string | undefined, username: string): string {
  return `${ip || "unknown"}\u0000${username.trim().toLowerCase()}`;
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
      const key = loginAttemptKey(ctx.req.ip, input.username);
      if (isLoginRateLimited(key)) {
        return { success: false as const, reason: "rate_limited" as const };
      }
      try {
        const user = authenticateLocalAccount(
          ENV.localAuthAccountsJson,
          input.username,
          input.password,
        );
        if (!user) {
          recordFailedLogin(key);
          return { success: false as const, reason: "invalid_credentials" as const };
        }
        const token = await createLocalSessionToken(user, ENV.localAuthSessionSecret);
        ctx.res.cookie(LOCAL_AUTH_COOKIE_NAME, token, getLocalSessionCookieOptions(ctx.req));
        failedLogins.delete(key);
        return { success: true as const, user };
      } catch {
        return { success: false as const, reason: "unavailable" as const };
      }
    }),

  me: publicProcedure.query(({ ctx }) => (
    isLocalSessionUser(ctx.user)
      ? {
        username: ctx.user.username,
        role: ctx.user.role,
        ...(ctx.user.role === "franchise" ? { locationId: ctx.user.locationId } : {}),
      }
      : null
  )),
});
