import { describe, expect, it, vi } from "vitest";
import { salesforceWorkbookRefreshHandler } from "./salesforceWorkbookSchedule";

function response() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("scheduled Salesforce workbook refresh callback", () => {
  it("rejects non-cron callers", async () => {
    const res = response();
    await salesforceWorkbookRefreshHandler({ originalUrl: "/api/scheduled/salesforce-workbook-refresh" } as never, res as never, {
      authenticateRequest: vi.fn().mockResolvedValue({ isCron: false }),
      getSourceByTaskUid: vi.fn(),
      executeImport: vi.fn(),
    } as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only" });
  });

  it("returns an idempotent orphan skip for an unknown task UID", async () => {
    const res = response();
    await salesforceWorkbookRefreshHandler({ originalUrl: "/api/scheduled/salesforce-workbook-refresh" } as never, res as never, {
      authenticateRequest: vi.fn().mockResolvedValue({ isCron: true, taskUid: "task-1" }),
      getSourceByTaskUid: vi.fn().mockResolvedValue(null),
      executeImport: vi.fn(),
    } as never);
    expect(res.json).toHaveBeenCalledWith({ ok: true, skipped: "orphan" });
  });

  it("returns only a redacted aggregate run summary", async () => {
    const res = response();
    await salesforceWorkbookRefreshHandler({ originalUrl: "/api/scheduled/salesforce-workbook-refresh" } as never, res as never, {
      authenticateRequest: vi.fn().mockResolvedValue({ isCron: true, taskUid: "task-1" }),
      getSourceByTaskUid: vi.fn().mockResolvedValue({ id: 1, status: "ready" }),
      executeImport: vi.fn().mockResolvedValue({
        ok: true,
        status: "complete",
        runId: 9,
        parsed: { sourceRowCount: 10, rowsProcessed: 8, rowsRejected: 2, maxSourceModifiedAt: "2026-09-01T15:52:46.000Z", aggregates: [{ private: "must-not-return" }] },
      }),
    } as never);
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      status: "complete",
      skipped: undefined,
      runId: 9,
      sourceRowCount: 10,
      rowsProcessed: 8,
      rowsRejected: 2,
      maxSourceModifiedAt: "2026-09-01T15:52:46.000Z",
    });
  });
});
