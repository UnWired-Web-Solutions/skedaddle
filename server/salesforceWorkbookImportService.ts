import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import {
  salesforceWorkbookAggregates,
  salesforceWorkbookImportRuns,
  salesforceWorkbookSources,
  type SalesforceWorkbookSource,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  readSalesforceWorkbook,
  SALESFORCE_WORKBOOK_ID,
  SALESFORCE_WORKBOOK_SHEET,
  SALESFORCE_WORKBOOK_SOURCE_RANGE,
  SALESFORCE_WORKBOOK_TITLE,
  type SalesforceWorkbookRead,
} from "./googleSalesforceWorkbookClient";
import {
  parseSalesforceWorkbookRows,
  SALESFORCE_WORKBOOK_HEADER,
  type SalesforceWorkbookParseResult,
} from "./salesforceWorkbookParser";

const LOCK_STALE_AFTER_MS = 15 * 60 * 1000;
const INSERT_BATCH_SIZE = 500;

export type SalesforceWorkbookTrigger = "scheduled" | "manual";

export interface SalesforceWorkbookImportRepository {
  acquireLock(sourceId: number, lockToken: string, staleBefore: Date): Promise<boolean>;
  releaseLock(sourceId: number, lockToken: string): Promise<void>;
  startRun(sourceId: number, triggerType: SalesforceWorkbookTrigger): Promise<number>;
  findCompletedFingerprint(sourceId: number, fingerprint: string): Promise<number | null>;
  markSkipped(runId: number, sourceId: number, lockToken: string, parsed: SalesforceWorkbookParseResult): Promise<void>;
  activate(runId: number, sourceId: number, lockToken: string, parsed: SalesforceWorkbookParseResult): Promise<void>;
  markFailed(runId: number, sourceId: number, lockToken: string, errorMessage: string): Promise<void>;
}

function affectedRows(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const header = result[0] as { affectedRows?: number } | undefined;
  return Number(header?.affectedRows ?? 0);
}

function serializeRecord(record: Record<string, number>) {
  return JSON.stringify(Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b))));
}

function warnings(parsed: SalesforceWorkbookParseResult) {
  return JSON.stringify({
    unperiodizedRowCount: parsed.unperiodizedRowCount,
    unknownStatuses: parsed.unknownStatuses,
  });
}

function safeImportError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : "Workbook import failed.";
  const cause = typeof error === "object" && error !== null && "cause" in error
    ? (error.cause as { code?: unknown } | undefined)
    : undefined;
  const code = typeof cause?.code === "string" ? cause.code : null;
  if (raw.startsWith("Google Sheets workbook read failed")) return new Error(raw);
  if (raw.startsWith("Salesforce Drive workbook") || raw.startsWith("Blank ") || raw.startsWith("Invalid ")) {
    return new Error(raw);
  }
  if (raw === "Workbook import lock was lost before activation.") return new Error(raw);
  return new Error(code ? `Workbook database operation failed (${code}).` : "Workbook database operation failed.");
}

