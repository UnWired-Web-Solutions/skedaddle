import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  ga4ImportRuns,
  ga4TerritoryMonthly,
  ga4TerritoryPages,
  gscPageMetrics,
  gscQueryMetrics,
  salesforceWorkbookAggregates,
  salesforceWorkbookImportRuns,
  salesforceWorkbookSources,
} from "../drizzle/schema";
import { dedicatedSuburbHubMatchesPage } from "../shared/ga4PageClassifier";
import {
  INITIAL_SALES_REPORT_WINDOW,
  isMonthInWindow,
  reportingMonthIso,
  reportingWindowLabel,
  type ReportingWindow,
} from "../shared/reportingPeriod";
import { getDb } from "./db";
import { loadResolvedGBPMonthly } from "./gbpReportingData";
import type { ResolvedGBPMonthlyMetric } from "./gbpMetricSourceResolver";

export type ReportingGBPMonth = {
  month: string;
  searches: number | null;
  calls: number | null;
  website_clicks: number | null;
  directions: number | null;
  bookings: number | null;
  sources: string[];
  incompleteMetrics: string[];
};

export type ReportingAnalyticsSnapshot = {
  window: ReportingWindow;
  periodLabel: string;
  gbp: {
    monthly: ReportingGBPMonth[];
    sources: string[];
    incompletePeriods: string[];
  };
  ga4: {
    monthly: Array<{
      year: number;
      month: number;
      sessions: number;
      activeUsers: number;
      priorityPageSessions: number;
      complete: boolean;
      propertiesExpected: number;
      propertiesSucceeded: number;
    }>;
    totalSessions: number;
    totalPriorityPageSessions: number;
    completeMonths: number;
    partialMonths: number;
    topPages: Array<{ pagePath: string; pageType: string; sessions: number; activeUsers: number }>;
    latestImport: {
      year: number;
      month: number;
      status: "complete" | "partial" | "failed";
      propertiesExpected: number;
      propertiesSucceeded: number;
      importedAt: Date;
    } | null;
  };
  gsc: {
    monthly: Array<{ month: string; clicks: number; impressions: number; avg_position: number }>;
    totalClicks: number;
    totalImpressions: number;
    topPages: Array<{ pageUrl: string; clicks: number; impressions: number }>;
    topQueries: Array<{ query: string; clicks: number; impressions: number }>;
  };
};

