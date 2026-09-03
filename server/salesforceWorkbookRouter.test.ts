import { describe, expect, it } from "vitest";
import { parseWorkbookCountJson, salesforceWorkbookRouter } from "./salesforceWorkbookRouter";
import { latestTwelveCompletedMonths } from "../shared/reportingPeriod";

describe("Salesforce workbook router safety helpers", () => {
  it("returns only finite non-negative count values", () => {
    expect(parseWorkbookCountJson('{"Hamilton":3,"Bad":-1,"Text":"private"}')).toEqual({ Hamilton: 3 });
  });

  it("fails closed for malformed JSON", () => {
    expect(parseWorkbookCountJson("not-json")).toEqual({});
    expect(parseWorkbookCountJson(null)).toEqual({});
  });

  it("uses twelve fully completed UTC months and excludes the current partial month", () => {
    expect(latestTwelveCompletedMonths(new Date("2026-09-03T12:00:00.000Z"))).toMatchObject({
      start: { year: 2025, month: 9 },
      end: { year: 2026, month: 8 },
    });
    expect(latestTwelveCompletedMonths(new Date("2026-01-01T00:00:00.000Z"))).toMatchObject({
      start: { year: 2025, month: 1 },
      end: { year: 2025, month: 12 },
    });
  });

  it("exposes the aggregate-only network performance contract", () => {
    expect(salesforceWorkbookRouter._def.procedures.getNetworkPerformance).toBeDefined();
    expect(salesforceWorkbookRouter._def.procedures.getTerritoryCloseRate).toBeUndefined();
  });
});
