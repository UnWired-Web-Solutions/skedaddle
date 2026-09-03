import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  salesforceWorkbookAggregates,
  salesforceWorkbookImportRuns,
  salesforceWorkbookSources,
} from "../drizzle/schema";
import { latestTwelveCompletedMonths, reportingWindowLabel, type ReportingWindow } from "../shared/reportingPeriod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

function inWorkbookWindow(window: ReportingWindow) {
  const start = window.start.year * 100 + window.start.month;
  const end = window.end.year * 100 + window.end.month;
  return sql`${salesforceWorkbookAggregates.periodYear} * 100 + ${salesforceWorkbookAggregates.periodMonth} BETWEEN ${start} AND ${end}`;
}

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

  getTerritoryPerformance: publicProcedure
    .input(z.object({ territoryId: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const reportingWindow = latestTwelveCompletedMonths();
      const unavailable = { source: "unavailable" as const, activeRun: null, reportingWindow: reportingWindowLabel(reportingWindow), months: [], species: [], cities: [], conversionMetric: "unavailable_pending_status_definition" as const };
      const db = await getDb();
      if (!db) return unavailable;
      const sourceRows = await db.select().from(salesforceWorkbookSources).orderBy(desc(salesforceWorkbookSources.updatedAt)).limit(1);
      const source = sourceRows[0];
      if (!source?.lastSuccessfulRunId) return unavailable;
      const runRows = await db.select().from(salesforceWorkbookImportRuns).where(eq(salesforceWorkbookImportRuns.id, source.lastSuccessfulRunId)).limit(1);
      const run = runRows[0];
      if (!run || (run.status !== "complete" && run.status !== "partial")) return unavailable;

      const baseFilters = [
        eq(salesforceWorkbookAggregates.importRunId, run.id),
        eq(salesforceWorkbookAggregates.territoryId, input.territoryId),
        inWorkbookWindow(reportingWindow),
      ];
      const aggregateSelection = {
        label: salesforceWorkbookAggregates.speciesLabel,
        city: salesforceWorkbookAggregates.cityLabel,
        year: salesforceWorkbookAggregates.periodYear,
        month: salesforceWorkbookAggregates.periodMonth,
        currencyCode: salesforceWorkbookAggregates.currencyCode,
        workOrders: sql<number>`SUM(${salesforceWorkbookAggregates.recordCount})`,
        invoiceValueRows: sql<number>`SUM(${salesforceWorkbookAggregates.invoiceValueCount})`,
        invoicePreTaxAmount: sql<string>`SUM(${salesforceWorkbookAggregates.invoicePreTaxAmount})`,
      };
      const [months, speciesRows, cityRows] = await Promise.all([
        db.select(aggregateSelection).from(salesforceWorkbookAggregates).where(and(
          ...baseFilters,
          eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
          eq(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
          eq(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
        )).groupBy(
          salesforceWorkbookAggregates.speciesLabel,
          salesforceWorkbookAggregates.cityLabel,
          salesforceWorkbookAggregates.periodYear,
          salesforceWorkbookAggregates.periodMonth,
          salesforceWorkbookAggregates.currencyCode,
        ),
        db.select(aggregateSelection).from(salesforceWorkbookAggregates).where(and(
          ...baseFilters,
          eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
          eq(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
          ne(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
        )).groupBy(
          salesforceWorkbookAggregates.speciesLabel,
          salesforceWorkbookAggregates.cityLabel,
          salesforceWorkbookAggregates.periodYear,
          salesforceWorkbookAggregates.periodMonth,
          salesforceWorkbookAggregates.currencyCode,
        ),
        db.select(aggregateSelection).from(salesforceWorkbookAggregates).where(and(
          ...baseFilters,
          eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
          eq(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
          ne(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
        )).groupBy(
          salesforceWorkbookAggregates.speciesLabel,
          salesforceWorkbookAggregates.cityLabel,
          salesforceWorkbookAggregates.periodYear,
          salesforceWorkbookAggregates.periodMonth,
          salesforceWorkbookAggregates.currencyCode,
        ),
      ]);
      const summarize = (rows: typeof speciesRows, field: "label" | "city") => {
        const totals = new Map<string, { label: string; currencyCode: string; workOrders: number; invoiceValueRows: number; invoicePreTaxAmount: number }>();
        for (const row of rows) {
          const label = row[field];
          const key = `${row.currencyCode}\u0000${label}`;
          const current = totals.get(key) ?? { label, currencyCode: row.currencyCode, workOrders: 0, invoiceValueRows: 0, invoicePreTaxAmount: 0 };
          current.workOrders += Number(row.workOrders);
          current.invoiceValueRows += Number(row.invoiceValueRows);
          current.invoicePreTaxAmount += Number(row.invoicePreTaxAmount);
          totals.set(key, current);
        }
        return Array.from(totals.values()).sort((a, b) => b.workOrders - a.workOrders || b.invoicePreTaxAmount - a.invoicePreTaxAmount).slice(0, 20);
      };
      return {
        source: "salesforce_drive_workbook" as const,
        reportingWindow: reportingWindowLabel(reportingWindow),
        activeRun: { id: run.id, status: run.status, rowsRejected: run.rowsRejected, activatedAt: run.activatedAt, maxSourceModifiedAt: run.maxSourceModifiedAt },
        months: months.map(row => ({ year: row.year, month: row.month, currencyCode: row.currencyCode, workOrders: Number(row.workOrders), invoiceValueRows: Number(row.invoiceValueRows), invoicePreTaxAmount: Number(row.invoicePreTaxAmount) })).sort((a, b) => a.year - b.year || a.month - b.month),
        species: summarize(speciesRows, "label"),
        cities: summarize(cityRows, "city"),
        conversionMetric: "unavailable_pending_status_definition" as const,
      };
    }),

  getNetworkPerformance: publicProcedure.query(async () => {
    const reportingWindow = latestTwelveCompletedMonths();
    const unavailable = { source: "unavailable" as const, activeRun: null, reportingWindow: reportingWindowLabel(reportingWindow), territories: [] };
    const db = await getDb();
    if (!db) return unavailable;
    const sourceRows = await db.select().from(salesforceWorkbookSources).orderBy(desc(salesforceWorkbookSources.updatedAt)).limit(1);
    const source = sourceRows[0];
    if (!source?.lastSuccessfulRunId) return unavailable;
    const runRows = await db.select().from(salesforceWorkbookImportRuns)
      .where(eq(salesforceWorkbookImportRuns.id, source.lastSuccessfulRunId)).limit(1);
    const run = runRows[0];
    if (!run || (run.status !== "complete" && run.status !== "partial")) return unavailable;

    const rows = await db.select({
      territoryId: salesforceWorkbookAggregates.territoryId,
      currencyCode: salesforceWorkbookAggregates.currencyCode,
      workOrders: sql<number>`SUM(${salesforceWorkbookAggregates.recordCount})`,
      invoiceValueRows: sql<number>`SUM(${salesforceWorkbookAggregates.invoiceValueCount})`,
      invoicePreTaxAmount: sql<string>`SUM(${salesforceWorkbookAggregates.invoicePreTaxAmount})`,
    }).from(salesforceWorkbookAggregates).where(and(
      eq(salesforceWorkbookAggregates.importRunId, run.id),
      eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
      eq(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
      eq(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
      inWorkbookWindow(reportingWindow),
    )).groupBy(
      salesforceWorkbookAggregates.territoryId,
      salesforceWorkbookAggregates.currencyCode,
    );

    return {
      source: "salesforce_drive_workbook" as const,
      reportingWindow: reportingWindowLabel(reportingWindow),
      activeRun: {
        id: run.id,
        status: run.status,
        sourceRowCount: run.sourceRowCount,
        rowsProcessed: run.rowsProcessed,
        rowsRejected: run.rowsRejected,
        activatedAt: run.activatedAt,
        maxSourceModifiedAt: run.maxSourceModifiedAt,
      },
      territories: rows.map(row => ({
        territoryId: row.territoryId,
        currencyCode: row.currencyCode,
        workOrders: Number(row.workOrders),
        invoiceValueRows: Number(row.invoiceValueRows),
        invoicePreTaxAmount: Number(row.invoicePreTaxAmount),
      })),
    };
  }),
});