/** Converts metric-level source decisions into a report-safe monthly table. */
export function groupResolvedGBPForReporting(
  rows: ResolvedGBPMonthlyMetric[],
  window: ReportingWindow,
): ReportingGBPMonth[] {
  const grouped = new Map<string, ReportingGBPMonth>();
  const reportMetricTypes = new Set(["searches", "calls", "website_clicks", "directions", "bookings"]);
  for (const row of rows) {
    if (!isMonthInWindow(row.year, row.month, window)) continue;
    const month = reportingMonthIso(row);
    const current = grouped.get(month) ?? {
      month,
      searches: null,
      calls: null,
      website_clicks: null,
      directions: null,
      bookings: null,
      sources: [],
      incompleteMetrics: [],
    };
    const isHeadlineEligible = row.source === "persisted_business_profile_api"
      || row.source === "legacy_spreadsheet";
    if (reportMetricTypes.has(row.metricType) && row.value !== null && isHeadlineEligible) {
      current[row.metricType as "searches" | "calls" | "website_clicks" | "directions" | "bookings"] = row.value;
    }
    if (!current.sources.includes(row.source)) current.sources.push(row.source);
    if (!isHeadlineEligible && !current.incompleteMetrics.includes(row.metricType)) {
      current.incompleteMetrics.push(row.metricType);
    }
    grouped.set(month, current);
  }
  return Array.from(grouped.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function inWindowSql(yearColumn: unknown, monthColumn: unknown, window: ReportingWindow) {
  const start = window.start.year * 100 + window.start.month;
  const end = window.end.year * 100 + window.end.month;
  return sql`${yearColumn} * 100 + ${monthColumn} BETWEEN ${start} AND ${end}`;
}

function aggregateGa4Pages(
  rows: Array<{ year: number; month: number; pagePath: string; pageType: string; sessions: number; activeUsers: number }>,
  completePeriods: Set<string>,
) {
  const totals = new Map<string, { pagePath: string; pageType: string; sessions: number; activeUsers: number }>();
  for (const row of rows) {
    if (!completePeriods.has(reportingMonthIso(row))) continue;
    const key = `${row.pageType}\u0000${row.pagePath}`;
    const existing = totals.get(key) ?? { pagePath: row.pagePath, pageType: row.pageType, sessions: 0, activeUsers: 0 };
    existing.sessions += Number(row.sessions);
    existing.activeUsers += Number(row.activeUsers);
    totals.set(key, existing);
  }
  return Array.from(totals.values()).sort((a, b) => b.sessions - a.sessions).slice(0, 25);
}

export async function loadTerritoryReportingAnalytics(
  territoryId: string,
  window: ReportingWindow = INITIAL_SALES_REPORT_WINDOW,
): Promise<ReportingAnalyticsSnapshot | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const period = (yearColumn: unknown, monthColumn: unknown) => inWindowSql(yearColumn, monthColumn, window);
    const [ga4MonthlyRows, ga4PageRows, latestRuns, gscMonthlyRows, gscTopPages, gscTopQueries, resolvedGBP] = await Promise.all([
      db.select().from(ga4TerritoryMonthly)
        .where(and(eq(ga4TerritoryMonthly.territoryId, territoryId), period(ga4TerritoryMonthly.year, ga4TerritoryMonthly.month)))
        .orderBy(ga4TerritoryMonthly.year, ga4TerritoryMonthly.month),
      db.select({
        year: ga4TerritoryPages.year,
        month: ga4TerritoryPages.month,
        pagePath: ga4TerritoryPages.pagePath,
        pageType: ga4TerritoryPages.pageType,
        sessions: ga4TerritoryPages.sessions,
        activeUsers: ga4TerritoryPages.activeUsers,
      }).from(ga4TerritoryPages)
        .where(and(eq(ga4TerritoryPages.territoryId, territoryId), period(ga4TerritoryPages.year, ga4TerritoryPages.month))),
      db.select().from(ga4ImportRuns)
        .where(and(
          eq(ga4ImportRuns.territoryId, territoryId),
          ne(ga4ImportRuns.status, "failed"),
          period(ga4ImportRuns.year, ga4ImportRuns.month),
        ))
        .orderBy(desc(ga4ImportRuns.importedAt))
        .limit(1),
      db.select({
        year: gscPageMetrics.year,
        month: gscPageMetrics.month,
        clicks: sql<number>`SUM(${gscPageMetrics.clicks})`,
        impressions: sql<number>`SUM(${gscPageMetrics.impressions})`,
        weightedPosition: sql<number>`SUM(${gscPageMetrics.positionHundredths} * ${gscPageMetrics.impressions})`,
      }).from(gscPageMetrics)
        .where(and(eq(gscPageMetrics.territoryId, territoryId), period(gscPageMetrics.year, gscPageMetrics.month)))
        .groupBy(gscPageMetrics.year, gscPageMetrics.month)
        .orderBy(gscPageMetrics.year, gscPageMetrics.month),
      db.select({
        pageUrl: gscPageMetrics.pageUrl,
        clicks: sql<number>`SUM(${gscPageMetrics.clicks})`,
        impressions: sql<number>`SUM(${gscPageMetrics.impressions})`,
      }).from(gscPageMetrics)
        .where(and(eq(gscPageMetrics.territoryId, territoryId), period(gscPageMetrics.year, gscPageMetrics.month)))
        .groupBy(gscPageMetrics.pageUrl)
        .orderBy(desc(sql`SUM(${gscPageMetrics.clicks})`))
        .limit(25),
      db.select({
        query: gscQueryMetrics.query,
        clicks: sql<number>`SUM(${gscQueryMetrics.clicks})`,
        impressions: sql<number>`SUM(${gscQueryMetrics.impressions})`,
      }).from(gscQueryMetrics)
        .where(and(eq(gscQueryMetrics.territoryId, territoryId), period(gscQueryMetrics.year, gscQueryMetrics.month)))
        .groupBy(gscQueryMetrics.query)
        .orderBy(desc(sql`SUM(${gscQueryMetrics.clicks})`))
        .limit(25),
      loadResolvedGBPMonthly({
        db,
        territoryId,
        startYear: window.start.year,
        endYear: window.end.year,
      }),
    ]);

    const run = latestRuns[0] ?? null;
    const ga4Monthly = ga4MonthlyRows.map(row => ({
      year: row.year,
      month: row.month,
      sessions: Number(row.sessions),
      activeUsers: Number(row.activeUsers),
      priorityPageSessions: Number(row.priorityPageSessions),
      propertiesExpected: Number(row.propertiesExpected),
      propertiesSucceeded: Number(row.propertiesSucceeded),
      complete: Number(row.propertiesExpected) > 0 && Number(row.propertiesSucceeded) === Number(row.propertiesExpected),
    }));
    const completeGa4 = ga4Monthly.filter(row => row.complete);
    const completePeriods = new Set(completeGa4.map(reportingMonthIso));
    const gbpMonthly = groupResolvedGBPForReporting(resolvedGBP, window);
    const gscMonthly = gscMonthlyRows.map(row => {
      const impressions = Number(row.impressions);
      return {
        month: reportingMonthIso(row),
        clicks: Number(row.clicks),
        impressions,
        avg_position: impressions > 0 ? Number(row.weightedPosition) / impressions / 100 : 0,
      };
    });

    return {
      window,
      periodLabel: reportingWindowLabel(window),
      gbp: {
        monthly: gbpMonthly,
        sources: Array.from(new Set(gbpMonthly.flatMap(row => row.sources))),
        incompletePeriods: gbpMonthly
          .filter(row => row.incompleteMetrics.length > 0)
          .map(row => row.month),
      },
      ga4: {
        monthly: ga4Monthly,
        totalSessions: completeGa4.reduce((sum, row) => sum + row.sessions, 0),
        totalPriorityPageSessions: completeGa4.reduce((sum, row) => sum + row.priorityPageSessions, 0),
        completeMonths: completeGa4.length,
        partialMonths: ga4Monthly.length - completeGa4.length,
        topPages: aggregateGa4Pages(ga4PageRows, completePeriods),
        latestImport: run ? {
          year: run.year,
          month: run.month,
          status: run.status,
          propertiesExpected: run.propertiesExpected,
          propertiesSucceeded: run.propertiesSucceeded,
          importedAt: run.importedAt,
        } : null,
      },
      gsc: {
        monthly: gscMonthly,
        totalClicks: gscMonthly.reduce((sum, row) => sum + row.clicks, 0),
        totalImpressions: gscMonthly.reduce((sum, row) => sum + row.impressions, 0),
        topPages: gscTopPages.map(row => ({ pageUrl: row.pageUrl, clicks: Number(row.clicks), impressions: Number(row.impressions) })),
        topQueries: gscTopQueries.map(row => ({ query: row.query, clicks: Number(row.clicks), impressions: Number(row.impressions) })),
      },
    };
  } catch (error) {
    console.warn(`[ReportingData] Analytics unavailable for ${territoryId}/${reportingWindowLabel(window)}:`, error);
    return null;
  }
}

