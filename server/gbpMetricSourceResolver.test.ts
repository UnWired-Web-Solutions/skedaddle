import { describe, expect, it } from "vitest";
import { resolveGBPMonthlyMetricSources } from "./gbpMetricSourceResolver";

describe("GBP monthly source precedence", () => {
  const legacy = [{ year: 2026, month: 8, metricType: "calls", value: 12 }];

  it("uses a complete persisted API row ahead of a legacy spreadsheet record", () => {
    const [resolved] = resolveGBPMonthlyMetricSources({
      legacy,
      persisted: [{ year: 2026, month: 8, metricType: "calls", value: 14, coverageStatus: "complete", locationsExpected: 2, locationsSucceeded: 2 }],
    });
    expect(resolved).toMatchObject({ value: 14, source: "persisted_business_profile_api" });
  });

  it("keeps partial API data visible rather than silently using legacy values", () => {
    const [resolved] = resolveGBPMonthlyMetricSources({
      legacy,
      persisted: [{ year: 2026, month: 8, metricType: "calls", value: 9, coverageStatus: "partial", locationsExpected: 2, locationsSucceeded: 1 }],
    });
    expect(resolved).toMatchObject({ value: 9, source: "partial" });
    expect(resolved.coverage.yoyEligible).toBe(false);
  });

  it("exposes a null unavailable result rather than an invented zero or legacy fallback", () => {
    const [resolved] = resolveGBPMonthlyMetricSources({
      legacy,
      persisted: [{ year: 2026, month: 8, metricType: "calls", value: null, coverageStatus: "unavailable", locationsExpected: 2, locationsSucceeded: 2 }],
    });
    expect(resolved).toMatchObject({ value: null, source: "unavailable" });
  });

  it("uses the legacy record only when no persisted live result exists", () => {
    const [resolved] = resolveGBPMonthlyMetricSources({ legacy, persisted: [] });
    expect(resolved).toMatchObject({ value: 12, source: "legacy_spreadsheet" });
  });
});
