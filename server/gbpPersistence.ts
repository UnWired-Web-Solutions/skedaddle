/**
 * Database persistence for already-planned GBP metric imports. This module has
 * no Google API calls and no refresh-token handling. It can only write values
 * the caller supplies from a verified completed-month import plan.
 */
import { and, eq, gte, lte } from "drizzle-orm";
import { gbpDailyMetrics, gbpImportRuns, gbpTerritoryMonthly } from "../drizzle/schema";
import { getCompleteCalendarMonthRange } from "../shared/gbpDataSafety";
import type { GBPMonthlyMetricSnapshot } from "./googleBusinessProfileImporter";
import { getDb } from "./db";

export type GBPPersistencePlan = {
  territoryId: string;
  year: number;
  month: number;
  sourceStartDate: string;
  sourceEndDate: string;
  locationsExpected: number;
  locationsSucceeded: number;
  status: "complete" | "partial";
  failedLocations: Array<{ locationId: number; metricType: string }>;
  snapshots: GBPMonthlyMetricSnapshot[];
  rawRows: Array<{ gbpLocationId: number; metricType: string; metricDate: string; value: number }>;
};

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}

/**
 * Validates an in-memory metric snapshot before it reaches the database.
 * `unavailable` does not produce a monthly total or an invented zero.
 */
export function buildGBPPersistencePlan(input: {
  territoryId: string;
  year: number;
  month: number;
  snapshots: GBPMonthlyMetricSnapshot[];
}): GBPPersistencePlan {
  if (!input.territoryId) throw new Error("GBP persistence requires a territory ID.");
  const expectedRange = getCompleteCalendarMonthRange(input.year, input.month);
  if (input.snapshots.length === 0) throw new Error("GBP persistence requires at least one metric snapshot.");

  const metricTypes = new Set<string>();
  const rawKeys = new Set<string>();
  const rawRows: GBPPersistencePlan["rawRows"] = [];
  const failedLocations: GBPPersistencePlan["failedLocations"] = [];
  let locationsExpected: number | undefined;
  let locationsSucceeded = Number.POSITIVE_INFINITY;
  let status: GBPPersistencePlan["status"] = "complete";

  for (const snapshot of input.snapshots) {
    if (!snapshot.metricType || metricTypes.has(snapshot.metricType)) {
      throw new Error("Each GBP metric type may appear only once in a persistence plan.");
    }
    metricTypes.add(snapshot.metricType);
    if (snapshot.sourceStartDate !== expectedRange.startDate || snapshot.sourceEndDate !== expectedRange.endDate) {
      throw new Error("GBP snapshot source dates must match the requested completed calendar month.");
    }
    if (locationsExpected === undefined) locationsExpected = snapshot.locationsExpected;
    if (snapshot.locationsExpected !== locationsExpected) {
      throw new Error("GBP metric snapshots must use the same expected location count.");
    }
    if (snapshot.locationsSucceeded < 0 || snapshot.locationsSucceeded > snapshot.locationsExpected) {
      throw new Error("GBP snapshot contains an invalid successful location count.");
    }
    const successfulLocationIds = Array.from(new Set(snapshot.successfulLocationIds));
    if (successfulLocationIds.length !== snapshot.locationsSucceeded) {
      throw new Error("GBP snapshot successful location identities do not match its coverage count.");
    }
    successfulLocationIds.forEach(locationId => assertPositiveInteger(locationId, "GBP location ID"));
    snapshot.failedLocationIds.forEach(locationId => {
      assertPositiveInteger(locationId, "GBP location ID");
      failedLocations.push({ locationId, metricType: snapshot.metricType });
    });
    if (snapshot.coverageStatus === "unavailable") {
      if (snapshot.value !== null || snapshot.rows.length !== 0) {
        throw new Error("Unavailable GBP metric snapshots may not contain totals or raw rows.");
      }
    } else {
      if (snapshot.value === null) throw new Error("Available GBP metric snapshots require an explicit total.");
      const rawTotal = snapshot.rows.reduce((sum, row) => sum + row.value, 0);
      if (rawTotal !== snapshot.value) throw new Error("GBP monthly total must equal its explicit raw daily values.");
      if (snapshot.coverageStatus === "complete" && snapshot.locationsSucceeded !== snapshot.locationsExpected) {
        throw new Error("Complete GBP coverage requires every expected location to succeed.");
      }
    }
    if (snapshot.coverageStatus !== "complete") status = "partial";
    locationsSucceeded = Math.min(locationsSucceeded, snapshot.locationsSucceeded);
    for (const row of snapshot.rows) {
      if (!successfulLocationIds.includes(row.locationId)) {
        throw new Error("GBP raw values may only be persisted for successfully fetched locations.");
      }
      if (row.date < expectedRange.startDate || row.date > expectedRange.endDate || !Number.isFinite(row.value)) {
        throw new Error("GBP raw value is outside the requested calendar month or is invalid.");
      }
      const key = `${row.locationId}|${snapshot.metricType}|${row.date}`;
      if (rawKeys.has(key)) throw new Error("GBP persistence plan contains a duplicate daily metric value.");
      rawKeys.add(key);
      rawRows.push({ gbpLocationId: row.locationId, metricType: snapshot.metricType, metricDate: row.date, value: row.value });
    }
  }

  return {
    territoryId: input.territoryId,
    year: input.year,
    month: input.month,
    sourceStartDate: expectedRange.startDate,
    sourceEndDate: expectedRange.endDate,
    locationsExpected: locationsExpected ?? 0,
    locationsSucceeded: Number.isFinite(locationsSucceeded) ? locationsSucceeded : 0,
    status,
    failedLocations,
    snapshots: input.snapshots,
    rawRows,
  };
}

