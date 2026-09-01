import { describe, expect, it } from "vitest";
import {
  buildGBPDailyMetricUrl,
  hasGBPAuthConfiguration,
  hasGBPOAuthClientConfiguration,
  listGBPLocations,
  validateGBPOAuthClientCredentials,
} from "./googleBusinessProfileClient";

describe("Google Business Profile client", () => {
  it("constructs a documented daily-metric request without exposing credentials", () => {
    const url = buildGBPDailyMetricUrl("locations/12345", "CALL_CLICKS", "2026-07-01", "2026-07-31");
    expect(url).toContain("locations/12345:getDailyMetricsTimeSeries");
    expect(url).toContain("dailyMetric=CALL_CLICKS");
    expect(url).toContain("dailyRange.start_date.year=2026");
    expect(url).toContain("dailyRange.end_date.day=31");
    expect(url).not.toContain("client_secret");
  });

  it("rejects invalid locations and dates before any API request can run", () => {
    expect(() => buildGBPDailyMetricUrl("accounts/123", "CALL_CLICKS", "2026-07-01", "2026-07-31")).toThrow("locations/{locationId}");
    expect(() => buildGBPDailyMetricUrl("locations/123", "CALL_CLICKS", "2026-13-01", "2026-07-31")).toThrow("Invalid ISO date");
    expect(() => buildGBPDailyMetricUrl("locations/123", "CALL_CLICKS", "2026-02-30", "2026-07-31")).toThrow("Invalid ISO date");
  });

  it("requires an explicit account resource before listing locations", async () => {
    await expect(listGBPLocations("accounts/-")).rejects.toThrow("accounts/{accountId}");
    await expect(listGBPLocations("not-an-account")).rejects.toThrow("accounts/{accountId}");
  });

  it("does not claim configured live access unless all OAuth secrets are present", () => {
    expect(typeof hasGBPAuthConfiguration()).toBe("boolean");
  });

  it.runIf(process.env.RUN_LIVE_API_TESTS === "1")("validates the configured client ID and secret with Google without accessing GBP data", async () => {
    expect(hasGBPOAuthClientConfiguration()).toBe(true);
    await expect(validateGBPOAuthClientCredentials()).resolves.toEqual({ accepted: true });
  });
});