export function createSalesforceWorkbookImportRepository(): SalesforceWorkbookImportRepository {
  return {
    async acquireLock(sourceId, lockToken, staleBefore) {
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable.");
      const result = await db.update(salesforceWorkbookSources)
        .set({ importLockToken: lockToken, importLockAcquiredAt: new Date(), lastCheckedAt: new Date() })
        .where(and(
          eq(salesforceWorkbookSources.id, sourceId),
          or(
            isNull(salesforceWorkbookSources.importLockToken),
            lt(salesforceWorkbookSources.importLockAcquiredAt, staleBefore),
          ),
        ));
      return affectedRows(result) === 1;
    },
    async releaseLock(sourceId, lockToken) {
      const db = await getDb();
      if (!db) return;
      await db.update(salesforceWorkbookSources)
        .set({ importLockToken: null, importLockAcquiredAt: null })
        .where(and(eq(salesforceWorkbookSources.id, sourceId), eq(salesforceWorkbookSources.importLockToken, lockToken)));
    },
    async startRun(sourceId, triggerType) {
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable.");
      const result = await db.insert(salesforceWorkbookImportRuns).values({ sourceId, triggerType, status: "running" });
      const runId = Number(result[0]?.insertId);
      if (!Number.isInteger(runId) || runId <= 0) throw new Error("Workbook import run did not return an ID.");
      return runId;
    },
    async findCompletedFingerprint(sourceId, fingerprint) {
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable.");
      const existing = await db.select({ id: salesforceWorkbookImportRuns.id })
        .from(salesforceWorkbookImportRuns)
        .where(and(
          eq(salesforceWorkbookImportRuns.sourceId, sourceId),
          or(
            eq(salesforceWorkbookImportRuns.status, "complete"),
            eq(salesforceWorkbookImportRuns.status, "partial"),
          ),
          eq(salesforceWorkbookImportRuns.sourceFingerprint, fingerprint),
        ))
        .orderBy(desc(salesforceWorkbookImportRuns.startedAt))
        .limit(1);
      return existing[0]?.id ?? null;
    },
    async markSkipped(runId, sourceId, lockToken, parsed) {
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable.");
      await db.transaction(async tx => {
        await tx.update(salesforceWorkbookImportRuns).set({
          status: "skipped",
          sourceFingerprint: parsed.sourceFingerprint,
          sourceRowCount: parsed.sourceRowCount,
          rowsProcessed: parsed.rowsProcessed,
          rowsRejected: parsed.rowsRejected,
          blankIdCount: parsed.blankIdCount,
          duplicateIdCount: parsed.duplicateIdCount,
          maxSourceModifiedAt: parsed.maxSourceModifiedAt,
          headerJson: [...SALESFORCE_WORKBOOK_HEADER],
          territoryCountsJson: serializeRecord(parsed.territoryCounts),
          statusCountsJson: serializeRecord(parsed.statusCounts),
          unknownTerritoriesJson: serializeRecord(parsed.unknownTerritories),
          validationWarningsJson: warnings(parsed),
          completedAt: new Date(),
        }).where(eq(salesforceWorkbookImportRuns.id, runId));
        await tx.update(salesforceWorkbookSources).set({
          importLockToken: null,
          importLockAcquiredAt: null,
          lastCheckedAt: new Date(),
          lastError: null,
        }).where(and(eq(salesforceWorkbookSources.id, sourceId), eq(salesforceWorkbookSources.importLockToken, lockToken)));
      });
    },
    async activate(runId, sourceId, lockToken, parsed) {
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable.");
      const activatedAt = new Date();
      await db.transaction(async tx => {
        for (let index = 0; index < parsed.aggregates.length; index += INSERT_BATCH_SIZE) {
          await tx.insert(salesforceWorkbookAggregates).values(
            parsed.aggregates.slice(index, index + INSERT_BATCH_SIZE).map(row => ({ ...row, importRunId: runId })),
          );
        }
        await tx.update(salesforceWorkbookImportRuns).set({
          status: parsed.rowsRejected > 0 ? "partial" : "complete",
          sourceFingerprint: parsed.sourceFingerprint,
          sourceRowCount: parsed.sourceRowCount,
          rowsProcessed: parsed.rowsProcessed,
          rowsRejected: parsed.rowsRejected,
          blankIdCount: parsed.blankIdCount,
          duplicateIdCount: parsed.duplicateIdCount,
          maxSourceModifiedAt: parsed.maxSourceModifiedAt,
          headerJson: [...SALESFORCE_WORKBOOK_HEADER],
          territoryCountsJson: serializeRecord(parsed.territoryCounts),
          statusCountsJson: serializeRecord(parsed.statusCounts),
          unknownTerritoriesJson: serializeRecord(parsed.unknownTerritories),
          validationWarningsJson: warnings(parsed),
          completedAt: activatedAt,
          activatedAt,
        }).where(eq(salesforceWorkbookImportRuns.id, runId));
        const sourceUpdate = await tx.update(salesforceWorkbookSources).set({
          lastSuccessfulRunId: runId,
          importLockToken: null,
          importLockAcquiredAt: null,
          lastCheckedAt: activatedAt,
          lastError: null,
        }).where(and(eq(salesforceWorkbookSources.id, sourceId), eq(salesforceWorkbookSources.importLockToken, lockToken)));
        if (affectedRows(sourceUpdate) !== 1) throw new Error("Workbook import lock was lost before activation.");
      });
    },
    async markFailed(runId, sourceId, lockToken, errorMessage) {
      const db = await getDb();
      if (!db) return;
      await db.transaction(async tx => {
        await tx.update(salesforceWorkbookImportRuns).set({
          status: "failed",
          errorMessage: errorMessage.slice(0, 1000),
          completedAt: new Date(),
        }).where(eq(salesforceWorkbookImportRuns.id, runId));
        await tx.update(salesforceWorkbookSources).set({
          importLockToken: null,
          importLockAcquiredAt: null,
          lastCheckedAt: new Date(),
          lastError: errorMessage.slice(0, 1000),
        }).where(and(eq(salesforceWorkbookSources.id, sourceId), eq(salesforceWorkbookSources.importLockToken, lockToken)));
      });
    },
  };
}

