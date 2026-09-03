import { describe, expect, it } from "vitest";
import { summarizeWorkbookAggregateRows } from "./territoryReportingData";

describe("workbook aggregate reporting", () => {
  it("keeps aggregate results separated by currency instead of combining amounts", () => {
    const rows = summarizeWorkbookAggregateRows([
      { label: "Raccoons", currencyCode: "CAD", workOrders: 3, invoiceValueRows: 3, invoicePreTaxAmount: 100 },
      { label: "Raccoons", currencyCode: "CAD", workOrders: 2, invoiceValueRows: 2, invoicePreTaxAmount: 50 },
      { label: "Raccoons", currencyCode: "USD", workOrders: 7, invoiceValueRows: 7, invoicePreTaxAmount: 700 },
    ]);

    expect(rows).toEqual([
      { label: "Raccoons", currencyCode: "CAD", workOrders: 5, invoiceValueRows: 5, invoicePreTaxAmount: 150 },
      { label: "Raccoons", currencyCode: "USD", workOrders: 7, invoiceValueRows: 7, invoicePreTaxAmount: 700 },
    ]);
  });
});
