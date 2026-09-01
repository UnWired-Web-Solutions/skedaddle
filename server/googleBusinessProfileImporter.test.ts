import { describe, expect, it } from "vitest";
import { assertCompletedGBPMonth, buildGBPMonthlyMetricSnapshots } from "./googleBusinessProfileImporter";

describe("GBP monthly import safeguards", () => {
  const fixedNow = new Date("2026-09-01T12:00:00.000Z");

  it("persists a complete aggregate only when every mapped location succeeds", () => {
    const [snapshot] = buildGBPMonthlyMetricSnapshots({
      locationIds: [101, 102],
      metricTypes: ["CALL_CLICKS"],
      year: 2026,
      month: 8,
      now: fixedNow,
      results: [
        { locationId: 101, metricType: "CALL_CLICKS", success: true, rows: [{ date: "2026-08-03", value: 7 }] },
        { locationId: 102, metricType: "CALL_CLICKS", success: true, rows: [{ date: "2026-08-03", value: 4 }] },
      ],
    });
    expect(snapshot).toMatchObject({
      value: 11,
      coverageStatus: "complete",
      locationsExpected: 2,
      locationsSucceeded: 2,
      sourceStartDate: "2026-08-01",
      sourceEndDate: "2026-08-31",
    });
  });

  it("records a partial result and failed location rather than treating it as a total", () => {
    const [snapshot] = buildGBPMonthlyMetricSnapshots({
      locationIds: [101, 102],
      metricTypes: ["WEBSITE_CLICKS"],
      year: 2026,
      month: 8,
      now: fixedNow,
      results: [
        { locationId: 101, metricType: "WEBSITE_CLICKS", success: true, rows: [{ date: "2026-08-01", value: 9 }] },
        { locationId: 102, metricType: "WEBSITE_CLICKS", success: false, rows: [], error: "403" },
      ],
    });
    expect(snapshot.value).toBe(9);
    expect(snapshot.coverageStatus).toBe("partial");
    expect(snapshot.failedLocationIds).toEqual([102]);
  });

  it("does not manufacture zero when Google returns no raw daily values", () => {
    const [snapshot] = buildGBPMonthlyMetricSnapshots({
      locationIds: [101],
      metricTypes: ["BUSINESS_DIRECTION_REQUESTS"],
      year: 2026,
      month: 8,
      now: fixedNow,
      results: [{ locationId: 101, metricType: "BUSINESS_DIRECTION_REQUESTS", success: true, rows: [] }],
    });
    expect(snapshot.value).toBeNull();
    expect(snapshot.coverageStatus).toBe("unavailable");
  });

  it("blocks current or future periods", () => {
    expect(() => assertCompletedGBPMonth(2026, 9, fixedNow)).toThrow("completed calendar months");
    expect(() => assertCompletedGBPMonth(2026, 10, fixedNow)).toThrow("completed calendar months");
  });
});
