import { describe, expect, it } from "vitest";
import { assessGBPPeriodCoverage, getCompleteCalendarMonthRange, isGBPYoYEligible } from "./gbpDataSafety";

describe("GBP data-safety rules", () => {
  it("uses persisted live data only when every expected mapped location succeeds", () => {
    const coverage = assessGBPPeriodCoverage({
      liveRows: 3,
      liveCoverageStatus: "complete",
      locationsExpected: 2,
      locationsSucceeded: 2,
      hasLegacyRecord: true,
    });
    expect(coverage.source).toBe("persisted_business_profile_api");
    expect(coverage.yoyEligible).toBe(true);
  });

  it("does not hide a partial live import behind legacy data or enable YoY", () => {
    const current = assessGBPPeriodCoverage({
      liveRows: 2,
      liveCoverageStatus: "partial",
      locationsExpected: 3,
      locationsSucceeded: 2,
      hasLegacyRecord: true,
    });
    const previous = assessGBPPeriodCoverage({
      liveRows: 0,
      hasLegacyRecord: true,
    });
    expect(current.source).toBe("partial");
    expect(current.yoyEligible).toBe(false);
    expect(isGBPYoYEligible(current, previous)).toBe(false);
  });

  it("labels a historical spreadsheet value honestly until live data has been attempted", () => {
    const coverage = assessGBPPeriodCoverage({ liveRows: 0, hasLegacyRecord: true });
    expect(coverage.source).toBe("legacy_spreadsheet");
    expect(coverage.complete).toBe(false);
  });

  it("returns calendar-complete month boundaries and rejects invalid months", () => {
    expect(getCompleteCalendarMonthRange(2026, 2)).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(() => getCompleteCalendarMonthRange(2026, 13)).toThrow("valid calendar month");
  });
});
