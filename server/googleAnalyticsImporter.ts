import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  ga4ImportRuns,
  ga4TerritoryMonthly,
  ga4TerritoryPages,
} from "../drizzle/schema";
import { getGA4PropertiesForTerritory } from "../shared/ga4TerritoryProperties";
import { getDb } from "./db";
import { fetchGA4TerritoryMonthSnapshot } from "./googleAnalyticsClient";

export type GA4ImportResult = {
  territoryId: string;
  period: { year: number; month: number; startDate: string; endDate: string };
  sessions: number;
  activeUsers: number;
  priorityPageSessions: number;
  pageCount: number;
  coverage: {
    propertiesExpected: number;
    propertiesSucceeded: number;
    failedProperties: Array<{ propertyId: string; error: string }>;
    complete: boolean;
  };
};

function getCompletedMonthRange(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error("A valid GA4 reporting year is required.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("A valid GA4 reporting month is required.");
  }
  const current = new Date();
  const currentPeriod = current.getUTCFullYear() * 100 + current.getUTCMonth() + 1;
  if (year * 100 + month >= currentPeriod) {
    throw new Error("GA4 imports are limited to completed calendar months.");
  }
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

export async function importGA4TerritoryMonth(
  territoryId: string,
  year: number,
  month: number,
): Promise<GA4ImportResult> {
  const period = getCompletedMonthRange(year, month);
  const propertyIds = getGA4PropertiesForTerritory(territoryId);
  if (propertyIds.length === 0) throw new Error(`No GA4 properties are mapped for ${territoryId}.`);
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");

  let snapshot: Awaited<ReturnType<typeof fetchGA4TerritoryMonthSnapshot>>;
  try {
    snapshot = await fetchGA4TerritoryMonthSnapshot(territoryId, year, month);
  } catch (error) {
    try {
      await db.insert(ga4ImportRuns).values({
        territoryId,
        year,
        month,
        status: "failed",
        propertiesExpected: propertyIds.length,
        propertiesSucceeded: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (auditError) {
      console.warn("[GA4 Import] Could not persist the failed API attempt:", auditError);
    }
    throw error;
  }

  const importedAt = new Date();
  const scope = and(
    eq(ga4TerritoryMonthly.territoryId, territoryId),
    eq(ga4TerritoryMonthly.year, year),
    eq(ga4TerritoryMonthly.month, month),
  );
  const pageScope = and(
    eq(ga4TerritoryPages.territoryId, territoryId),
    eq(ga4TerritoryPages.year, year),
    eq(ga4TerritoryPages.month, month),
  );
  const status = snapshot.coverage.complete ? "complete" : "partial";
  const pageRows = snapshot.pages.map(page => ({
    territoryId,
    year,
    month,
    pagePath: page.pagePath,
    pagePathHash: createHash("sha256").update(page.pagePath).digest("hex"),
    pageType: page.pageType,
    sessions: page.sessions,
    activeUsers: page.activeUsers,
    importedAt,
  }));

  try {
    await db.transaction(async tx => {
      await tx.delete(ga4TerritoryMonthly).where(scope);
      await tx.delete(ga4TerritoryPages).where(pageScope);
      await tx.insert(ga4TerritoryMonthly).values({
        territoryId,
        year,
        month,
        sessions: snapshot.sessions,
        activeUsers: snapshot.activeUsers,
        priorityPageSessions: snapshot.priorityPageSessions,
        propertiesExpected: snapshot.coverage.propertiesExpected,
        propertiesSucceeded: snapshot.coverage.propertiesSucceeded,
        importedAt,
      });
      for (let index = 0; index < pageRows.length; index += 500) {
        await tx.insert(ga4TerritoryPages).values(pageRows.slice(index, index + 500));
      }
      await tx.insert(ga4ImportRuns).values({
        territoryId,
        year,
        month,
        status,
        propertiesExpected: snapshot.coverage.propertiesExpected,
        propertiesSucceeded: snapshot.coverage.propertiesSucceeded,
        failedPropertiesJson: snapshot.coverage.failedProperties.length
          ? JSON.stringify(snapshot.coverage.failedProperties)
          : null,
        importedAt,
      });
    });
  } catch (error) {
    try {
      await db.insert(ga4ImportRuns).values({
        territoryId,
        year,
        month,
        status: "failed",
        propertiesExpected: snapshot.coverage.propertiesExpected,
        propertiesSucceeded: snapshot.coverage.propertiesSucceeded,
        failedPropertiesJson: snapshot.coverage.failedProperties.length
          ? JSON.stringify(snapshot.coverage.failedProperties)
          : null,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (auditError) {
      console.warn("[GA4 Import] Could not persist the failed database attempt:", auditError);
    }
    throw error;
  }

  return {
    territoryId,
    period: { year, month, ...period },
    sessions: snapshot.sessions,
    activeUsers: snapshot.activeUsers,
    priorityPageSessions: snapshot.priorityPageSessions,
    pageCount: snapshot.pages.length,
    coverage: snapshot.coverage,
  };
}
