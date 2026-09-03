import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";

export type LocalAuthUser = {
  username: string;
  role: "admin" | "franchise";
  locationId?: string;
};

type LocalAuthAccount = LocalAuthUser & { password: string };

const accountSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
  role: z.enum(["admin", "franchise"]),
  locationId: z.string().trim().min(1).max(64).optional(),
}).superRefine((account, ctx) => {
  if (account.role === "franchise" && !account.locationId) {
    ctx.addIssue({ code: "custom", message: "Franchise accounts require a locationId." });
  }
  if (account.role === "admin" && account.locationId) {
    ctx.addIssue({ code: "custom", message: "Admin accounts must not carry a locationId." });
  }
});

const accountsSchema = z.array(accountSchema).min(1).max(100);
const MAX_FAILED_LOGINS = 5;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_RATE_LIMIT_KEYS = 1_000;
const failedLogins = new Map<string, number[]>();

function constantTimeMatch(expected: string, supplied: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");
  if (expectedBytes.length !== suppliedBytes.length) return false;
  return timingSafeEqual(expectedBytes, suppliedBytes);
}

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

export function parseLocalAuthAccounts(raw: string | undefined): LocalAuthAccount[] {
  if (!raw) throw new Error("Local authentication is not configured.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Local authentication configuration is invalid.");
  }

  const accounts = accountsSchema.parse(parsed).map((account) => ({
    ...account,
    username: account.username.toLowerCase(),
  }));
  const usernames = new Set<string>();
  for (const account of accounts) {
    if (usernames.has(account.username)) {
      throw new Error("Local authentication configuration has duplicate usernames.");
    }
    usernames.add(account.username);
  }
  return accounts;
}

export function authenticateLocalAccount(
  raw: string | undefined,
  username: string,
  password: string,
): LocalAuthUser | null {
  const normalizedUsername = username.trim().toLowerCase();
  const account = parseLocalAuthAccounts(raw).find((candidate) => candidate.username === normalizedUsername);
  if (!account) return null;
  if (!constantTimeMatch(account.password, password)) return null;
  return account.role === "admin"
    ? { username: account.username, role: "admin" }
    : { username: account.username, role: "franchise", locationId: account.locationId };
}

export const localAuthRouter = router({
  login: publicProcedure
    .input(z.object({
      username: z.string().trim().min(1).max(64),
      password: z.string().min(1).max(256),
    }))
    .mutation(({ input, ctx }) => {
      const key = loginAttemptKey(ctx.req?.ip, input.username);
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
        failedLogins.delete(key);
        return { success: true as const, user };
      } catch {
        return { success: false as const, reason: "unavailable" as const };
      }
    }),
});
