import { and, eq } from "drizzle-orm";
import { gscPageMetrics, gscQueryMetrics } from "../drizzle/schema";
import { GSC_PARENT_PROPERTY, getGscTerritoryScope } from "../shared/gscTerritoryPaths";
import { getDb } from "./db";
import { getSearchConsoleClient } from "./googleSearchConsoleClient";

const ROW_LIMIT = 25_000;

type MetricRow = {
  clicks: number;
  impressions: number;
  ctrBps: number;
  positionHundredths: number;
};

type PageMetric = MetricRow & { pageUrl: string; pathPrefix: string };
type QueryMetric = MetricRow & { query: string };

export type SearchConsoleImportResult = {
  territoryId: string;
  period: { year: number; month: number; startDate: string; endDate: string };
  sourceProperty: string;
  pathPrefixes: string[];
  pageCount: number;
  queryCount: number;
};

function getMonthRange(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("A valid reporting year is required.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("A valid reporting month is required.");
  }
  const now = new Date();
  const currentPeriod = now.getUTCFullYear() * 100 + now.getUTCMonth() + 1;
  if (year * 100 + month >= currentPeriod) {
    throw new Error("Live Search Console imports are limited to completed calendar months.");
  }
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function normalizeMetricRow(row: { clicks?: number | null; impressions?: number | null; ctr?: number | null; position?: number | null }): MetricRow {
  return {
    clicks: Math.round(Number(row.clicks ?? 0)),
    impressions: Math.round(Number(row.impressions ?? 0)),
    ctrBps: Math.round(Number(row.ctr ?? 0) * 10_000),
    positionHundredths: Math.round(Number(row.position ?? 0) * 100),
  };
}

function aggregateMetricRows<T extends MetricRow>(rows: T[], key: (row: T) => string): T[] {
  const grouped = new Map<string, T & { weightedPosition: number }>();
  for (const row of rows) {
    const groupKey = key(row);
    const current = grouped.get(groupKey);
    if (!current) {
      grouped.set(groupKey, {
        ...row,
        weightedPosition: row.positionHundredths * row.impressions,
      });
      continue;
    }
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.weightedPosition += row.positionHundredths * row.impressions;
  }
  return Array.from(grouped.values()).map(({ weightedPosition, ...row }) => ({
    ...row,
    ctrBps: row.impressions > 0 ? Math.round((row.clicks / row.impressions) * 10_000) : 0,
    positionHundredths: row.impressions > 0 ? Math.round(weightedPosition / row.impressions) : 0,
  })) as unknown as T[];
}

async function fetchPageMetrics(pathPrefix: string, startDate: string, endDate: string): Promise<PageMetric[]> {
  const client = getSearchConsoleClient();
  const response = await client.searchanalytics.query({
    siteUrl: GSC_PARENT_PROPERTY,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: ROW_LIMIT,
      dimensionFilterGroups: [{
        filters: [{ dimension: "page", operator: "contains", expression: pathPrefix }],
      }],
    },
  });

  return (response.data.rows ?? [])
    .map(row => {
      const pageUrl = row.keys?.[0];
      if (!pageUrl) return null;
      const parsed = new URL(pageUrl);
      if (parsed.hostname !== "skedaddlewildlife.com" && parsed.hostname !== "www.skedaddlewildlife.com") {
        return null;
      }
      const normalizedPath = parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
      if (!normalizedPath.startsWith(pathPrefix)) return null;
      return { pageUrl, pathPrefix, ...normalizeMetricRow(row) };
    })
    .filter((row): row is PageMetric => Boolean(row));
}

async function fetchQueryMetrics(pathPrefix: string, startDate: string, endDate: string): Promise<QueryMetric[]> {
  const client = getSearchConsoleClient();
  const response = await client.searchanalytics.query({
    siteUrl: GSC_PARENT_PROPERTY,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: ROW_LIMIT,
      dimensionFilterGroups: [{
        filters: [{ dimension: "page", operator: "contains", expression: pathPrefix }],
      }],
    },
  });

  return (response.data.rows ?? [])
    .map(row => {
      const query = row.keys?.[0]?.trim();
      return query ? { query, ...normalizeMetricRow(row) } : null;
    })
    .filter((row): row is QueryMetric => Boolean(row));
}

async function insertInBatches<T>(
  insert: (batch: T[]) => Promise<unknown>,
  rows: T[],
) {
  for (let index = 0; index < rows.length; index += 500) {
    await insert(rows.slice(index, index + 500));
  }
}

export async function importSearchConsoleTerritoryMonth(
  territoryId: string,
  year: number,
  month: number,
): Promise<SearchConsoleImportResult> {
  const scope = getGscTerritoryScope(territoryId);
  if (!scope) throw new Error(`No Search Console scope decision exists for ${territoryId}.`);
  if (scope.status !== "ready") {
    throw new Error(
      `${territoryId} is ${scope.status.replace("_", " ")} and is blocked from live import: ${scope.notes}`,
    );
  }
  if (!scope.registeredPaths.length) throw new Error(`${territoryId} has no approved Search Console path.`);

  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const { startDate, endDate } = getMonthRange(year, month);

  const [pageSets, querySets] = await Promise.all([
    Promise.all(scope.registeredPaths.map(path => fetchPageMetrics(path, startDate, endDate))),
    Promise.all(scope.registeredPaths.map(path => fetchQueryMetrics(path, startDate, endDate))),
  ]);

  const pages = aggregateMetricRows(pageSets.flat(), row => row.pageUrl);
  const queries = aggregateMetricRows(querySets.flat(), row => row.query);
  const aggregateScopeLabel = scope.registeredPaths.length === 1
    ? scope.registeredPaths[0]
    : `verified-path-set:${territoryId}`;

  await db.transaction(async tx => {
    const importScope = and(
      eq(gscPageMetrics.territoryId, territoryId),
      eq(gscPageMetrics.year, year),
      eq(gscPageMetrics.month, month),
      eq(gscPageMetrics.sourceProperty, GSC_PARENT_PROPERTY),
    );
    const queryScope = and(
      eq(gscQueryMetrics.territoryId, territoryId),
      eq(gscQueryMetrics.year, year),
      eq(gscQueryMetrics.month, month),
      eq(gscQueryMetrics.sourceProperty, GSC_PARENT_PROPERTY),
    );
    await tx.delete(gscPageMetrics).where(importScope);
    await tx.delete(gscQueryMetrics).where(queryScope);

    await insertInBatches(
      batch => tx.insert(gscPageMetrics).values(batch.map(row => ({
        territoryId,
        year,
        month,
        pageUrl: row.pageUrl,
        clicks: row.clicks,
        impressions: row.impressions,
        ctrBps: row.ctrBps,
        positionHundredths: row.positionHundredths,
        sourceProperty: GSC_PARENT_PROPERTY,
        pathPrefix: row.pathPrefix,
      }))),
      pages,
    );
    await insertInBatches(
      batch => tx.insert(gscQueryMetrics).values(batch.map(row => ({
        territoryId,
        year,
        month,
        query: row.query,
        clicks: row.clicks,
        impressions: row.impressions,
        ctrBps: row.ctrBps,
        positionHundredths: row.positionHundredths,
        sourceProperty: GSC_PARENT_PROPERTY,
        pathPrefix: aggregateScopeLabel,
      }))),
      queries,
    );
  });

  return {
    territoryId,
    period: { year, month, startDate, endDate },
    sourceProperty: GSC_PARENT_PROPERTY,
    pathPrefixes: scope.registeredPaths,
    pageCount: pages.length,
    queryCount: queries.length,
  };
}
