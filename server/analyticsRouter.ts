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
  ga4ImportRuns,
  ga4TerritoryMonthly,
  ga4TerritoryPages,
  gbpMetrics,
  gbpTerritoryMonthly,
  gscPageMetrics,
  gscQueryMetrics,
  salesforcePerformanceSnapshots,
} from "../drizzle/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { TERRITORY_GROUPS, UNMAPPED_GA4, UNMAPPED_GBP, getSubLocations } from "../shared/territoryMapping";
import { verifySearchConsoleAccess } from "./googleSearchConsoleClient";
import { verifyGA4Access } from "./googleAnalyticsClient";
import { fetchGA4TerritorySessionsMonthly, fetchGA4TerritoryTopPages, fetchGA4TerritoryTopCities, fetchGA4TerritoryChannelBreakdown, getGA4ReadyTerritories } from "./googleAnalyticsClient";
import { importGA4TerritoryMonth } from "./googleAnalyticsImporter";
import { importSearchConsoleTerritoryMonth } from "./googleSearchConsoleImporter";
import { getGscTerritoryScope } from "../shared/gscTerritoryPaths";
import { GSC_TERRITORY_SCOPES } from "../shared/gscTerritoryPaths";
import { getGA4MappingSummary } from "../shared/ga4TerritoryProperties";
import { getGBPMappingSummary } from "../shared/gbpLocationRegistry";
import { hasGBPAuthConfiguration, hasGBPOAuthClientConfiguration } from "./googleBusinessProfileClient";
import { isGBPYoYEligible } from "../shared/gbpDataSafety";
import { loadResolvedGBPMonthly } from "./gbpReportingData";

// ─── Procedures ──────────────────────────────────────────────────────────────

