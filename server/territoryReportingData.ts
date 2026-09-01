import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  ga4ImportRuns,
  ga4TerritoryMonthly,
  ga4TerritoryPages,
  gscPageMetrics,
  gscQueryMetrics,
  salesforcePerformanceSnapshots,
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

export async function loadTerritoryCloseRate(territoryId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(salesforcePerformanceSnapshots).where(and(
    eq(salesforcePerformanceSnapshots.territoryId, territoryId),
    eq(salesforcePerformanceSnapshots.species, "__ALL__"),
  )).orderBy(desc(salesforcePerformanceSnapshots.importedAt)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const networkRows = await db.select({
    territoryId: salesforcePerformanceSnapshots.territoryId,
    inspections: salesforcePerformanceSnapshots.inspections,
    closedJobs: salesforcePerformanceSnapshots.closedJobs,
    importedAt: salesforcePerformanceSnapshots.importedAt,
  }).from(salesforcePerformanceSnapshots).where(and(
    eq(salesforcePerformanceSnapshots.species, "__ALL__"),
    eq(salesforcePerformanceSnapshots.periodStart, row.periodStart),
    eq(salesforcePerformanceSnapshots.periodEnd, row.periodEnd),
  ));
  const latestByTerritory = new Map<string, (typeof networkRows)[number]>();
  for (const item of networkRows) {
    const prior = latestByTerritory.get(item.territoryId);
    if (!prior || item.importedAt > prior.importedAt) latestByTerritory.set(item.territoryId, item);
  }
  const latestNetworkRows = Array.from(latestByTerritory.values());
  const networkInspections = latestNetworkRows.reduce((sum, item) => sum + Number(item.inspections), 0);
  const networkClosedJobs = latestNetworkRows.reduce((sum, item) => sum + Number(item.closedJobs), 0);
  return {
    inspections: Number(row.inspections),
    closedJobs: Number(row.closedJobs),
    closeRate: Number(row.inspections) > 0 ? Number(row.closedJobs) / Number(row.inspections) * 100 : null,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    sourceLabel: row.sourceLabel,
    networkInspections,
    networkClosedJobs,
    networkCloseRate: networkInspections > 0 ? networkClosedJobs / networkInspections * 100 : null,
  };
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
