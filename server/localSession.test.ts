import { describe, expect, it } from "vitest";
import {
  createLocalSessionToken,
  resolveLocalSessionUser,
  verifyLocalSessionToken,
} from "./localSession";

const signingSecret = "test-local-session-secret-with-at-least-thirty-two-bytes";
const accounts = JSON.stringify([
  { username: "admin", password: "admin-test-password", role: "admin" },
  { username: "ottawa", password: "ottawa-test-password", role: "franchise", locationId: "ottawa" },
]);

describe("server-backed local sessions", () => {
  it("resolves a signed session to the current managed account without exposing a password", async () => {
    const token = await createLocalSessionToken({ username: "ottawa" }, signingSecret, 1_800, new Date("2026-09-03T12:00:00.000Z"));

    await expect(resolveLocalSessionUser(token, signingSecret, accounts, new Date("2026-09-03T12:05:00.000Z")))
      .resolves.toEqual({ username: "ottawa", role: "franchise", locationId: "ottawa" });
  });

  it("rejects tampered and expired session tokens", async () => {
    const now = new Date("2026-09-03T12:00:00.000Z");
    const validToken = await createLocalSessionToken({ username: "admin" }, signingSecret, 60, now);
    const expiredToken = await createLocalSessionToken({ username: "admin" }, signingSecret, 60, new Date("2026-09-03T10:00:00.000Z"));

    await expect(verifyLocalSessionToken(`${validToken}x`, signingSecret, now)).resolves.toBeNull();
    await expect(verifyLocalSessionToken(expiredToken, signingSecret, now)).resolves.toBeNull();
  });

  it("invalidates a signed session when the account is removed from the managed registry", async () => {
    const token = await createLocalSessionToken({ username: "ottawa" }, signingSecret, 1_800, new Date("2026-09-03T12:00:00.000Z"));
    const registryWithoutOttawa = JSON.stringify([
      { username: "admin", password: "admin-test-password", role: "admin" },
    ]);

    await expect(resolveLocalSessionUser(token, signingSecret, registryWithoutOttawa, new Date("2026-09-03T12:05:00.000Z")))
      .resolves.toBeNull();
  });
});
