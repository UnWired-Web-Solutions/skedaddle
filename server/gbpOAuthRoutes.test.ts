import { describe, expect, it } from "vitest";
import { createGBPOAuthState, verifyGBPOAuthState } from "./gbpOAuthRoutes";

describe("GBP OAuth state safeguards", () => {
  const signingSecret = "test-only-gbp-state-signing-secret";
  const now = 1_750_000_000_000;

  it("creates signed, short-lived state for the future operator flow", () => {
    const created = createGBPOAuthState(now, signingSecret);
    const verified = verifyGBPOAuthState(created.state, now + 1, signingSecret);
    expect(verified?.purpose).toBe("gbp_operator_authorization");
    expect(verified?.nonce).toBe(created.nonce);
    expect(verified?.expiresAt).toBe(created.expiresAt);
  });

  it("fails closed for tampered, expired, malformed, and wrong-secret state", () => {
    const created = createGBPOAuthState(now, signingSecret);
    expect(verifyGBPOAuthState(`${created.state}tampered`, now + 1, signingSecret)).toBeNull();
    expect(verifyGBPOAuthState(created.state, created.expiresAt, signingSecret)).toBeNull();
    expect(verifyGBPOAuthState("not-a-state", now + 1, signingSecret)).toBeNull();
    expect(verifyGBPOAuthState(created.state, now + 1, "different-test-secret")).toBeNull();
  });
});
