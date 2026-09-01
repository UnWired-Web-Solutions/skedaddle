import { describe, expect, it } from "vitest";
import {
  findSalesforceWorkbookTerritory,
  SALESFORCE_WORKBOOK_READY_TERRITORIES,
  SALESFORCE_WORKBOOK_TERRITORIES,
} from "./salesforceWorkbookMapping";

describe("Salesforce workbook territory mapping", () => {
  it("uses unique exact source labels and canonical ready territory IDs", () => {
    expect(new Set(SALESFORCE_WORKBOOK_TERRITORIES.map(row => row.sourceLabel)).size).toBe(
      SALESFORCE_WORKBOOK_TERRITORIES.length,
    );
    expect(new Set(SALESFORCE_WORKBOOK_READY_TERRITORIES.map(row => row.territoryId)).size).toBe(
      SALESFORCE_WORKBOOK_READY_TERRITORIES.length,
    );
    expect(SALESFORCE_WORKBOOK_READY_TERRITORIES).toHaveLength(18);
  });

  it("keeps Victoria review-required and Birmingham excluded", () => {
    expect(findSalesforceWorkbookTerritory("Victoria")).toMatchObject({ status: "review_required", territoryId: null });
    expect(findSalesforceWorkbookTerritory("Birmingham")).toMatchObject({ status: "excluded", territoryId: null });
  });

  it("does not guess unknown or differently-cased labels", () => {
    expect(findSalesforceWorkbookTerritory("victoria")).toBeNull();
    expect(findSalesforceWorkbookTerritory("Barrie")).toBeNull();
  });
});
