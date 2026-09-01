import { describe, expect, it, vi } from "vitest";
import { readSalesforceWorkbook, SALESFORCE_WORKBOOK_TITLE } from "./googleSalesforceWorkbookClient";

describe("Google Salesforce workbook client", () => {
  it("reads metadata, header, and bounded data rows without requesting write access", async () => {
    const getMetadata = vi.fn().mockResolvedValue({
      data: {
        properties: { title: SALESFORCE_WORKBOOK_TITLE },
        sheets: [{ properties: { title: "Sheet1", gridProperties: { rowCount: 3 } } }],
      },
    });
    const getValues = vi.fn()
      .mockResolvedValueOnce({ data: { values: [["Id", "Status"]] } })
      .mockResolvedValueOnce({ data: { values: [["id-1", "Completed"], ["id-2", "Scheduled"]] } });
    const client = {
      spreadsheets: {
        get: getMetadata,
        values: { get: getValues },
      },
    } as never;

    const result = await readSalesforceWorkbook(client);
    expect(result.rows).toHaveLength(2);
    expect(getValues).toHaveBeenCalledTimes(2);
    expect(getValues.mock.calls[1]?.[0]).toMatchObject({ range: "Sheet1!A2:N3" });
  });

  it("redacts upstream error details", async () => {
    const client = {
      spreadsheets: { get: vi.fn().mockRejectedValue({ code: 403, message: "private upstream detail" }) },
    } as never;
    await expect(readSalesforceWorkbook(client)).rejects.toThrow("Google Sheets workbook read failed (status 403)");
  });
});
