import { and, eq, inArray, sql } from "drizzle-orm";
import { gbpMetrics, gbpTerritoryMonthly } from "../drizzle/schema";
import { getSubLocations } from "../shared/territoryMapping";
import { getDb } from "./db";
import {
  resolveGBPMonthlyMetricSources,
  type ResolvedGBPMonthlyMetric,
} from "./gbpMetricSourceResolver";

type AnalyticsDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * Loads the reporting-safe GBP source for a territory. Complete Business
 * Profile API data takes precedence, incomplete attempts remain visible, and
 * legacy spreadsheet rows are used only when no live attempt exists.
 */
export async function loadResolvedGBPMonthly(input: {
  db: AnalyticsDb;
  territoryId: string;
  startYear: number;
  endYear: number;
  month?: number;
}): Promise<ResolvedGBPMonthlyMetric[]> {
  const subLocations = getSubLocations(input.territoryId, "gbp");
  const liveConditions = [
    eq(gbpTerritoryMonthly.territoryId, input.territoryId),
    sql`${gbpTerritoryMonthly.year} >= ${input.startYear}`,
    sql`${gbpTerritoryMonthly.year} <= ${input.endYear}`,
  ];
  if (input.month) liveConditions.push(eq(gbpTerritoryMonthly.month, input.month));

  const legacyConditions = [
    inArray(gbpMetrics.territory, subLocations.length > 0 ? subLocations : [""]),
    sql`${gbpMetrics.year} >= ${input.startYear}`,
    sql`${gbpMetrics.year} <= ${input.endYear}`,
  ];
  if (input.month) legacyConditions.push(eq(gbpMetrics.month, input.month));

  const [persisted, legacy] = await Promise.all([
    input.db.select({
      year: gbpTerritoryMonthly.year,
      month: gbpTerritoryMonthly.month,
      metricType: gbpTerritoryMonthly.metricType,
      value: gbpTerritoryMonthly.value,
      coverageStatus: gbpTerritoryMonthly.coverageStatus,
      locationsExpected: gbpTerritoryMonthly.locationsExpected,
      locationsSucceeded: gbpTerritoryMonthly.locationsSucceeded,
    }).from(gbpTerritoryMonthly).where(and(...liveConditions)),
    subLocations.length === 0 ? Promise.resolve([]) : input.db.select({
      year: gbpMetrics.year,
      month: gbpMetrics.month,
      metricType: gbpMetrics.metricType,
      value: sql<number>`SUM(value)`,
    }).from(gbpMetrics).where(and(...legacyConditions))
      .groupBy(gbpMetrics.year, gbpMetrics.month, gbpMetrics.metricType),
  ]);

  return resolveGBPMonthlyMetricSources({
    persisted: persisted.map(row => ({ ...row, value: row.value === null ? null : Number(row.value) })),
    legacy: legacy.map(row => ({ ...row, value: Number(row.value) })),
  });
}