export async function loadTerritoryWorkbookSourceStatus() {
  const db = await getDb();
  if (!db) return null;
  const [source] = await db.select().from(salesforceWorkbookSources)
    .orderBy(desc(salesforceWorkbookSources.updatedAt)).limit(1);
  if (!source?.lastSuccessfulRunId) return null;
  const [run] = await db.select().from(salesforceWorkbookImportRuns)
    .where(eq(salesforceWorkbookImportRuns.id, source.lastSuccessfulRunId)).limit(1);
  if (!run || (run.status !== "complete" && run.status !== "partial")) return null;
  return {
    source: "salesforce_drive_workbook" as const,
    workbookTitle: source.workbookTitle,
    sheetName: source.sheetName,
    status: run.status,
    rowsProcessed: run.rowsProcessed,
    rowsRejected: run.rowsRejected,
    activatedAt: run.activatedAt,
    maxSourceModifiedAt: run.maxSourceModifiedAt,
    conversionMetric: "unavailable_pending_status_definition" as const,
  };
}

export type WorkbookAggregatePeriodRow = {
  year: number;
  month: number;
  currencyCode: string;
  workOrders: number;
  invoiceValueRows: number;
  invoicePreTaxAmount: number;
};

export type WorkbookAggregateBreakdownRow = {
  label: string;
  currencyCode: string;
  workOrders: number;
  invoiceValueRows: number;
  invoicePreTaxAmount: number;
};

