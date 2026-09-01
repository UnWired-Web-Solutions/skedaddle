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

  it("does not hide an attempted unavailable live metric behind a spreadsheet record", () => {
    const coverage = assessGBPPeriodCoverage({
      liveRows: 0,
      liveCoverageStatus: "unavailable",
      locationsExpected: 2,
      locationsSucceeded: 2,
      hasLegacyRecord: true,
    });
    expect(coverage.source).toBe("unavailable");
    expect(coverage.yoyEligible).toBe(false);
  });

  it("blocks YoY when two individually valid values came from different sources", () => {
    const live = assessGBPPeriodCoverage({
      liveRows: 1,
      liveCoverageStatus: "complete",
      locationsExpected: 1,
      locationsSucceeded: 1,
      hasLegacyRecord: true,
    });
    const legacy = assessGBPPeriodCoverage({ liveRows: 0, hasLegacyRecord: true });
    expect(isGBPYoYEligible(live, legacy)).toBe(false);
  });

  it("returns calendar-complete month boundaries and rejects invalid months", () => {
    expect(getCompleteCalendarMonthRange(2026, 2)).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
    expect(() => getCompleteCalendarMonthRange(2026, 13)).toThrow("valid calendar month");
  });
});
