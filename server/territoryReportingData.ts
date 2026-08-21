import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  ga4ImportRuns,
  ga4TerritoryMonthly,
  ga4TerritoryPages,
  gscPageMetrics,
} from "../drizzle/schema";
import { suburbSlugMatchesPage } from "../shared/ga4PageClassifier";
import { getDb } from "./db";

export type ReportingAnalyticsSnapshot = {
  ga4: {
    monthly: Array<{
      year: number;
      month: number;
      sessions: number;
      activeUsers: number;
      priorityPageSessions: number;
      complete: boolean;
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
  };
};

export async function loadTerritoryReportingAnalytics(
  territoryId: string,
): Promise<ReportingAnalyticsSnapshot | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const [ga4MonthlyRows, ga4TopPages, latestRuns, gscMonthlyRows, gscTopPages] = await Promise.all([
      db.select().from(ga4TerritoryMonthly)
        .where(eq(ga4TerritoryMonthly.territoryId, territoryId))
        .orderBy(ga4TerritoryMonthly.year, ga4TerritoryMonthly.month),
      db.select({
        pagePath: ga4TerritoryPages.pagePath,
        pageType: ga4TerritoryPages.pageType,
        sessions: sql<number>`SUM(${ga4TerritoryPages.sessions})`,
        activeUsers: sql<number>`SUM(${ga4TerritoryPages.activeUsers})`,
      }).from(ga4TerritoryPages)
        .where(eq(ga4TerritoryPages.territoryId, territoryId))
        .groupBy(ga4TerritoryPages.pagePath, ga4TerritoryPages.pageType)
        .orderBy(desc(sql`SUM(${ga4TerritoryPages.sessions})`))
        .limit(1000),
      db.select().from(ga4ImportRuns)
        .where(and(
          eq(ga4ImportRuns.territoryId, territoryId),
          ne(ga4ImportRuns.status, "failed"),
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
        .where(eq(gscPageMetrics.territoryId, territoryId))
        .groupBy(gscPageMetrics.year, gscPageMetrics.month)
        .orderBy(gscPageMetrics.year, gscPageMetrics.month),
      db.select({
        pageUrl: gscPageMetrics.pageUrl,
        clicks: sql<number>`SUM(${gscPageMetrics.clicks})`,
        impressions: sql<number>`SUM(${gscPageMetrics.impressions})`,
      }).from(gscPageMetrics)
        .where(eq(gscPageMetrics.territoryId, territoryId))
        .groupBy(gscPageMetrics.pageUrl)
        .orderBy(desc(sql`SUM(${gscPageMetrics.clicks})`))
        .limit(1000),
    ]);

    const run = latestRuns[0] ?? null;
    const ga4Monthly = ga4MonthlyRows.map(row => ({
      year: row.year,
      month: row.month,
      sessions: Number(row.sessions),
      activeUsers: Number(row.activeUsers),
      priorityPageSessions: Number(row.priorityPageSessions),
      complete: Number(row.propertiesSucceeded) === Number(row.propertiesExpected),
    }));
    const gscMonthly = gscMonthlyRows.map(row => {
      const impressions = Number(row.impressions);
      return {
        month: `${row.year}-${String(row.month).padStart(2, "0")}`,
        clicks: Number(row.clicks),
        impressions,
        avg_position: impressions > 0 ? Number(row.weightedPosition) / impressions / 100 : 0,
      };
    });

    return {
      ga4: {
        monthly: ga4Monthly,
        totalSessions: ga4Monthly.reduce((sum, row) => sum + row.sessions, 0),
        totalPriorityPageSessions: ga4Monthly.reduce((sum, row) => sum + row.priorityPageSessions, 0),
        completeMonths: ga4Monthly.filter(row => row.complete).length,
        partialMonths: ga4Monthly.filter(row => !row.complete).length,
        topPages: ga4TopPages.map(row => ({
          pagePath: row.pagePath,
          pageType: row.pageType,
          sessions: Number(row.sessions),
          activeUsers: Number(row.activeUsers),
        })),
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
        topPages: gscTopPages.map(row => ({
          pageUrl: row.pageUrl,
          clicks: Number(row.clicks),
          impressions: Number(row.impressions),
        })),
      },
    };
  } catch (error) {
    console.warn(`[ReportingData] Live analytics unavailable for ${territoryId}:`, error);
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
      ga4Pages: ga4Pages.filter(row => suburbSlugMatchesPage(row.pagePath, suburbName)),
      gscPages: gscPages.filter(row => suburbSlugMatchesPage(row.pageUrl, suburbName)),
    };
  } catch (error) {
    console.warn(`[ReportingData] Suburb evidence unavailable for ${territoryId}/${suburbName}:`, error);
    return { ga4Pages: [], gscPages: [] };
  }
}