export type TerritoryWorkbookAggregateSnapshot = {
  source: "salesforce_drive_workbook";
  currencyCode: "CAD" | "USD";
  reportingWindow: ReportingWindow;
  reportingPeriodLabel: string;
  activeRun: {
    id: number;
    status: "complete" | "partial";
    rowsProcessed: number;
    rowsRejected: number;
    activatedAt: Date | null;
    maxSourceModifiedAt: string | null;
  };
  totals: {
    workOrders: number;
    invoiceValueRows: number;
    invoicePreTaxAmount: number;
  };
  sameCurrencyNetworkBenchmark: {
    workOrders: number;
    invoiceValueRows: number;
    invoicePreTaxAmount: number;
  };
  months: WorkbookAggregatePeriodRow[];
  species: WorkbookAggregateBreakdownRow[];
  cities: WorkbookAggregateBreakdownRow[];
  conversionMetric: "unavailable_pending_status_definition";
};

type WorkbookAggregateQueryRow = {
  label: string;
  currencyCode: string;
  workOrders: number | string;
  invoiceValueRows: number | string;
  invoicePreTaxAmount: number | string;
};

/** Keeps approved aggregate values separated by currency; raw workbook rows are never loaded. */
export function summarizeWorkbookAggregateRows(
  rows: WorkbookAggregateQueryRow[],
): WorkbookAggregateBreakdownRow[] {
  const totals = new Map<string, WorkbookAggregateBreakdownRow>();
  for (const row of rows) {
    const label = row.label.trim();
    const currencyCode = row.currencyCode.trim();
    if (!label || !currencyCode) continue;
    const key = `${currencyCode}\u0000${label}`;
    const current = totals.get(key) ?? {
      label,
      currencyCode,
      workOrders: 0,
      invoiceValueRows: 0,
      invoicePreTaxAmount: 0,
    };
    current.workOrders += Number(row.workOrders);
    current.invoiceValueRows += Number(row.invoiceValueRows);
    current.invoicePreTaxAmount += Number(row.invoicePreTaxAmount);
    totals.set(key, current);
  }
  return Array.from(totals.values()).sort((a, b) => (
    a.currencyCode.localeCompare(b.currencyCode)
    || b.invoicePreTaxAmount - a.invoicePreTaxAmount
    || b.workOrders - a.workOrders
    || a.label.localeCompare(b.label)
  ));
}

/**
 * Loads facts only from the active Drive-workbook aggregate run for the exact
 * reporting window. It fails closed, never reads raw workbook rows, and never
 * infers conversion or combines currencies.
 */