/**
 * Replaces only the requested territory-month snapshot in one transaction.
 * Failed locations never become zero rows; incomplete/unavailable aggregate
 * metrics remove prior live totals so readers fall back to labelled legacy data.
 */
export async function persistGBPMonthlyPlan(plan: GBPPersistencePlan): Promise<{ importRunId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const importedAt = new Date();
  return db.transaction(async tx => {
    const runInsert = await tx.insert(gbpImportRuns).values({
      importKind: "metrics",
      territoryId: plan.territoryId,
      sourceStartDate: plan.sourceStartDate,
      sourceEndDate: plan.sourceEndDate,
      status: plan.status,
      locationsExpected: plan.locationsExpected,
      locationsSucceeded: plan.locationsSucceeded,
      failedLocationsJson: plan.failedLocations.length ? JSON.stringify(plan.failedLocations) : null,
      completedAt: importedAt,
    });
    const importRunId = Number(runInsert[0]?.insertId);
    if (!Number.isInteger(importRunId) || importRunId <= 0) throw new Error("GBP import audit run did not return an ID.");

    for (const snapshot of plan.snapshots) {
      const targetedLocationIds = Array.from(new Set([
        ...snapshot.successfulLocationIds,
        ...snapshot.failedLocationIds,
      ]));
      for (const locationId of targetedLocationIds) {
        await tx.delete(gbpDailyMetrics).where(and(
          eq(gbpDailyMetrics.gbpLocationId, locationId),
          eq(gbpDailyMetrics.metricType, snapshot.metricType),
          gte(gbpDailyMetrics.metricDate, plan.sourceStartDate),
          lte(gbpDailyMetrics.metricDate, plan.sourceEndDate),
        ));
      }
      const monthlyScope = and(
        eq(gbpTerritoryMonthly.territoryId, plan.territoryId),
        eq(gbpTerritoryMonthly.year, plan.year),
        eq(gbpTerritoryMonthly.month, plan.month),
        eq(gbpTerritoryMonthly.metricType, snapshot.metricType),
      );
      await tx.delete(gbpTerritoryMonthly).where(monthlyScope);
      if (snapshot.value !== null) {
        const coverageStatus = snapshot.coverageStatus === "complete" ? "complete" : "partial";
        await tx.insert(gbpTerritoryMonthly).values({
          territoryId: plan.territoryId,
          year: plan.year,
          month: plan.month,
          metricType: snapshot.metricType,
          value: snapshot.value,
          coverageStatus,
          locationsExpected: snapshot.locationsExpected,
          locationsSucceeded: snapshot.locationsSucceeded,
          sourceStartDate: plan.sourceStartDate,
          sourceEndDate: plan.sourceEndDate,
          importRunId,
          importedAt,
        });
      }
    }
    if (plan.rawRows.length) {
      await tx.insert(gbpDailyMetrics).values(plan.rawRows.map(row => ({
        ...row,
        sourceStartDate: plan.sourceStartDate,
        sourceEndDate: plan.sourceEndDate,
        importRunId,
        importedAt,
      })));
    }
    return { importRunId };
  });
}
