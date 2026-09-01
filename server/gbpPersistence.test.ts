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
    const plan = buildGBPPersistencePlan({ territoryId: "minneapolis", year: 2026, month: 8, snapshots });
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
    const plan = buildGBPPersistencePlan({ territoryId: "minneapolis", year: 2026, month: 8, snapshots });
    expect(plan.status).toBe("partial");
    expect(plan.failedLocations).toEqual([{ locationId: 12, metricType: "WEBSITE_CLICKS" }]);
    expect(plan.snapshots[0]?.coverageStatus).toBe("partial");
  });

  it("does not produce a monthly row or fabricated zero for an unavailable response", () => {
    const snapshots = buildGBPMonthlyMetricSnapshots({
      locationIds: [11], metricTypes: ["BUSINESS_DIRECTION_REQUESTS"], year: 2026, month: 8, now: fixedNow,
      results: [{ locationId: 11, metricType: "BUSINESS_DIRECTION_REQUESTS", success: true, rows: [] }],
    });
    const plan = buildGBPPersistencePlan({ territoryId: "minneapolis", year: 2026, month: 8, snapshots });
    expect(plan.status).toBe("partial");
    expect(plan.rawRows).toEqual([]);
    expect(plan.snapshots[0]?.value).toBeNull();
  });
});