export const analyticsRouter = router({
  /** Confirm the server-side read-only GSC connection without returning credential material. */
  getSearchConsoleConnectionStatus: publicProcedure.query(async () => {
    try {
      return await verifySearchConsoleAccess();
    } catch (error) {
      return {
        connected: false as const,
        property: null,
        permissionLevel: null,
        error: error instanceof Error ? error.message : "Unable to verify Search Console access.",
      };
    }
  }),

  /** Confirm the server-side GA4 Data API connection status. */
  getGA4ConnectionStatus: publicProcedure.query(async () => {
    try {
      return await verifyGA4Access();
    } catch (error) {
      return {
        connected: false,
        accountId: "39401450",
        territoriesAvailable: 0,
        error: error instanceof Error ? error.message : "Unable to verify GA4 access.",
      };
    }
  }),

  /** Get GA4 monthly sessions for a territory (aggregated across all sub-location properties). */
  getGA4TerritoryMonthly: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => fetchGA4TerritorySessionsMonthly(input.territoryId, input.startDate, input.endDate)),

  /** Get GA4 top pages for a territory (aggregated across all sub-location properties). */
  getGA4TerritoryTopPages: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      limit: z.number().optional().default(25),
    }))
    .query(async ({ input }) => fetchGA4TerritoryTopPages(input.territoryId, input.startDate, input.endDate, input.limit)),

  /** Get GA4 top cities for a territory (aggregated across all sub-location properties). */
  getGA4TerritoryTopCities: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      limit: z.number().optional().default(20),
    }))
    .query(async ({ input }) => fetchGA4TerritoryTopCities(input.territoryId, input.startDate, input.endDate, input.limit)),

  /** Get GA4 channel breakdown for a territory (aggregated across all sub-location properties). */
  getGA4TerritoryChannelBreakdown: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => fetchGA4TerritoryChannelBreakdown(input.territoryId, input.startDate, input.endDate)),

  /** List all territories that have GA4 properties mapped and ready for data pull. */
  getGA4ReadyTerritories: publicProcedure.query(() => getGA4ReadyTerritories()),

  /** Auditable mapping counts; account discovery and territory assignment are not conflated. */
  getGA4MappingStatus: publicProcedure.query(() => getGA4MappingSummary()),

  /**
   * Read-only implementation status for the pending live GBP feed. It reports
   * no metric values and makes no Google request, so a zero Performance API
   * quota cannot be mistaken for an active data connection.
   */
  getGBPIntegrationStatus: publicProcedure.query(() => ({
    liveDataActive: false,
    approval: {
      status: "pending_google_allowlist_review" as const,
      caseId: "6-1216000040949",
      statedReviewWindow: "approximately 7–10 business days",
      performanceQuotaLastVerified: 0,
    },
    oauthClientConfigured: hasGBPOAuthClientConfiguration(),
    oauthRefreshAuthorizationConfigured: hasGBPAuthConfiguration(),
    mapping: getGBPMappingSummary(),
    nextRequirements: [
      "Google must approve Business Profile Performance API access and assign a nonzero quota.",
      "A UWS business.manage offline OAuth authorization must be stored through project secrets.",
      "Authoritative API location resources must be reconciled with the candidate mapping registry.",
      "One completed historical month must reconcile across the API response, raw rows, territory rollup, and dashboard before broader use.",
    ],
  })),

  /** Import one completed GA4 month into the durable territory reporting tables. */
  syncGA4TerritoryMonth: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .mutation(({ input }) => importGA4TerritoryMonth(input.territoryId, input.year, input.month)),

  /** Latest import coverage for the selected territory. */
  getGA4ImportStatus: publicProcedure
    .input(z.object({ territoryId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [latest] = await db.select().from(ga4ImportRuns)
        .where(eq(ga4ImportRuns.territoryId, input.territoryId))
        .orderBy(desc(ga4ImportRuns.importedAt))
        .limit(1);
      if (!latest) return null;
      let failedProperties: Array<{ propertyId: string; error: string }> = [];
      try {
        failedProperties = latest.failedPropertiesJson
          ? JSON.parse(latest.failedPropertiesJson)
          : [];
      } catch {
        failedProperties = [];
      }
      return { ...latest, failedProperties };
    }),

  /**
   * Pull a completed calendar month from the live parent-domain property.
   * The importer rejects partial, overlapping, or otherwise unverified
   * territory scopes before it requests or persists Google data.
   */
  syncSearchConsoleTerritory: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .mutation(async ({ input }) => importSearchConsoleTerritoryMonth(
      input.territoryId,
      input.year,
      input.month,
    )),

  /** Surface the import decision without exposing credentials or mutable scope configuration. */
  getSearchConsoleScope: publicProcedure
    .input(z.object({ territoryId: z.string() }))
    .query(({ input }) => getGscTerritoryScope(input.territoryId) ?? null),

  /**
   * GSC YTD summary with YoY comparison — sums all imported months in the
   * selected year and compares to the same months in the previous year.
   * This powers the "YTD Organic Clicks" KPI card in the DashThis replacement.
   */
  getSearchConsoleYTD: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      year: z.number().int(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const { territoryId, year } = input;
      const prevYear = year - 1;

      // Current year totals
      const [currentPages] = await db
        .select({
          clicks: sql<number>`COALESCE(SUM(${gscPageMetrics.clicks}), 0)`,
          impressions: sql<number>`COALESCE(SUM(${gscPageMetrics.impressions}), 0)`,
          months: sql<number>`COUNT(DISTINCT ${gscPageMetrics.month})`,
        })
        .from(gscPageMetrics)
        .where(and(
          eq(gscPageMetrics.territoryId, territoryId),
          eq(gscPageMetrics.year, year),
        ));

      // Previous year totals (same months only for fair comparison)
      const currentMonths = await db
        .selectDistinct({ month: gscPageMetrics.month })
        .from(gscPageMetrics)
        .where(and(
          eq(gscPageMetrics.territoryId, territoryId),
          eq(gscPageMetrics.year, year),
        ));
      const monthList = currentMonths.map(r => r.month);

      const [prevPages] = monthList.length > 0
        ? await db
          .select({
            clicks: sql<number>`COALESCE(SUM(${gscPageMetrics.clicks}), 0)`,
            impressions: sql<number>`COALESCE(SUM(${gscPageMetrics.impressions}), 0)`,
            months: sql<number>`COUNT(DISTINCT ${gscPageMetrics.month})`,
          })
          .from(gscPageMetrics)
          .where(and(
            eq(gscPageMetrics.territoryId, territoryId),
            eq(gscPageMetrics.year, prevYear),
            inArray(gscPageMetrics.month, monthList),
          ))
        : [{ clicks: 0, impressions: 0, months: 0 }];

      const currentClicks = Number(currentPages?.clicks || 0);
      const prevClicks = Number(prevPages?.clicks || 0);
      const currentImpressions = Number(currentPages?.impressions || 0);
      const prevImpressions = Number(prevPages?.impressions || 0);

      return {
        year,
        prevYear,
        monthsCovered: Number(currentPages?.months || 0),
        prevMonthsCovered: Number(prevPages?.months || 0),
        clicks: { current: currentClicks, previous: prevClicks },
        impressions: { current: currentImpressions, previous: prevImpressions },
        ctr: {
          current: currentImpressions > 0 ? (currentClicks / currentImpressions) * 100 : 0,
          previous: prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0,
        },
      };
    }),

  /**
   * GSC monthly trend — clicks and impressions by month for a territory.
   * Powers the organic search trend line chart in the DashThis replacement.
   */
  getSearchConsoleMonthlyTrend: publicProcedure
    .input(z.object({
      territoryId: z.string(),
      startYear: z.number().int(),
      endYear: z.number().int(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select({
          year: gscPageMetrics.year,
          month: gscPageMetrics.month,
          clicks: sql<number>`SUM(${gscPageMetrics.clicks})`,
          impressions: sql<number>`SUM(${gscPageMetrics.impressions})`,
        })
        .from(gscPageMetrics)
        .where(and(
          eq(gscPageMetrics.territoryId, input.territoryId),
          sql`${gscPageMetrics.year} >= ${input.startYear}`,
          sql`${gscPageMetrics.year} <= ${input.endYear}`,
        ))
        .groupBy(gscPageMetrics.year, gscPageMetrics.month)
        .orderBy(gscPageMetrics.year, gscPageMetrics.month);

      return results.map(row => ({
        year: row.year,
        month: row.month,
        clicks: Number(row.clicks),
        impressions: Number(row.impressions),
        ctr: Number(row.impressions) > 0 ? (Number(row.clicks) / Number(row.impressions)) * 100 : 0,
      }));
    }),

  /**
   * List all territories that have GSC data available (ready status).
   * Used by the dashboard to show which territories have organic search data.
   */
  getSearchConsoleReadyTerritories: publicProcedure.query(() => {
    return GSC_TERRITORY_SCOPES
      .filter(t => t.status === "ready")
      .map(t => ({ id: t.territoryId, paths: t.registeredPaths, notes: t.notes }));
  }),

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

    const [legacyGa4Range] = await db
      .select({
        minYear: sql<number>`MIN(year)`,
        maxYear: sql<number>`MAX(year)`,
      })
      .from(ga4Sessions);
    const [liveGa4Range] = await db
      .select({
        minYear: sql<number>`MIN(${ga4TerritoryMonthly.year})`,
        maxYear: sql<number>`MAX(${ga4TerritoryMonthly.year})`,
      })
      .from(ga4TerritoryMonthly);

    const [legacyGbpRange] = await db
      .select({
        minYear: sql<number>`MIN(year)`,
        maxYear: sql<number>`MAX(year)`,
      })
      .from(gbpMetrics);
    const [liveGbpRange] = await db
      .select({
        minYear: sql<number>`MIN(${gbpTerritoryMonthly.year})`,
        maxYear: sql<number>`MAX(${gbpTerritoryMonthly.year})`,
      })
      .from(gbpTerritoryMonthly);

    const [gscRange] = await db
      .select({
        minYear: sql<number>`MIN(year)`,
        maxYear: sql<number>`MAX(year)`,
      })
      .from(gscPageMetrics);

    const gbpMinYears = [legacyGbpRange?.minYear, liveGbpRange?.minYear]
      .filter((value): value is number => value !== null && value !== undefined)
      .map(Number);
    const gbpMaxYears = [legacyGbpRange?.maxYear, liveGbpRange?.maxYear]
      .filter((value): value is number => value !== null && value !== undefined)
      .map(Number);

    return {
      ga4: {
        minYear: liveGa4Range?.minYear ?? legacyGa4Range?.minYear,
        maxYear: liveGa4Range?.maxYear ?? legacyGa4Range?.maxYear,
      },
      gbp: {
        minYear: gbpMinYears.length ? Math.min(...gbpMinYears) : null,
        maxYear: gbpMaxYears.length ? Math.max(...gbpMaxYears) : null,
      },
      gsc: { minYear: gscRange.minYear, maxYear: gscRange.maxYear },
    };
  }),

  /** Latest imported period, used by dashboards instead of hard-coded dates. */
  getLatestPeriod: publicProcedure
    .input(z.object({ territoryId: z.string().optional() }).optional())
    .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;

    const territoryId = input?.territoryId;
    const ga4Subs = territoryId ? getSubLocations(territoryId, "ga4") : [];

    const [legacyGa4Latest] = await db
      .select({ period: sql<number>`MAX(${ga4Sessions.year} * 100 + ${ga4Sessions.month})` })
      .from(ga4Sessions)
      .where(territoryId ? (ga4Subs.length ? inArray(ga4Sessions.territory, ga4Subs) : sql`1 = 0`) : undefined);
    const [liveGa4Latest] = await db
      .select({ period: sql<number>`MAX(${ga4TerritoryMonthly.year} * 100 + ${ga4TerritoryMonthly.month})` })
      .from(ga4TerritoryMonthly)
      .where(and(
        territoryId ? eq(ga4TerritoryMonthly.territoryId, territoryId) : undefined,
        sql`${ga4TerritoryMonthly.propertiesExpected} > 0`,
        eq(ga4TerritoryMonthly.propertiesSucceeded, ga4TerritoryMonthly.propertiesExpected),
      ));
    const [legacyGbpLatest] = await db
      .select({ period: sql<number>`MAX(${gbpMetrics.year} * 100 + ${gbpMetrics.month})` })
      .from(gbpMetrics);
    const [liveGbpLatest] = await db
      .select({ period: sql<number>`MAX(${gbpTerritoryMonthly.year} * 100 + ${gbpTerritoryMonthly.month})` })
      .from(gbpTerritoryMonthly)
      .where(and(
        eq(gbpTerritoryMonthly.coverageStatus, "complete"),
        sql`${gbpTerritoryMonthly.value} IS NOT NULL`,
      ));
    const [gscLatest] = await db
      .select({ period: sql<number>`MAX(${gscPageMetrics.year} * 100 + ${gscPageMetrics.month})` })
      .from(gscPageMetrics)
      .where(territoryId ? eq(gscPageMetrics.territoryId, territoryId) : undefined);

    const decode = (period: number | null | undefined) => period
      ? { year: Math.floor(Number(period) / 100), month: Number(period) % 100 }
      : null;
    const ga4 = decode(liveGa4Latest?.period) ?? decode(legacyGa4Latest?.period);
    const territoryGBP = territoryId ? await loadResolvedGBPMonthly({
      db,
      territoryId,
      startYear: 2000,
      endYear: 2100,
    }) : null;
    const latestTerritoryGBPPeriod = territoryGBP
      ?.filter(row => row.value !== null && (row.source === "persisted_business_profile_api" || row.source === "legacy_spreadsheet"))
      .reduce<number | null>((latestPeriod, row) => {
        const period = row.year * 100 + row.month;
        return latestPeriod === null || period > latestPeriod ? period : latestPeriod;
      }, null);
    const latestGlobalGBPPeriod = Math.max(
      Number(legacyGbpLatest?.period || 0),
      Number(liveGbpLatest?.period || 0),
    ) || null;
    const gbp = decode(territoryId ? latestTerritoryGBPPeriod : latestGlobalGBPPeriod);
    const gsc = decode(gscLatest?.period);
    // Use the latest period covered by all three territory feeds (the earliest
    // boundary) so the brief never pairs a current metric with a missing one.
    const latest = ga4 && gbp && gsc
      ? [ga4, gbp, gsc].sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))[0]
      : null;

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

      if (input.dataSource === "ga4") {
        if (subLocations.length === 0) return [];
        const [liveResults, coverageRows] = await Promise.all([
          db.select({
              year: ga4TerritoryPages.year,
              month: ga4TerritoryPages.month,
              pageType: ga4TerritoryPages.pageType,
              sessions: sql<number>`SUM(${ga4TerritoryPages.sessions})`,
            })
            .from(ga4TerritoryPages)
            .where(and(
              eq(ga4TerritoryPages.territoryId, input.territoryId),
              sql`${ga4TerritoryPages.year} >= ${input.startYear}`,
              sql`${ga4TerritoryPages.year} <= ${input.endYear}`,
            ))
            .groupBy(ga4TerritoryPages.year, ga4TerritoryPages.month, ga4TerritoryPages.pageType)
            .orderBy(ga4TerritoryPages.year, ga4TerritoryPages.month),
          db.select({
              year: ga4TerritoryMonthly.year,
              month: ga4TerritoryMonthly.month,
              propertiesExpected: ga4TerritoryMonthly.propertiesExpected,
              propertiesSucceeded: ga4TerritoryMonthly.propertiesSucceeded,
            })
            .from(ga4TerritoryMonthly)
            .where(and(
              eq(ga4TerritoryMonthly.territoryId, input.territoryId),
              sql`${ga4TerritoryMonthly.year} >= ${input.startYear}`,
              sql`${ga4TerritoryMonthly.year} <= ${input.endYear}`,
            )),
        ]);
        const legacyResults = await db
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

        if (coverageRows.length > 0) {
          const coverageByPeriod = new Map(coverageRows.map(row => [`${row.year}-${row.month}`, row]));
          const livePeriods = new Set(coverageRows.map(row => `${row.year}-${row.month}`));
          const priorityRows = [...liveResults];
          for (const coverage of coverageRows) {
            for (const pageType of ["species_pages", "location_page"] as const) {
              if (!priorityRows.some(row => row.year === coverage.year && row.month === coverage.month && row.pageType === pageType)) {
                priorityRows.push({ year: coverage.year, month: coverage.month, pageType, sessions: 0 });
              }
            }
          }
          const coveredLiveResults = priorityRows.map(row => {
            const coverage = coverageByPeriod.get(`${row.year}-${row.month}`);
            return {
              ...row,
              source: "persisted_data_api" as const,
              propertiesExpected: coverage?.propertiesExpected ?? 0,
              propertiesSucceeded: coverage?.propertiesSucceeded ?? 0,
              complete: Boolean(coverage && coverage.propertiesExpected === coverage.propertiesSucceeded),
            };
          });
          const uncoveredLegacyResults = legacyResults
            .filter(row => !livePeriods.has(`${row.year}-${row.month}`))
            .map(row => ({ ...row, source: "legacy_spreadsheet" as const }));
          return [...uncoveredLegacyResults, ...coveredLiveResults]
            .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
        }

        return legacyResults.map(row => ({ ...row, source: "legacy_spreadsheet" as const }));

      } else {
        return loadResolvedGBPMonthly({
          db,
          territoryId: input.territoryId,
          startYear: input.startYear,
          endYear: input.endYear,
        });
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

      // GA4 sessions comparison (aggregated across sub-locations)
      const liveCurrentGA4 = await db
        .select({
          pageType: ga4TerritoryPages.pageType,
          sessions: sql<number>`SUM(${ga4TerritoryPages.sessions})`,
        })
        .from(ga4TerritoryPages)
        .where(and(
          eq(ga4TerritoryPages.territoryId, territoryId),
          eq(ga4TerritoryPages.year, year),
          eq(ga4TerritoryPages.month, month),
        ))
        .groupBy(ga4TerritoryPages.pageType);
      const currentGA4 = liveCurrentGA4.length > 0 ? liveCurrentGA4 : ga4Subs.length > 0 ? await db
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

      const livePrevGA4 = await db
        .select({
          pageType: ga4TerritoryPages.pageType,
          sessions: sql<number>`SUM(${ga4TerritoryPages.sessions})`,
        })
        .from(ga4TerritoryPages)
        .where(and(
          eq(ga4TerritoryPages.territoryId, territoryId),
          eq(ga4TerritoryPages.year, prevYear),
          eq(ga4TerritoryPages.month, month),
        ))
        .groupBy(ga4TerritoryPages.pageType);
      const prevGA4 = livePrevGA4.length > 0 ? livePrevGA4 : ga4Subs.length > 0 ? await db
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

      const [currentGA4Coverage] = await db.select({
          propertiesExpected: ga4TerritoryMonthly.propertiesExpected,
          propertiesSucceeded: ga4TerritoryMonthly.propertiesSucceeded,
        })
        .from(ga4TerritoryMonthly)
        .where(and(
          eq(ga4TerritoryMonthly.territoryId, territoryId),
          eq(ga4TerritoryMonthly.year, year),
          eq(ga4TerritoryMonthly.month, month),
        ));
      const [prevGA4Coverage] = await db.select({
          propertiesExpected: ga4TerritoryMonthly.propertiesExpected,
          propertiesSucceeded: ga4TerritoryMonthly.propertiesSucceeded,
        })
        .from(ga4TerritoryMonthly)
        .where(and(
          eq(ga4TerritoryMonthly.territoryId, territoryId),
          eq(ga4TerritoryMonthly.year, prevYear),
          eq(ga4TerritoryMonthly.month, month),
        ));

      // GBP comparisons resolve persisted complete data first. Partial or
      // unavailable live attempts stay explicit and cannot inherit a legacy
      // value for the same metric-period.
      const resolvedGBP = await loadResolvedGBPMonthly({
        db,
        territoryId,
        startYear: prevYear,
        endYear: year,
        month,
      });
      const currentGBP = resolvedGBP.filter(row => row.year === year);
      const prevGBP = resolvedGBP.filter(row => row.year === prevYear);
      const currentGBPByMetric = new Map(currentGBP.map(row => [row.metricType, row]));
      const prevGBPByMetric = new Map(prevGBP.map(row => [row.metricType, row]));
      const gbpComparisonEligibility = Object.fromEntries(Array.from(new Set([
        ...Array.from(currentGBPByMetric.keys()), ...Array.from(prevGBPByMetric.keys()),
      ])).map(metricType => [
        metricType,
        Boolean(currentGBPByMetric.get(metricType) && prevGBPByMetric.get(metricType) && isGBPYoYEligible(
          currentGBPByMetric.get(metricType)!.coverage,
          prevGBPByMetric.get(metricType)!.coverage,
        )),
      ]));

      return {
        ga4: { current: currentGA4, previous: prevGA4 },
        ga4Coverage: {
          current: currentGA4Coverage ? {
            ...currentGA4Coverage,
            complete: currentGA4Coverage.propertiesExpected > 0 && currentGA4Coverage.propertiesExpected === currentGA4Coverage.propertiesSucceeded,
          } : null,
          previous: prevGA4Coverage ? {
            ...prevGA4Coverage,
            complete: prevGA4Coverage.propertiesExpected > 0 && prevGA4Coverage.propertiesExpected === prevGA4Coverage.propertiesSucceeded,
          } : null,
        },
        gbp: { current: currentGBP, previous: prevGBP, comparisonEligibility: gbpComparisonEligibility },
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

      const ga4Conditions: any[] = [
        inArray(ga4Sessions.territory, ga4Subs.length > 0 ? ga4Subs : [""]),
        eq(ga4Sessions.year, year),
      ];
      if (month) ga4Conditions.push(eq(ga4Sessions.month, month));

      const liveGa4Conditions = [
        eq(ga4TerritoryMonthly.territoryId, territoryId),
        eq(ga4TerritoryMonthly.year, year),
      ];
      if (month) liveGa4Conditions.push(eq(ga4TerritoryMonthly.month, month));

      const [liveGa4Summary] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${ga4TerritoryMonthly.priorityPageSessions}), 0)`,
          rowCount: sql<number>`COUNT(*)`,
          completeMonths: sql<number>`COALESCE(SUM(CASE WHEN ${ga4TerritoryMonthly.propertiesExpected} = ${ga4TerritoryMonthly.propertiesSucceeded} THEN 1 ELSE 0 END), 0)`,
        })
        .from(ga4TerritoryMonthly)
        .where(and(...liveGa4Conditions));
      const [legacyGa4Summary] = await db
        .select({ total: sql<number>`SUM(sessions)` })
        .from(ga4Sessions)
        .where(and(...ga4Conditions, inArray(ga4Sessions.pageType, ["species_pages", "location_page"])));

      const resolvedGBP = await loadResolvedGBPMonthly({
        db,
        territoryId,
        startYear: year,
        endYear: year,
        month,
      });
      const headlineGBP = resolvedGBP.filter(row =>
        row.value !== null &&
        (row.source === "persisted_business_profile_api" || row.source === "legacy_spreadsheet"),
      );
      const gbpTotals = headlineGBP.reduce<Record<string, number>>((totals, row) => {
        totals[row.metricType] = (totals[row.metricType] ?? 0) + Number(row.value);
        return totals;
      }, {});
      const incompleteGBPPeriods = resolvedGBP
        .filter(row => row.source === "partial" || row.source === "unavailable")
        .map(row => ({
          year: row.year,
          month: row.month,
          metricType: row.metricType,
          source: row.source,
          locationsExpected: row.coverage.locationsExpected,
          locationsSucceeded: row.coverage.locationsSucceeded,
        }));

      return {
        totalSessions: Number(liveGa4Summary?.rowCount || 0) > 0
          ? liveGa4Summary?.total ?? 0
          : legacyGa4Summary?.total || 0,
        ga4Coverage: Number(liveGa4Summary?.rowCount || 0) > 0 ? {
          importedMonths: Number(liveGa4Summary?.rowCount),
          completeMonths: Number(liveGa4Summary?.completeMonths),
        } : null,
        gbp: gbpTotals,
        gbpCoverage: {
          sources: Array.from(new Set(headlineGBP.map(row => row.source))).sort(),
          incompletePeriods: incompleteGBPPeriods,
        },
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
          const [liveCurrentRow] = await db
            .select({
              sessions: sql<number>`SUM(${ga4TerritoryMonthly.priorityPageSessions})`,
              rowCount: sql<number>`COUNT(*)`,
              propertiesExpected: sql<number>`MAX(${ga4TerritoryMonthly.propertiesExpected})`,
              propertiesSucceeded: sql<number>`MAX(${ga4TerritoryMonthly.propertiesSucceeded})`,
            })
            .from(ga4TerritoryMonthly)
            .where(and(
              eq(ga4TerritoryMonthly.territoryId, group.id),
              eq(ga4TerritoryMonthly.year, year),
              eq(ga4TerritoryMonthly.month, month),
            ));
          const [legacyCurrentRow] = await db
            .select({ sessions: sql<number>`SUM(sessions)` })
            .from(ga4Sessions)
            .where(and(
              inArray(ga4Sessions.territory, group.ga4Territories),
              eq(ga4Sessions.year, year),
              eq(ga4Sessions.month, month),
              inArray(ga4Sessions.pageType, ["species_pages", "location_page"]),
            ));

          const [livePrevRow] = await db
            .select({
              sessions: sql<number>`SUM(${ga4TerritoryMonthly.priorityPageSessions})`,
              rowCount: sql<number>`COUNT(*)`,
              propertiesExpected: sql<number>`MAX(${ga4TerritoryMonthly.propertiesExpected})`,
              propertiesSucceeded: sql<number>`MAX(${ga4TerritoryMonthly.propertiesSucceeded})`,
            })
            .from(ga4TerritoryMonthly)
            .where(and(
              eq(ga4TerritoryMonthly.territoryId, group.id),
              eq(ga4TerritoryMonthly.year, prevYear),
              eq(ga4TerritoryMonthly.month, month),
            ));
          const [legacyPrevRow] = await db
            .select({ sessions: sql<number>`SUM(sessions)` })
            .from(ga4Sessions)
            .where(and(
              inArray(ga4Sessions.territory, group.ga4Territories),
              eq(ga4Sessions.year, prevYear),
              eq(ga4Sessions.month, month),
              inArray(ga4Sessions.pageType, ["species_pages", "location_page"]),
            ));

          const currentDirectExists = Number(liveCurrentRow?.rowCount || 0) > 0;
          const previousDirectExists = Number(livePrevRow?.rowCount || 0) > 0;
          const currentDirectComplete = !currentDirectExists
            || Number(liveCurrentRow?.propertiesExpected) === Number(liveCurrentRow?.propertiesSucceeded);
          const previousDirectComplete = !previousDirectExists
            || Number(livePrevRow?.propertiesExpected) === Number(livePrevRow?.propertiesSucceeded);
          if (!currentDirectComplete || !previousDirectComplete) continue;
          const current = Number(currentDirectExists ? liveCurrentRow?.sessions : legacyCurrentRow?.sessions ?? 0);
          const prev = Number(previousDirectExists ? livePrevRow?.sessions : legacyPrevRow?.sessions ?? 0);

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
          const resolvedGBP = await loadResolvedGBPMonthly({
            db,
            territoryId: group.id,
            startYear: prevYear,
            endYear: year,
            month,
          });
          const currentGBP = resolvedGBP.filter(row => row.year === year);
          const prevGBPMap = new Map(resolvedGBP.filter(row => row.year === prevYear).map(row => [row.metricType, row]));

          for (const row of currentGBP) {
            if (row.metricType === "total" || row.metricType === "bookings") continue;
            const previousRow = prevGBPMap.get(row.metricType);
            if (
              !previousRow ||
              !isGBPYoYEligible(row.coverage, previousRow.coverage) ||
              row.value === null ||
              previousRow.value === null ||
              previousRow.value < 15
            ) continue;
            const prev = previousRow.value;
            const current = row.value;
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
