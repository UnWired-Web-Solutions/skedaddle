import { describe, expect, it } from "vitest";
import { latestTwelveCompletedMonths, parseWorkbookCountJson, salesforceWorkbookRouter } from "./salesforceWorkbookRouter";

describe("Salesforce workbook router safety helpers", () => {
  it("returns only finite non-negative count values", () => {
    expect(parseWorkbookCountJson('{"Hamilton":3,"Bad":-1,"Text":"private"}')).toEqual({ Hamilton: 3 });
  });

  it("fails closed for malformed JSON", () => {
    expect(parseWorkbookCountJson("not-json")).toEqual({});
    expect(parseWorkbookCountJson(null)).toEqual({});
  });

  it("exposes the aggregate-only network performance contract", () => {
    expect(salesforceWorkbookRouter._def.procedures.getNetworkPerformance).toBeDefined();
    expect(salesforceWorkbookRouter._def.procedures.getTerritoryCloseRate).toBeUndefined();
  });

  it("uses the latest twelve completed months and excludes the current month", () => {
    expect(latestTwelveCompletedMonths(new Date("2026-09-03T12:00:00Z"))).toEqual({
      start: { year: 2025, month: 9 },
      end: { year: 2026, month: 8 },
      label: "2025-09 through 2026-08",
    });
  });
});
