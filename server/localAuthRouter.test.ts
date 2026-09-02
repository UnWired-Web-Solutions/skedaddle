import { describe, expect, it } from "vitest";
import { authenticateLocalAccount, localAuthRouter, parseLocalAuthAccounts } from "./localAuthRouter";

const testAccounts = JSON.stringify([
  { username: "admin", password: "test-admin-password", role: "admin" },
  { username: "sample-territory", password: "test-franchise-password", role: "franchise", locationId: "sample-territory" },
]);

describe("local server authentication", () => {
  it("validates the managed registry through the public login procedure without returning a password", async () => {
    const raw = process.env.LOCAL_AUTH_ACCOUNTS_JSON;
    expect(raw).toBeTruthy();
    const [account] = JSON.parse(raw!) as Array<{ username: string; password: string }>;
    const caller = localAuthRouter.createCaller({} as never);
    const result = await caller.login({ username: account!.username, password: account!.password });
    expect(result.success).toBe(true);
    if (result.success) expect(result.user).not.toHaveProperty("password");
  });

  it("returns only authorized user context and never a password", () => {
    expect(authenticateLocalAccount(testAccounts, "SAMPLE-TERRITORY", "test-franchise-password"))
      .toEqual({ username: "sample-territory", role: "franchise", locationId: "sample-territory" });
    expect(authenticateLocalAccount(testAccounts, "admin", "test-admin-password"))
      .toEqual({ username: "admin", role: "admin" });
  });

  it("supports a server-only administrator password rotation without changing franchise credentials", () => {
    expect(authenticateLocalAccount(testAccounts, "admin", "rotated-admin-password", "rotated-admin-password"))
      .toEqual({ username: "admin", role: "admin" });
    expect(authenticateLocalAccount(testAccounts, "admin", "test-admin-password", "rotated-admin-password"))
      .toBeNull();
    expect(authenticateLocalAccount(testAccounts, "sample-territory", "test-franchise-password", "rotated-admin-password"))
      .toEqual({ username: "sample-territory", role: "franchise", locationId: "sample-territory" });
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
