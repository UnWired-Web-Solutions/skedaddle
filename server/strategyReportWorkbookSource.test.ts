import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "strategyReportRouter.ts"), "utf8");

describe("Strategy Report workbook source contract", () => {
  it("loads active Drive-workbook aggregates as the primary matched-period sales source", () => {
    expect(source).toContain("loadTerritoryWorkbookAggregate");
    expect(source).toContain('kind: "active_drive_workbook_aggregate"');
    expect(source).toContain("recorded pre-tax invoice value");
    expect(source).toContain("work orders");
  });

  it("keeps the legacy dashboard snapshot only as an explicitly qualified fallback", () => {
    expect(source).toContain("!workbookAggregate && !dashData");
    expect(source).toContain("not current Drive-workbook evidence");
    expect(source).toContain("conversion metrics unavailable");
  });
});
