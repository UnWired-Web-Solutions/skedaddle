import { describe, expect, it, vi } from "vitest";
import {
  readSalesforceWorkbook,
  readSalesforceWorkbookIncrementally,
  readSalesforceWorkbookDriveMetadata,
  SALESFORCE_WORKBOOK_TITLE,
} from "./googleSalesforceWorkbookClient";

describe("Google Salesforce workbook client", () => {
  it("reads metadata, header, and bounded data rows without requesting write access", async () => {
    const getMetadata = vi.fn().mockResolvedValue({
      data: {
        properties: { title: SALESFORCE_WORKBOOK_TITLE },
        sheets: [{ properties: { title: "Sheet1", gridProperties: { rowCount: 3 } } }],
      },
    });
    const batchGetValues = vi.fn().mockResolvedValue({
      data: {
        valueRanges: [
          { values: [["Id", "Status"]] },
          { values: [["id-1", "Completed"], ["id-2", "Scheduled"]] },
        ],
      },
    });
    const client = {
      spreadsheets: {
        get: getMetadata,
        values: { batchGet: batchGetValues },
      },
    } as never;

    const result = await readSalesforceWorkbook(client);
    expect(result.rows).toHaveLength(2);
    expect(batchGetValues).toHaveBeenCalledOnce();
    expect(batchGetValues.mock.calls[0]?.[0]).toMatchObject({ ranges: ["Sheet1!A1:N1", "Sheet1!A2:N3"] });
  });

  it("redacts upstream error details", async () => {
    const client = {
      spreadsheets: { get: vi.fn().mockRejectedValue({ code: 403, message: "private upstream detail" }) },
    } as never;
    await expect(readSalesforceWorkbook(client)).rejects.toThrow("Google Sheets workbook read failed (status 403)");
  });

  it("reads only the validated Drive version and modification time for the preflight", async () => {
    const client = {
      files: {
        get: vi.fn().mockResolvedValue({
          data: {
            id: "1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ",
            name: SALESFORCE_WORKBOOK_TITLE,
            mimeType: "application/vnd.google-apps.spreadsheet",
            version: "133",
            modifiedTime: "2026-09-01T15:57:16.966Z",
            trashed: false,
          },
        }),
      },
    } as never;
    await expect(readSalesforceWorkbookDriveMetadata(client)).resolves.toEqual({
      version: "133",
      modifiedTime: "2026-09-01T15:57:16.966Z",
    });
  });

  it("redacts Drive metadata failures", async () => {
    const client = { files: { get: vi.fn().mockRejectedValue({ code: 403, message: "private Drive detail" }) } } as never;
    await expect(readSalesforceWorkbookDriveMetadata(client)).rejects.toThrow("Google Drive workbook metadata read failed (status 403)");
  });

  it("processes each bounded range incrementally without retaining a raw workbook array", async () => {
    const header = ["Id", "Status", "SchedStartTime", "LastModifiedDate", "CreatedDate", "Street", "City", "PostalCode", "Work_Type__c", "Reporting_Primary_Territory__c", "Contact.Account.Lead_Source__c", "salesperson_new__c", "Species__c", "Invoice_pre_tax_amount__c"];
    const getMetadata = vi.fn().mockResolvedValue({
      data: { properties: { title: SALESFORCE_WORKBOOK_TITLE }, sheets: [{ properties: { title: "Sheet1", gridProperties: { rowCount: 2 } } }] },
    });
    const getValues = vi.fn()
      .mockResolvedValueOnce({ data: { values: [header] } })
      .mockResolvedValueOnce({ data: { values: [["id-1", "Completed", "2026-08-01T12:00:00.000+0000", "2026-09-01T12:00:00.000+0000", "", "private", "Hamilton", "private", "PA", "Hamilton", "Organic", "private", "Raccoons", "10.00"]] } });
    const client = { spreadsheets: { get: getMetadata, values: { get: getValues } } } as never;
    const parsed = await readSalesforceWorkbookIncrementally(client);
    expect(parsed).toMatchObject({ sourceRowCount: 1, rowsProcessed: 1 });
    expect(getValues.mock.calls[1]?.[0]).toMatchObject({ range: "Sheet1!A2:N2" });
  });
});
