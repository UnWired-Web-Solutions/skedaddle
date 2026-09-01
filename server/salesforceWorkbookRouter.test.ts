import { describe, expect, it } from "vitest";
import { parseWorkbookCountJson, salesforceWorkbookRouter } from "./salesforceWorkbookRouter";

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
});