export async function ensureSalesforceWorkbookSource(): Promise<SalesforceWorkbookSource> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(salesforceWorkbookSources).values({
    workbookId: SALESFORCE_WORKBOOK_ID,
    workbookTitle: SALESFORCE_WORKBOOK_TITLE,
    sheetName: SALESFORCE_WORKBOOK_SHEET,
    sourceRange: SALESFORCE_WORKBOOK_SOURCE_RANGE,
    status: "ready",
  }).onDuplicateKeyUpdate({
    set: {
      workbookTitle: SALESFORCE_WORKBOOK_TITLE,
      sheetName: SALESFORCE_WORKBOOK_SHEET,
      sourceRange: SALESFORCE_WORKBOOK_SOURCE_RANGE,
    },
  });
  const rows = await db.select().from(salesforceWorkbookSources)
    .where(eq(salesforceWorkbookSources.workbookId, SALESFORCE_WORKBOOK_ID)).limit(1);
  if (!rows[0]) throw new Error("Workbook source configuration is unavailable.");
  return rows[0];
}

export async function getSalesforceWorkbookSourceByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const rows = await db.select().from(salesforceWorkbookSources)
    .where(eq(salesforceWorkbookSources.scheduleCronTaskUid, taskUid)).limit(1);
  return rows[0] ?? null;
}

export async function executeSalesforceWorkbookImport(input: {
  source: Pick<SalesforceWorkbookSource, "id" | "status">;
  triggerType: SalesforceWorkbookTrigger;
  reader?: () => Promise<SalesforceWorkbookRead>;
  repository?: SalesforceWorkbookImportRepository;
}) {
  if (input.source.status !== "ready") return { ok: true as const, skipped: "source_not_ready" as const };
  const repository = input.repository ?? createSalesforceWorkbookImportRepository();
  const lockToken = randomUUID();
  const acquired = await repository.acquireLock(input.source.id, lockToken, new Date(Date.now() - LOCK_STALE_AFTER_MS));
  if (!acquired) return { ok: true as const, skipped: "already_running" as const };
  let runId: number | null = null;
  try {
    runId = await repository.startRun(input.source.id, input.triggerType);
    const workbook = await (input.reader ?? readSalesforceWorkbook)();
    const parsed = parseSalesforceWorkbookRows(workbook.header, workbook.rows);
    const previousRunId = await repository.findCompletedFingerprint(input.source.id, parsed.sourceFingerprint);
    if (previousRunId) {
      await repository.markSkipped(runId, input.source.id, lockToken, parsed);
      return { ok: true as const, skipped: "unchanged" as const, runId, previousRunId, parsed };
    }
    await repository.activate(runId, input.source.id, lockToken, parsed);
    return {
      ok: true as const,
      status: parsed.rowsRejected > 0 ? "partial" as const : "complete" as const,
      runId,
      parsed,
    };
  } catch (error) {
    const safeError = safeImportError(error);
    if (runId) await repository.markFailed(runId, input.source.id, lockToken, safeError.message);
    else await repository.releaseLock(input.source.id, lockToken);
    throw safeError;
  }
}