export async function loadTerritoryWorkbookAggregate(
  territoryId: string,
  currencyCode: "CAD" | "USD",
  window: ReportingWindow = INITIAL_SALES_REPORT_WINDOW,
): Promise<TerritoryWorkbookAggregateSnapshot | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const [source] = await db.select().from(salesforceWorkbookSources)
      .orderBy(desc(salesforceWorkbookSources.updatedAt)).limit(1);
    if (!source?.lastSuccessfulRunId) return null;
    const [run] = await db.select().from(salesforceWorkbookImportRuns)
      .where(eq(salesforceWorkbookImportRuns.id, source.lastSuccessfulRunId)).limit(1);
    if (!run || (run.status !== "complete" && run.status !== "partial")) return null;

    const period = inWindowSql(
      salesforceWorkbookAggregates.periodYear,
      salesforceWorkbookAggregates.periodMonth,
      window,
    );
    const baseFilters = [
      eq(salesforceWorkbookAggregates.importRunId, run.id),
      eq(salesforceWorkbookAggregates.territoryId, territoryId),
      eq(salesforceWorkbookAggregates.currencyCode, currencyCode),
      period,
    ];
    const aggregateSelection = {
      label: salesforceWorkbookAggregates.speciesLabel,
      currencyCode: salesforceWorkbookAggregates.currencyCode,
      workOrders: sql<number>`SUM(${salesforceWorkbookAggregates.recordCount})`,
      invoiceValueRows: sql<number>`SUM(${salesforceWorkbookAggregates.invoiceValueCount})`,
      invoicePreTaxAmount: sql<string>`SUM(${salesforceWorkbookAggregates.invoicePreTaxAmount})`,
    };

    const [monthRows, speciesRows, cityRows, networkRows] = await Promise.all([
      db.select({
        year: salesforceWorkbookAggregates.periodYear,
        month: salesforceWorkbookAggregates.periodMonth,
        currencyCode: salesforceWorkbookAggregates.currencyCode,
        workOrders: sql<number>`SUM(${salesforceWorkbookAggregates.recordCount})`,
        invoiceValueRows: sql<number>`SUM(${salesforceWorkbookAggregates.invoiceValueCount})`,
        invoicePreTaxAmount: sql<string>`SUM(${salesforceWorkbookAggregates.invoicePreTaxAmount})`,
      }).from(salesforceWorkbookAggregates).where(and(
        ...baseFilters,
        eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
      )).groupBy(
        salesforceWorkbookAggregates.periodYear,
        salesforceWorkbookAggregates.periodMonth,
        salesforceWorkbookAggregates.currencyCode,
      ),
      db.select(aggregateSelection).from(salesforceWorkbookAggregates).where(and(
        ...baseFilters,
        eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
        ne(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
      )).groupBy(salesforceWorkbookAggregates.speciesLabel, salesforceWorkbookAggregates.currencyCode),
      db.select({ ...aggregateSelection, label: salesforceWorkbookAggregates.cityLabel }).from(salesforceWorkbookAggregates).where(and(
        ...baseFilters,
        eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
        ne(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
      )).groupBy(salesforceWorkbookAggregates.cityLabel, salesforceWorkbookAggregates.currencyCode),
      db.select({
        workOrders: sql<number>`SUM(${salesforceWorkbookAggregates.recordCount})`,
        invoiceValueRows: sql<number>`SUM(${salesforceWorkbookAggregates.invoiceValueCount})`,
        invoicePreTaxAmount: sql<string>`SUM(${salesforceWorkbookAggregates.invoicePreTaxAmount})`,
      }).from(salesforceWorkbookAggregates).where(and(
        eq(salesforceWorkbookAggregates.importRunId, run.id),
        eq(salesforceWorkbookAggregates.currencyCode, currencyCode),
        eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
        period,
      )),
    ]);
    if (monthRows.length === 0) return null;
    const totals = monthRows.reduce((total, row) => ({
      workOrders: total.workOrders + Number(row.workOrders),
      invoiceValueRows: total.invoiceValueRows + Number(row.invoiceValueRows),
      invoicePreTaxAmount: total.invoicePreTaxAmount + Number(row.invoicePreTaxAmount),
    }), { workOrders: 0, invoiceValueRows: 0, invoicePreTaxAmount: 0 });
    const network = networkRows[0];

    return {
      source: "salesforce_drive_workbook",
      currencyCode,
      reportingWindow: window,
      reportingPeriodLabel: reportingWindowLabel(window),
      activeRun: {
        id: run.id,
        status: run.status,
        rowsProcessed: run.rowsProcessed,
        rowsRejected: run.rowsRejected,
        activatedAt: run.activatedAt,
        maxSourceModifiedAt: run.maxSourceModifiedAt,
      },
      totals,
      sameCurrencyNetworkBenchmark: {
        workOrders: Number(network?.workOrders ?? 0),
        invoiceValueRows: Number(network?.invoiceValueRows ?? 0),
        invoicePreTaxAmount: Number(network?.invoicePreTaxAmount ?? 0),
      },
      months: monthRows.map(row => ({
        year: row.year,
        month: row.month,
        currencyCode: row.currencyCode,
        workOrders: Number(row.workOrders),
        invoiceValueRows: Number(row.invoiceValueRows),
        invoicePreTaxAmount: Number(row.invoicePreTaxAmount),
      })).sort((a, b) => a.year - b.year || a.month - b.month || a.currencyCode.localeCompare(b.currencyCode)),
      species: summarizeWorkbookAggregateRows(speciesRows),
      cities: summarizeWorkbookAggregateRows(cityRows),
      conversionMetric: "unavailable_pending_status_definition",
    };
  } catch (error) {
    console.warn(`[ReportingData] Workbook aggregate unavailable for ${territoryId}/${reportingWindowLabel(window)}:`, error);
    return null;
  }
}

