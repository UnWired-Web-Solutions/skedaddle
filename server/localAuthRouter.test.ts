import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import {
  authenticateLocalAccount,
  localAuthRouter,
  parseLocalAuthAccounts,
  resetLoginRateLimitForTests,
} from "./localAuthRouter";
import { LOCAL_AUTH_COOKIE_NAME } from "./localAuthSession";

const testAccounts = JSON.stringify([
  { username: "admin", password: "test-admin-password", role: "admin" },
  { username: "sample-territory", password: "test-franchise-password", role: "franchise", locationId: "sample-territory" },
]);

describe("local server authentication", () => {
  const originalAccounts = ENV.localAuthAccountsJson;
  const originalSecret = ENV.localAuthSessionSecret;

  beforeEach(() => {
    ENV.localAuthAccountsJson = testAccounts;
    ENV.localAuthSessionSecret = "test-session-secret-with-at-least-32-characters";
    resetLoginRateLimitForTests();
  });

  afterEach(() => {
    ENV.localAuthAccountsJson = originalAccounts;
    ENV.localAuthSessionSecret = originalSecret;
  });

  function createContext() {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const ctx = {
      user: null,
      req: { ip: "127.0.0.1", protocol: "https", headers: {} },
      res: { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }) },
    } as unknown as TrpcContext;
    return { ctx, cookies };
  }

  it("creates an HTTP-only signed session without returning a password", async () => {
    const { ctx, cookies } = createContext();
    const caller = localAuthRouter.createCaller(ctx);
    const result = await caller.login({ username: "admin", password: "test-admin-password" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.user).not.toHaveProperty("password");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: LOCAL_AUTH_COOKIE_NAME,
      options: { httpOnly: true, sameSite: "lax", secure: true, path: "/" },
    });
    expect(cookies[0]!.value.length).toBeGreaterThan(40);
  });

  it("rate-limits repeated failures without revealing whether an account exists", async () => {
    const { ctx } = createContext();
    const caller = localAuthRouter.createCaller(ctx);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(caller.login({ username: "admin", password: "wrong-password" }))
        .resolves.toEqual({ success: false, reason: "invalid_credentials" });
    }
    await expect(caller.login({ username: "admin", password: "wrong-password" }))
      .resolves.toEqual({ success: false, reason: "rate_limited" });
  });

  it("returns only authorized user context and never a password", () => {
    expect(authenticateLocalAccount(testAccounts, "SAMPLE-TERRITORY", "test-franchise-password"))
      .toEqual({ username: "sample-territory", role: "franchise", locationId: "sample-territory" });
    expect(authenticateLocalAccount(testAccounts, "admin", "test-admin-password"))
      .toEqual({ username: "admin", role: "admin" });
  });

  it("rejects invalid credentials and malformed account configuration", () => {
    expect(authenticateLocalAccount(testAccounts, "sample-territory", "wrong-password")).toBeNull();
    expect(() => parseLocalAuthAccounts(JSON.stringify([
      { username: "duplicate", password: "one", role: "admin" },
      { username: "duplicate", password: "two", role: "admin" },
    ]))).toThrow(/duplicate usernames/i);
    expect(() => parseLocalAuthAccounts(JSON.stringify([
      { username: "missing-location", password: "password", role: "franchise" },
    ]))).toThrow(/locationId/i);
  });
});
