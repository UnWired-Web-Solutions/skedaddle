import { describe, expect, it } from "vitest";
import { buildGBPPersistencePlan } from "./gbpPersistence";
import { buildGBPMonthlyMetricSnapshots } from "./googleBusinessProfileImporter";

describe("GBP persistence planning", () => {
  const fixedNow = new Date("2026-09-01T12:00:00.000Z");

  it("persists only explicit raw API values and a complete aggregate", () => {
    const snapshots = buildGBPMonthlyMetricSnapshots({
      locationIds: [11, 12], metricTypes: ["CALL_CLICKS"], year: 2026, month: 8, now: fixedNow,
      results: [
        { locationId: 11, metricType: "CALL_CLICKS", success: true, rows: [{ date: "2026-08-02", value: 4 }] },
        { locationId: 12, metricType: "CALL_CLICKS", success: true, rows: [{ date: "2026-08-02", value: 3 }] },
      ],
    });
    const plan = buildGBPPersistencePlan({ territoryId: "minneapolis", year: 2026, month: 8, snapshots, now: fixedNow });
    expect(plan).toMatchObject({ status: "complete", locationsExpected: 2, locationsSucceeded: 2 });
    expect(plan.rawRows).toEqual([
      { gbpLocationId: 11, metricType: "CALL_CLICKS", metricDate: "2026-08-02", value: 4 },
      { gbpLocationId: 12, metricType: "CALL_CLICKS", metricDate: "2026-08-02", value: 3 },
    ]);
  });

  it("keeps a partial aggregate explicit and identifies failed locations", () => {
    const snapshots = buildGBPMonthlyMetricSnapshots({
      locationIds: [11, 12], metricTypes: ["WEBSITE_CLICKS"], year: 2026, month: 8, now: fixedNow,
      results: [
        { locationId: 11, metricType: "WEBSITE_CLICKS", success: true, rows: [{ date: "2026-08-01", value: 8 }] },
        { locationId: 12, metricType: "WEBSITE_CLICKS", success: false, rows: [] },
      ],
    });
    const plan = buildGBPPersistencePlan({ territoryId: "minneapolis", year: 2026, month: 8, snapshots, now: fixedNow });
    expect(plan.status).toBe("partial");
    expect(plan.failedLocations).toEqual([{ locationId: 12, metricType: "WEBSITE_CLICKS" }]);
    expect(plan.snapshots[0]?.coverageStatus).toBe("partial");
  });

  it("preserves an explicit unavailable metric without fabricating a zero", () => {
    const snapshots = buildGBPMonthlyMetricSnapshots({
      locationIds: [11], metricTypes: ["BUSINESS_DIRECTION_REQUESTS"], year: 2026, month: 8, now: fixedNow,
      results: [{ locationId: 11, metricType: "BUSINESS_DIRECTION_REQUESTS", success: true, rows: [] }],
    });
    const plan = buildGBPPersistencePlan({ territoryId: "minneapolis", year: 2026, month: 8, snapshots, now: fixedNow });
    expect(plan.status).toBe("partial");
    expect(plan.rawRows).toEqual([]);
    expect(plan.snapshots[0]?.value).toBeNull();
    expect(plan.snapshots[0]?.coverageStatus).toBe("unavailable");
  });

  it("rejects current or future months at the persistence boundary", () => {
    expect(() => buildGBPPersistencePlan({
      territoryId: "minneapolis",
      year: 2026,
      month: 9,
      now: fixedNow,
      snapshots: [{
        metricType: "CALL_CLICKS",
        value: null,
        coverageStatus: "unavailable",
        locationsExpected: 1,
        locationsSucceeded: 0,
        successfulLocationIds: [],
        sourceStartDate: "2026-09-01",
        sourceEndDate: "2026-09-30",
        rows: [],
        failedLocationIds: [11],
      }],
    })).toThrow("completed calendar months");
  });

  it("rejects contradictory unavailable and partial coverage snapshots", () => {
    const base = { territoryId: "minneapolis", year: 2026, month: 8, now: fixedNow };
    expect(() => buildGBPPersistencePlan({
      ...base,
      snapshots: [{
        metricType: "CALL_CLICKS",
        value: null,
        coverageStatus: "unavailable",
        locationsExpected: 1,
        locationsSucceeded: 1,
        successfulLocationIds: [11],
        sourceStartDate: "2026-08-01",
        sourceEndDate: "2026-08-31",
        rows: [],
        failedLocationIds: [],
      }],
    })).toThrow("zero usable locations");
    expect(() => buildGBPPersistencePlan({
      ...base,
      snapshots: [{
        metricType: "CALL_CLICKS",
        value: 4,
        coverageStatus: "partial",
        locationsExpected: 1,
        locationsSucceeded: 1,
        successfulLocationIds: [11],
        sourceStartDate: "2026-08-01",
        sourceEndDate: "2026-08-31",
        rows: [{ locationId: 11, date: "2026-08-02", value: 4 }],
        failedLocationIds: [],
      }],
    })).toThrow("at least one usable and at least one failed location");
  });
});