export async function findSuburbAnalyticsEvidence(territoryId: string, suburbName: string) {
  const db = await getDb();
  if (!db) return { ga4Pages: [], gscPages: [] };
  try {
    const [ga4Pages, gscPages] = await Promise.all([
      db.select({ pagePath: ga4TerritoryPages.pagePath, sessions: ga4TerritoryPages.sessions })
        .from(ga4TerritoryPages)
        .where(eq(ga4TerritoryPages.territoryId, territoryId)),
      db.select({ pageUrl: gscPageMetrics.pageUrl, clicks: gscPageMetrics.clicks })
        .from(gscPageMetrics)
        .where(eq(gscPageMetrics.territoryId, territoryId)),
    ]);
    return {
      ga4Pages: ga4Pages.filter(row => dedicatedSuburbHubMatchesPage(row.pagePath, suburbName)),
      gscPages: gscPages.filter(row => dedicatedSuburbHubMatchesPage(row.pageUrl, suburbName)),
    };
  } catch (error) {
    console.warn(`[ReportingData] Suburb evidence unavailable for ${territoryId}/${suburbName}:`, error);
    return { ga4Pages: [], gscPages: [] };
  }
}

export function matchedMonthComparison(
  current: ReportingAnalyticsSnapshot | null,
  previous: ReportingAnalyticsSnapshot | null,
) {
  if (!current || !previous) return null;
  const previousGa4 = new Map(previous.ga4.monthly.filter(row => row.complete).map(row => [row.month, row]));
  const currentGa4 = current.ga4.monthly.filter(row => row.complete && previousGa4.has(row.month));
  const previousGsc = new Map(previous.gsc.monthly.map(row => [Number(row.month.slice(5, 7)), row]));
  const currentGsc = current.gsc.monthly.filter(row => previousGsc.has(Number(row.month.slice(5, 7))));
  const sum = <T>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);
  return {
    months: Array.from(new Set(currentGa4.map(row => row.month).concat(currentGsc.map(row => Number(row.month.slice(5, 7)))))).sort((a, b) => a - b),
    ga4: currentGa4.length ? {
      current: sum(currentGa4, row => row.sessions),
      previous: sum(currentGa4, row => previousGa4.get(row.month)!.sessions),
    } : null,
    gsc: currentGsc.length ? {
      current: sum(currentGsc, row => row.clicks),
      previous: sum(currentGsc, row => previousGsc.get(Number(row.month.slice(5, 7)))!.clicks),
    } : null,
  };
}
