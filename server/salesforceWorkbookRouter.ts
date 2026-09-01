import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  salesforceWorkbookAggregates,
  salesforceWorkbookImportRuns,
  salesforceWorkbookSources,
} from "../drizzle/schema";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

export function parseWorkbookCountJson(value: string | null): Record<string, number> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] => (
      typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0
    )));
  } catch {
    return {};
  }
}

export const salesforceWorkbookRouter = router({
  getStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { configured: false as const, source: null, latestRun: null };
    const sources = await db.select().from(salesforceWorkbookSources).orderBy(desc(salesforceWorkbookSources.updatedAt)).limit(1);
    const source = sources[0];
    if (!source) return { configured: false as const, source: null, latestRun: null };
    const runs = await db.select().from(salesforceWorkbookImportRuns)
      .where(eq(salesforceWorkbookImportRuns.sourceId, source.id))
      .orderBy(desc(salesforceWorkbookImportRuns.startedAt))
      .limit(1);
    const latestRun = runs[0] ?? null;
    const activeRunRows = source.lastSuccessfulRunId
      ? await db.select().from(salesforceWorkbookImportRuns)
        .where(eq(salesforceWorkbookImportRuns.id, source.lastSuccessfulRunId)).limit(1)
      : [];
    const activeRun = activeRunRows[0] ?? null;
    return {
      configured: true as const,
      source: {
        title: source.workbookTitle,
        sheetName: source.sheetName,
        status: source.status,
        scheduleEnabled: Boolean(source.scheduleCronTaskUid),
        scheduleCron: source.scheduleCron,
        lastSuccessfulRunId: source.lastSuccessfulRunId,
        lastCheckedAt: source.lastCheckedAt,
        lastError: source.lastError,
      },
      latestRun: latestRun ? {
        id: latestRun.id,
        triggerType: latestRun.triggerType,
        status: latestRun.status,
        sourceRowCount: latestRun.sourceRowCount,
        rowsProcessed: latestRun.rowsProcessed,
        rowsRejected: latestRun.rowsRejected,
        blankIdCount: latestRun.blankIdCount,
        duplicateIdCount: latestRun.duplicateIdCount,
        maxSourceModifiedAt: latestRun.maxSourceModifiedAt,
        unknownTerritories: parseWorkbookCountJson(latestRun.unknownTerritoriesJson),
        validationWarnings: latestRun.validationWarningsJson,
        startedAt: latestRun.startedAt,
        completedAt: latestRun.completedAt,
        activatedAt: latestRun.activatedAt,
      } : null,
      activeRun: activeRun ? {
        id: activeRun.id,
        status: activeRun.status,
        sourceRowCount: activeRun.sourceRowCount,
        rowsProcessed: activeRun.rowsProcessed,
        rowsRejected: activeRun.rowsRejected,
        maxSourceModifiedAt: activeRun.maxSourceModifiedAt,
        activatedAt: activeRun.activatedAt,
      } : null,
    };
  }),

  getTerritoryMonthly: publicProcedure
    .input(z.object({
      territoryId: z.string().min(1).max(64),
      year: z.number().int().min(2020).max(2100).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { source: "unavailable" as const, run: null, months: [] };
      const sources = await db.select().from(salesforceWorkbookSources).orderBy(desc(salesforceWorkbookSources.updatedAt)).limit(1);
      const source = sources[0];
      if (!source?.lastSuccessfulRunId) return { source: "unavailable" as const, run: null, months: [] };
      const runRows = await db.select().from(salesforceWorkbookImportRuns)
        .where(eq(salesforceWorkbookImportRuns.id, source.lastSuccessfulRunId)).limit(1);
      const run = runRows[0];
      if (!run || (run.status !== "complete" && run.status !== "partial")) {
        return { source: "unavailable" as const, run: null, months: [] };
      }
      const filters = [
        eq(salesforceWorkbookAggregates.importRunId, run.id),
        eq(salesforceWorkbookAggregates.territoryId, input.territoryId),
        eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
      ];
      if (input.year) filters.push(eq(salesforceWorkbookAggregates.periodYear, input.year));
      const rows = await db.select({
        year: salesforceWorkbookAggregates.periodYear,
        month: salesforceWorkbookAggregates.periodMonth,
        currencyCode: salesforceWorkbookAggregates.currencyCode,
        recordCount: salesforceWorkbookAggregates.recordCount,
        invoiceValueCount: salesforceWorkbookAggregates.invoiceValueCount,
        invoicePreTaxAmount: salesforceWorkbookAggregates.invoicePreTaxAmount,
      }).from(salesforceWorkbookAggregates).where(and(...filters));
      return {
        source: "salesforce_drive_workbook" as const,
        run: {
          id: run.id,
          status: run.status,
          activatedAt: run.activatedAt,
          maxSourceModifiedAt: run.maxSourceModifiedAt,
          rowsRejected: run.rowsRejected,
        },
        months: rows.sort((a, b) => a.year - b.year || a.month - b.month),
      };
    }),
});
