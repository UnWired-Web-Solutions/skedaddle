/**
 * analyticsRouter.ts — tRPC procedures for the DashThis replacement analytics dashboard.
 * Provides GA4 session data and GBP metrics with territory filtering, date ranges, and YoY comparisons.
 * Uses the 19 parent territory groupings to aggregate sub-location data.
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  ga4Sessions,
  gbpMetrics,
  gscPageMetrics,
  gscQueryMetrics,
  salesforcePerformanceSnapshots,
} from "../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { TERRITORY_GROUPS, UNMAPPED_GA4, UNMAPPED_GBP, getSubLocations } from "../shared/territoryMapping";

// ─── Procedures ──────────────────────────────────────────────────────────────

export const analyticsRouter = router({
  /**
   * Get the 19 parent territories for the dropdowns.
   * Also includes an "All Network" option and any unmapped territories as "Other".
   */
  getTerritories: publicProcedure.query(async () => {
    const territories = TERRITORY_GROUPS.map(g => ({
      id: g.id,
      name: g.name,
    }));

    return {
      territories,
      // Keep raw lists available for drill-down
      hasGA4: true,
      hasGBP: true,
    };
  }),

  /**
   * Get available date range for data.
   */
  getDateRange: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {
      ga4: { minYear: 2022, maxYear: 2026 },
      gbp: { minYear: 2024, maxYear: 2026 },
      gsc: { minYear: 2026, maxYear: 2026 },
    };

    const [ga4Range] = await db
      .select({
        minYear: sql<number>`MIN(year)`,
        maxYear: sql<number>`MAX(year)`,
      })
      .from(ga4Sessions);

    const [gbpRange] = await db
      .select({
        minYear: sql<number>`MIN(year)`,
        maxYear: sql<number>`MAX(year)`,
      })
      .from(gbpMetrics);

    const [gscRange] = await db
      .select({
        minYear: sql<number>`MIN(year)`,
        maxYear: sql<number>`MAX(year)`,
      })
      .from(gscPageMetrics);

    return {
      ga4: { minYear: ga4Range.minYear, maxYear: ga4Range.maxYear },
      gbp: { minYear: gbpRange.minYear, maxYear: gbpRange.maxYear },
      gsc: { minYear: gscRange.minYear, maxYear: gscRange.maxYear },
    };
  }),

  /** Latest imported period, used by dashboards instead of hard-coded dates. */
  getLatestPeriod: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const [ga4Latest] = await db
      .select({ period: sql<number>`MAX(${ga4Sessions.year} * 100 + ${ga4Sessions.month})` })
      .from(ga4Sessions);
    const [gbpLatest] = await db
      .select({ period: sql<number>`MAX(${gbpMetrics.year} * 100 + ${gbpMetrics.month})` })
      .from(gbpMetrics);
    const [gscLatest] = await db
      .select({ period: sql<number>`MAX(${gscPageMetrics.year} * 100 + ${gscPageMetrics.month})` })
      .from(gscPageMetrics);

    const decode = (period: number | null | undefined) => period
      ? { year: Math.floor(Number(period) / 100), month: Number(period) % 100 }
      : null;
    const ga4 = decode(ga4Latest?.period);
    const gbp = decode(gbpLatest?.period);
    const gsc = decode(gscLatest?.period);
    // Use the latest period covered by both feeds (the earlier feed boundary)
    // so default reports do not silently pair a current metric with a missing one.
    const latest = [ga4, gbp]
      .filter((period): period is { year: number; month: number } => Boolean(period))
      .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))[0] || null;

    return { ga4, gbp, gsc, latest };
  }),

  /**
   * Get monthly trend data for charts — aggregates all sub-locations under a parent territory.
   */
  getMonthlyTrend: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      startYear: z.number(),
      endYear: z.number(),
      dataSource: z.enum(["ga4", "gbp"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const subLocations = getSubLocations(input.territoryId, input.dataSource);
      if (subLocations.length === 0) return [];

      if (input.dataSource === "ga4") {
        const results = await db
          .select({
            year: ga4Sessions.year,
            month: ga4Sessions.month,
            pageType: ga4Sessions.pageType,
            sessions: sql<number>`SUM(sessions)`,
          })
          .from(ga4Sessions)
          .where(and(
            inArray(ga4Sessions.territory, subLocations),
            sql`${ga4Sessions.year} >= ${input.startYear}`,
            sql`${ga4Sessions.year} <= ${input.endYear}`,
          ))
          .groupBy(ga4Sessions.year, ga4Sessions.month, ga4Sessions.pageType)
          .orderBy(ga4Sessions.year, ga4Sessions.month);

        return results;
      } else {
        const results = await db
          .select({
            year: gbpMetrics.year,
            month: gbpMetrics.month,
            metricType: gbpMetrics.metricType,
            value: sql<number>`SUM(value)`,
          })
          .from(gbpMetrics)
          .where(and(
            inArray(gbpMetrics.territory, subLocations),
            sql`${gbpMetrics.year} >= ${input.startYear}`,
            sql`${gbpMetrics.year} <= ${input.endYear}`,
          ))
          .groupBy(gbpMetrics.year, gbpMetrics.month, gbpMetrics.metricType)
          .orderBy(gbpMetrics.year, gbpMetrics.month);

        return results;
      }
    }),

  /**
   * Get YoY comparison for a specific month — compares current year to previous year.
   * Aggregates all sub-locations under the parent territory.
   */
  getYoYComparison: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      year: z.number(),
      month: z.number().min(1).max(12),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const { territoryId, year, month } = input;
      const prevYear = year - 1;
      const ga4Subs = getSubLocations(territoryId, "ga4");
      const gbpSubs = getSubLocations(territoryId, "gbp");

      // GA4 sessions comparison (aggregated across sub-locations)
      const currentGA4 = ga4Subs.length > 0 ? await db
        .select({
          pageType: ga4Sessions.pageType,
          sessions: sql<number>`SUM(sessions)`,
        })
        .from(ga4Sessions)
        .where(and(
          inArray(ga4Sessions.territory, ga4Subs),
          eq(ga4Sessions.year, year),
          eq(ga4Sessions.month, month),
        ))
        .groupBy(ga4Sessions.pageType) : [];

      const prevGA4 = ga4Subs.length > 0 ? await db
        .select({
          pageType: ga4Sessions.pageType,
          sessions: sql<number>`SUM(sessions)`,
        })
        .from(ga4Sessions)
        .where(and(
          inArray(ga4Sessions.territory, ga4Subs),
          eq(ga4Sessions.year, prevYear),
          eq(ga4Sessions.month, month),
        ))
        .groupBy(ga4Sessions.pageType) : [];

      // GBP metrics comparison (aggregated across sub-locations)
      const currentGBP = gbpSubs.length > 0 ? await db
        .select({
          metricType: gbpMetrics.metricType,
          value: sql<number>`SUM(value)`,
        })
        .from(gbpMetrics)
        .where(and(
          inArray(gbpMetrics.territory, gbpSubs),
          eq(gbpMetrics.year, year),
          eq(gbpMetrics.month, month),
        ))
        .groupBy(gbpMetrics.metricType) : [];

      const prevGBP = gbpSubs.length > 0 ? await db
        .select({
          metricType: gbpMetrics.metricType,
          value: sql<number>`SUM(value)`,
        })
        .from(gbpMetrics)
        .where(and(
          inArray(gbpMetrics.territory, gbpSubs),
          eq(gbpMetrics.year, prevYear),
          eq(gbpMetrics.month, month),
        ))
        .groupBy(gbpMetrics.metricType) : [];

      return {
        ga4: { current: currentGA4, previous: prevGA4 },
        gbp: { current: currentGBP, previous: prevGBP },
        year,
        prevYear,
        month,
      };
    }),

  /**
   * Get summary KPIs for a territory — total sessions and GBP metrics for a given period.
   * Aggregates all sub-locations under the parent territory.
   */
  getSummaryKPIs: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      year: z.number(),
      month: z.number().min(1).max(12).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const { territoryId, year, month } = input;
      const ga4Subs = getSubLocations(territoryId, "ga4");
      const gbpSubs = getSubLocations(territoryId, "gbp");

      const ga4Conditions: any[] = [
        inArray(ga4Sessions.territory, ga4Subs.length > 0 ? ga4Subs : [""]),
        eq(ga4Sessions.year, year),
      ];
      if (month) ga4Conditions.push(eq(ga4Sessions.month, month));

      const gbpConditions: any[] = [
        inArray(gbpMetrics.territory, gbpSubs.length > 0 ? gbpSubs : [""]),
        eq(gbpMetrics.year, year),
      ];
      if (month) gbpConditions.push(eq(gbpMetrics.month, month));

      const [ga4Summary] = await db
        .select({ total: sql<number>`SUM(sessions)` })
        .from(ga4Sessions)
        .where(and(...ga4Conditions, inArray(ga4Sessions.pageType, ["species_pages", "location_page"])));

      const gbpSummary = await db
        .select({
          metricType: gbpMetrics.metricType,
          total: sql<number>`SUM(value)`,
        })
        .from(gbpMetrics)
        .where(and(...gbpConditions))
        .groupBy(gbpMetrics.metricType);

      return {
        totalSessions: ga4Summary?.total || 0,
        gbp: Object.fromEntries(gbpSummary.map(r => [r.metricType, r.total])),
      };
    }),

  /**
   * DashThis replacement: domain-property Search Console totals, top 25 pages,
   * and top 25 queries for an explicitly territory-filtered monthly import.
   */
  getSearchConsoleOverview: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const conditions = and(
        eq(gscPageMetrics.territoryId, input.territoryId),
        eq(gscPageMetrics.year, input.year),
        eq(gscPageMetrics.month, input.month),
      );
      const queryConditions = and(
        eq(gscQueryMetrics.territoryId, input.territoryId),
        eq(gscQueryMetrics.year, input.year),
        eq(gscQueryMetrics.month, input.month),
      );

      const [pages, queries] = await Promise.all([
        db.select().from(gscPageMetrics).where(conditions),
        db.select().from(gscQueryMetrics).where(queryConditions),
      ]);

      const summarize = <T extends { clicks: number; impressions: number; positionHundredths: number }>(rows: T[]) => {
        const clicks = rows.reduce((sum, row) => sum + Number(row.clicks), 0);
        const impressions = rows.reduce((sum, row) => sum + Number(row.impressions), 0);
        const weightedPosition = rows.reduce(
          (sum, row) => sum + Number(row.positionHundredths) * Number(row.impressions),
          0,
        );
        return {
          clicks,
          impressions,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
          averagePosition: impressions > 0 ? weightedPosition / impressions / 100 : 0,
        };
      };

      const mapRow = <T extends { clicks: number; impressions: number; positionHundredths: number }>(row: T) => ({
        ...row,
        clicks: Number(row.clicks),
        impressions: Number(row.impressions),
        ctr: Number(row.impressions) > 0 ? (Number(row.clicks) / Number(row.impressions)) * 100 : 0,
        position: Number(row.positionHundredths) / 100,
      });

      return {
        dataAvailable: pages.length > 0 || queries.length > 0,
        summary: summarize(pages),
        topPages: pages.sort((a, b) => Number(b.clicks) - Number(a.clicks)).slice(0, 25).map(mapRow),
        topQueries: queries.sort((a, b) => Number(b.clicks) - Number(a.clicks)).slice(0, 25).map(mapRow),
        sourceProperty: pages[0]?.sourceProperty || queries[0]?.sourceProperty || null,
        pathPrefix: pages[0]?.pathPrefix || queries[0]?.pathPrefix || null,
      };
    }),

  /** Latest verified Salesforce inspection-to-sale snapshot for a territory. */
  getTerritoryCloseRate: publicProcedure
    .input(z.object({ territoryId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [latest] = await db
        .select({ periodEnd: sql<string>`MAX(${salesforcePerformanceSnapshots.periodEnd})` })
        .from(salesforcePerformanceSnapshots)
        .where(eq(salesforcePerformanceSnapshots.territoryId, input.territoryId));
      if (!latest?.periodEnd) return null;

      const rows = await db
        .select()
        .from(salesforcePerformanceSnapshots)
        .where(and(
          eq(salesforcePerformanceSnapshots.territoryId, input.territoryId),
          eq(salesforcePerformanceSnapshots.periodEnd, latest.periodEnd),
        ));
      const total = rows.find(row => row.species === "__ALL__");
      if (!total) return null;

      const toResult = (row: (typeof rows)[number]) => ({
        species: row.species,
        inspections: Number(row.inspections),
        closedJobs: Number(row.closedJobs),
        closeRate: Number(row.inspections) > 0 ? Number(row.closedJobs) / Number(row.inspections) * 100 : null,
      });

      return {
        periodStart: total.periodStart,
        periodEnd: total.periodEnd,
        sourceLabel: total.sourceLabel,
        total: toResult(total),
        species: rows.filter(row => row.species !== "__ALL__").map(toResult),
      };
    }),

  /**
   * Get automated insights — detects significant anomalies across all 19 parent territories.
   * Aggregates sub-locations before comparing YoY.
   */
  getInsights: publicProcedure
    .input(z.object({
      year: z.number(),
      month: z.number().min(1).max(12),
      territoryId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { year, month, territoryId } = input;
      const prevYear = year - 1;
      const insights: Array<{
        type: "warning" | "success" | "info";
        territory: string;
        territoryId: string;
        metric: string;
        message: string;
        currentValue: number;
        previousValue: number;
        changePercent: number;
      }> = [];

      // If a specific territory is selected, only check that one; otherwise check all 19
      const groupsToCheck = territoryId
        ? TERRITORY_GROUPS.filter(g => g.id === territoryId)
        : TERRITORY_GROUPS;

      for (const group of groupsToCheck) {
        // GA4 sessions YoY
        if (group.ga4Territories.length > 0) {
          const [currentRow] = await db
            .select({ sessions: sql<number>`SUM(sessions)` })
            .from(ga4Sessions)
            .where(and(
              inArray(ga4Sessions.territory, group.ga4Territories),
              eq(ga4Sessions.year, year),
              eq(ga4Sessions.month, month),
              inArray(ga4Sessions.pageType, ["species_pages", "location_page"]),
            ));

          const [prevRow] = await db
            .select({ sessions: sql<number>`SUM(sessions)` })
            .from(ga4Sessions)
            .where(and(
              inArray(ga4Sessions.territory, group.ga4Territories),
              eq(ga4Sessions.year, prevYear),
              eq(ga4Sessions.month, month),
              inArray(ga4Sessions.pageType, ["species_pages", "location_page"]),
            ));

          const current = Number(currentRow?.sessions || 0);
          const prev = Number(prevRow?.sessions || 0);

          // Lower thresholds for territory-specific view to show more granular insights
          const minPrev = territoryId ? 50 : 100;
          const dropThreshold = territoryId ? -10 : -20;
          const growthThreshold = territoryId ? 15 : 30;

          if (prev >= minPrev) {
            const pct = ((current - prev) / prev) * 100;
            if (pct <= dropThreshold) {
              insights.push({
                type: "warning",
                territory: group.name,
                territoryId: group.id,
                metric: "priority_page_sessions",
                message: `Species + location page sessions dropped ${Math.abs(pct).toFixed(0)}% (${prev.toLocaleString()} → ${current.toLocaleString()})`,
                currentValue: current,
                previousValue: prev,
                changePercent: pct,
              });
            } else if (pct >= growthThreshold) {
              insights.push({
                type: "success",
                territory: group.name,
                territoryId: group.id,
                metric: "priority_page_sessions",
                message: `Species + location page sessions grew ${pct.toFixed(0)}% (${prev.toLocaleString()} → ${current.toLocaleString()})`,
                currentValue: current,
                previousValue: prev,
                changePercent: pct,
              });
            }
          }
        }

        // GBP calls YoY
        if (group.gbpTerritories.length > 0) {
          const currentGBP = await db
            .select({
              metricType: gbpMetrics.metricType,
              value: sql<number>`SUM(value)`,
            })
            .from(gbpMetrics)
            .where(and(
              inArray(gbpMetrics.territory, group.gbpTerritories),
              eq(gbpMetrics.year, year),
              eq(gbpMetrics.month, month),
            ))
            .groupBy(gbpMetrics.metricType);

          const prevGBPData = await db
            .select({
              metricType: gbpMetrics.metricType,
              value: sql<number>`SUM(value)`,
            })
            .from(gbpMetrics)
            .where(and(
              inArray(gbpMetrics.territory, group.gbpTerritories),
              eq(gbpMetrics.year, prevYear),
              eq(gbpMetrics.month, month),
            ))
            .groupBy(gbpMetrics.metricType);

          const prevGBPMap = new Map(prevGBPData.map(r => [r.metricType, Number(r.value)]));

          for (const row of currentGBP) {
            if (row.metricType === "total" || row.metricType === "bookings") continue;
            const prev = prevGBPMap.get(row.metricType);
            if (!prev || prev < 15) continue;
            const current = Number(row.value);
            const pct = ((current - prev) / prev) * 100;

            const gbpDropThreshold = territoryId ? -15 : -30;
            const gbpGrowthThreshold = territoryId ? 25 : 50;

            if (pct <= gbpDropThreshold) {
              const metricLabel = row.metricType === "calls" ? "calls" : row.metricType === "website_clicks" ? "website clicks" : "direction requests";
              insights.push({
                type: "warning",
                territory: group.name,
                territoryId: group.id,
                metric: row.metricType,
                message: `GBP ${metricLabel} dropped ${Math.abs(pct).toFixed(0)}% (${prev.toLocaleString()} → ${current.toLocaleString()})`,
                currentValue: current,
                previousValue: prev,
                changePercent: pct,
              });
            } else if (pct >= gbpGrowthThreshold) {
              const metricLabel = row.metricType === "calls" ? "calls" : row.metricType === "website_clicks" ? "website clicks" : "direction requests";
              insights.push({
                type: "success",
                territory: group.name,
                territoryId: group.id,
                metric: row.metricType,
                message: `GBP ${metricLabel} grew ${pct.toFixed(0)}% (${prev.toLocaleString()} → ${current.toLocaleString()})`,
                currentValue: current,
                previousValue: prev,
                changePercent: pct,
              });
            }
          }
        }
      }

      // Sort by absolute change (biggest anomalies first)
      insights.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

      // When filtering to a single territory, lower the thresholds to show more granular insights
      if (territoryId) {
        return insights.slice(0, 10);
      }
      return insights.slice(0, 10); // Top 10 insights
    }),
});
