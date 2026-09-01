import { describe, expect, it } from "vitest";
import { INITIAL_SALES_REPORT_WINDOW } from "../shared/reportingPeriod";
import { resolveGBPMonthlyMetricSources } from "./gbpMetricSourceResolver";
import { groupResolvedGBPForReporting } from "./territoryReportingData";

describe("GBP strategy-report aggregation", () => {
  it("uses canonical live metrics while retaining an independently sourced legacy metric", () => {
    const resolved = resolveGBPMonthlyMetricSources({
      persisted: [
        { year: 2026, month: 5, metricType: "CALL_CLICKS", value: 14, coverageStatus: "complete", locationsExpected: 2, locationsSucceeded: 2 },
        { year: 2026, month: 5, metricType: "WEBSITE_CLICKS", value: 21, coverageStatus: "complete", locationsExpected: 2, locationsSucceeded: 2 },
      ],
      legacy: [
        { year: 2026, month: 5, metricType: "calls", value: 10 },
        { year: 2026, month: 5, metricType: "website_clicks", value: 18 },
        { year: 2026, month: 5, metricType: "searches", value: 90 },
      ],
    });

    expect(groupResolvedGBPForReporting(resolved, INITIAL_SALES_REPORT_WINDOW)).toEqual([expect.objectContaining({
      month: "2026-05",
      calls: 14,
      website_clicks: 21,
      searches: 90,
      sources: ["persisted_business_profile_api", "legacy_spreadsheet"],
      incompleteMetrics: [],
    })]);
  });

  it("leaves partial and unavailable values null and marks the period incomplete", () => {
    const resolved = resolveGBPMonthlyMetricSources({
      persisted: [
        { year: 2026, month: 5, metricType: "CALL_CLICKS", value: 8, coverageStatus: "partial", locationsExpected: 2, locationsSucceeded: 1 },
        { year: 2026, month: 5, metricType: "WEBSITE_CLICKS", value: null, coverageStatus: "unavailable", locationsExpected: 2, locationsSucceeded: 2 },
      ],
      legacy: [],
    });

    expect(groupResolvedGBPForReporting(resolved, INITIAL_SALES_REPORT_WINDOW)).toEqual([expect.objectContaining({
      calls: null,
      website_clicks: null,
      sources: ["partial", "unavailable"],
      incompleteMetrics: ["calls", "website_clicks"],
    })]);
  });

  it("excludes rows outside the report contract", () => {
    const resolved = resolveGBPMonthlyMetricSources({
      persisted: [],
      legacy: [{ year: 2025, month: 6, metricType: "calls", value: 12 }],
    });
    expect(groupResolvedGBPForReporting(resolved, INITIAL_SALES_REPORT_WINDOW)).toEqual([]);
  });
});
