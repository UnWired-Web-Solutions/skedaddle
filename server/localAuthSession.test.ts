import { describe, expect, it } from "vitest";
import {
  createLocalSessionToken,
  LOCAL_AUTH_SESSION_MAX_AGE_SECONDS,
  verifyLocalSessionToken,
} from "./localAuthSession";

const accounts = JSON.stringify([
  { username: "admin", password: "admin-password", role: "admin" },
  { username: "hamilton-owner", password: "owner-password", role: "franchise", locationId: "hamilton" },
]);
const secret = "test-session-secret-with-at-least-32-characters";
const issuedAt = new Date("2026-09-03T12:00:00Z");

describe("local authentication sessions", () => {
  it("verifies a signed session against the current server-side account registry", async () => {
    const token = await createLocalSessionToken(
      { username: "hamilton-owner", role: "franchise", locationId: "hamilton" },
      secret,
      issuedAt,
    );
    await expect(verifyLocalSessionToken(token, accounts, secret, issuedAt)).resolves.toEqual({
      username: "hamilton-owner",
      role: "franchise",
      locationId: "hamilton",
      authSource: "local",
    });
  });

  it("rejects tampered, expired, and removed-account sessions", async () => {
    const token = await createLocalSessionToken({ username: "admin", role: "admin" }, secret, issuedAt);
    await expect(verifyLocalSessionToken(`${token}tampered`, accounts, secret, issuedAt)).resolves.toBeNull();
    const expiredAt = new Date(issuedAt.getTime() + (LOCAL_AUTH_SESSION_MAX_AGE_SECONDS + 1) * 1000);
    await expect(verifyLocalSessionToken(token, accounts, secret, expiredAt)).resolves.toBeNull();
    await expect(verifyLocalSessionToken(token, JSON.stringify([
      { username: "someone-else", password: "password", role: "admin" },
    ]), secret, issuedAt)).resolves.toBeNull();
  });

  it("refuses a weak signing secret", async () => {
    await expect(createLocalSessionToken({ username: "admin", role: "admin" }, "too-short", issuedAt))
      .rejects.toThrow(/at least 32 characters/i);
  });
});
