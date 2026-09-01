import type { Request, Response } from "express";
import { sdk, type AuthenticatedUser } from "./_core/sdk";
import {
  executeSalesforceWorkbookImport,
  getSalesforceWorkbookSourceByTaskUid,
  type SalesforceWorkbookTrigger,
} from "./salesforceWorkbookImportService";

type ScheduleDependencies = {
  authenticateRequest: (req: Request) => Promise<AuthenticatedUser>;
  getSourceByTaskUid: typeof getSalesforceWorkbookSourceByTaskUid;
  executeImport: typeof executeSalesforceWorkbookImport;
};

const defaultDependencies: ScheduleDependencies = {
  authenticateRequest: req => sdk.authenticateRequest(req),
  getSourceByTaskUid: getSalesforceWorkbookSourceByTaskUid,
  executeImport: executeSalesforceWorkbookImport,
};

export async function salesforceWorkbookRefreshHandler(
  req: Request,
  res: Response,
  dependencies: ScheduleDependencies = defaultDependencies,
) {
  let taskUid: string | null = null;
  try {
    const user = await dependencies.authenticateRequest(req);
    taskUid = user.taskUid ?? null;
    if (!user.isCron || !taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }
    const source = await dependencies.getSourceByTaskUid(taskUid);
    if (!source) {
      res.json({ ok: true, skipped: "orphan" });
      return;
    }
    const result = await dependencies.executeImport({
      source,
      triggerType: "scheduled" satisfies SalesforceWorkbookTrigger,
    });
    if ("parsed" in result && result.parsed) {
      res.json({
        ok: true,
        status: "status" in result ? result.status : undefined,
        skipped: "skipped" in result ? result.skipped : undefined,
        runId: result.runId,
        sourceRowCount: result.parsed.sourceRowCount,
        rowsProcessed: result.parsed.rowsProcessed,
        rowsRejected: result.parsed.rowsRejected,
        maxSourceModifiedAt: result.parsed.maxSourceModifiedAt,
      });
      return;
    }
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduled workbook refresh failed.";
    res.status(500).json({
      error: message,
      context: { url: req.originalUrl, taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
