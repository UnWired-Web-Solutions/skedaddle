import { describe, expect, it, vi } from "vitest";
import { executeSalesforceWorkbookImport, type SalesforceWorkbookImportRepository } from "./salesforceWorkbookImportService";
import { SALESFORCE_WORKBOOK_HEADER } from "./salesforceWorkbookParser";

function workbook(id = "id-1") {
  return {
    title: "Salesforce Data",
    sheetName: "Sheet1",
    configuredRowCount: 2,
    header: [...SALESFORCE_WORKBOOK_HEADER],
    rows: [[id, "Completed", "2026-08-01T12:00:00.000+0000", "2026-09-01T12:00:00.000+0000", "", "private", "Hamilton", "private", "PA", "Hamilton", "Organic", "private", "Raccoons", "10.00"]],
  };
}

function repository(overrides: Partial<SalesforceWorkbookImportRepository> = {}) {
  const base: SalesforceWorkbookImportRepository = {
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn().mockResolvedValue(undefined),
    startRun: vi.fn().mockResolvedValue(7),
    findCompletedFingerprint: vi.fn().mockResolvedValue(null),
    markSkipped: vi.fn().mockResolvedValue(undefined),
    activate: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  };
  return { ...base, ...overrides };
}

describe("Salesforce workbook import execution", () => {
  it("activates a fully parsed new fingerprint", async () => {
    const repo = repository();
    const result = await executeSalesforceWorkbookImport({
      source: { id: 1, status: "ready" }, triggerType: "scheduled", reader: async () => workbook(), repository: repo,
    });
    expect(result).toMatchObject({ ok: true, status: "complete", runId: 7 });
    expect(repo.activate).toHaveBeenCalledOnce();
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it("passes rejected-row coverage to activation instead of hiding exclusions", async () => {
    const repo = repository();
    const result = await executeSalesforceWorkbookImport({
      source: { id: 1, status: "ready" },
      triggerType: "scheduled",
      reader: async () => ({
        ...workbook("id-review"),
        rows: [["id-review", "Completed", "2026-08-01T12:00:00.000+0000", "2026-09-01T12:00:00.000+0000", "", "private", "Victoria", "private", "PA", "Victoria", "Organic", "private", "Raccoons", "10.00"]],
      }),
      repository: repo,
    });
    expect(result.parsed?.rowsRejected).toBe(1);
    expect(repo.activate).toHaveBeenCalledWith(7, 1, expect.any(String), expect.objectContaining({ rowsRejected: 1 }));
  });

  it("records an unchanged fingerprint as skipped without activating duplicate aggregates", async () => {
    const repo = repository({ findCompletedFingerprint: vi.fn().mockResolvedValue(5) });
    const result = await executeSalesforceWorkbookImport({
      source: { id: 1, status: "ready" }, triggerType: "scheduled", reader: async () => workbook(), repository: repo,
    });
    expect(result).toMatchObject({ ok: true, skipped: "unchanged", previousRunId: 5 });
    expect(repo.markSkipped).toHaveBeenCalledOnce();
    expect(repo.activate).not.toHaveBeenCalled();
  });

  it("returns a safe skip when another import owns the lock", async () => {
    const repo = repository({ acquireLock: vi.fn().mockResolvedValue(false) });
    const result = await executeSalesforceWorkbookImport({
      source: { id: 1, status: "ready" }, triggerType: "scheduled", reader: async () => workbook(), repository: repo,
    });
    expect(result).toEqual({ ok: true, skipped: "already_running" });
    expect(repo.startRun).not.toHaveBeenCalled();
  });

  it("records a redacted failure and preserves the prior active run", async () => {
    const repo = repository();
    await expect(executeSalesforceWorkbookImport({
      source: { id: 1, status: "ready" }, triggerType: "scheduled", reader: async () => { throw new Error("Google Sheets workbook read failed (status 503)."); }, repository: repo,
    })).rejects.toThrow(/status 503/);
    expect(repo.markFailed).toHaveBeenCalledWith(7, 1, expect.any(String), "Google Sheets workbook read failed (status 503).");
    expect(repo.activate).not.toHaveBeenCalled();
  });

  it("does not expose generated SQL or dimension values when database activation fails", async () => {
    const databaseError = Object.assign(new Error("Failed query: insert into aggregates values (private-city)"), {
      cause: { code: "ER_DUP_ENTRY" },
    });
    const repo = repository({ activate: vi.fn().mockRejectedValue(databaseError) });
    await expect(executeSalesforceWorkbookImport({
      source: { id: 1, status: "ready" }, triggerType: "manual", reader: async () => workbook(), repository: repo,
    })).rejects.toThrow("Workbook database operation failed (ER_DUP_ENTRY).");
    expect(repo.markFailed).toHaveBeenCalledWith(7, 1, expect.any(String), "Workbook database operation failed (ER_DUP_ENTRY).");
  });
});
