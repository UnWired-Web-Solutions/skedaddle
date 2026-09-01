import { describe, expect, it } from "vitest";
import { parseSalesforceWorkbookRows, SALESFORCE_WORKBOOK_HEADER } from "./salesforceWorkbookParser";

const row = (overrides: Partial<Record<number, unknown>> = {}) => {
  const values: unknown[] = [
    "08p-test-1",
    "Completed",
    "2026-08-14T12:00:00.000+0000",
    "2026-09-01T15:52:46.000+0000",
    "2026-08-01T10:00:00.000+0000",
    "private street",
    "Hamilton",
    "private postal",
    "Primary Assessment",
    "Hamilton",
    "Organic",
    "private staff",
    "Raccoons",
    "123.45",
  ];
  Object.entries(overrides).forEach(([index, value]) => { values[Number(index)] = value; });
  return values;
};

describe("Salesforce Drive workbook parser", () => {
  it("creates separate overall, status, species, and city aggregates without retaining sensitive fields", () => {
    const result = parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row()]);
    expect(result.rowsProcessed).toBe(1);
    expect(result.aggregates).toHaveLength(4);
    expect(result.aggregates.every(value => value.invoicePreTaxAmount === "123.45")).toBe(true);
    expect(JSON.stringify(result.aggregates)).not.toContain("private street");
    expect(JSON.stringify(result.aggregates)).not.toContain("private staff");
    expect(JSON.stringify(result.aggregates)).not.toContain("08p-test-1");
  });

  it("keeps review-required territories out of canonical aggregates", () => {
    const result = parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row({ 0: "08p-test-2", 9: "Victoria" })]);
    expect(result.aggregates).toEqual([]);
    expect(result.unknownTerritories).toEqual({ Victoria: 1 });
    expect(result.rowsRejected).toBe(1);
  });

  it("audits a blank territory as rejected without inventing a mapping", () => {
    const result = parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row({ 9: "" })]);
    expect(result.aggregates).toEqual([]);
    expect(result.unknownTerritories).toEqual({ "<blank>": 1 });
    expect(result.rowsRejected).toBe(1);
  });

  it("tracks unperiodized rows without inventing a date", () => {
    const result = parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row({ 2: "" })]);
    expect(result.unperiodizedRowCount).toBe(1);
    expect(result.aggregates).toEqual([]);
  });

  it("fails closed on changed headers, duplicate IDs, malformed dates, and malformed amounts", () => {
    expect(() => parseSalesforceWorkbookRows(["wrong"], [])).toThrow(/header changed/i);
    expect(() => parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row(), row()])).toThrow(/duplicate/i);
    expect(() => parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row({ 3: "not-a-date" })])).toThrow(/LastModifiedDate/i);
    expect(() => parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row({ 13: "not-money" })])).toThrow(/Invoice_pre_tax_amount/i);
    expect(() => parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row({ 9: "Neverland" })])).toThrow(/unrecognized territory/i);
  });

  it("records exact unknown statuses without treating them as completed", () => {
    const result = parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [row({ 1: "New Future Status" })]);
    expect(result.unknownStatuses).toEqual({ "New Future Status": 1 });
    expect(result.aggregates.some(value => value.statusLabel === "New Future Status")).toBe(true);
  });

  it("collapses labels that the database Unicode collation treats as equivalent", () => {
    const result = parseSalesforceWorkbookRows([...SALESFORCE_WORKBOOK_HEADER], [
      row({ 0: "08p-city-1", 6: "Montreal", 9: "Montreal" }),
      row({ 0: "08p-city-2", 6: "Montréal", 9: "Montreal" }),
    ]);
    const cityRows = result.aggregates.filter(value => value.cityLabel !== "__ALL__");
    expect(cityRows).toHaveLength(1);
    expect(cityRows[0]).toMatchObject({ cityLabel: "Montreal", recordCount: 2, invoicePreTaxAmount: "246.90" });
  });
});
