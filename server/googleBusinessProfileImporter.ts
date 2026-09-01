/**
 * Pure import-planning helpers for the GBP Performance API. Database writes and
 * manual refresh endpoints will call these only after the Google allowlist and
 * OAuth credentials have been verified.
 */

import { getCompleteCalendarMonthRange } from "../shared/gbpDataSafety";

export type GBPMetricFetchResult = {
  locationId: number;
  metricType: string;
  rows: Array<{ date: string; value: number }>;
  success: boolean;
  error?: string;
};

export type GBPMonthlyMetricSnapshot = {
  metricType: string;
  value: number | null;
  coverageStatus: "complete" | "partial" | "unavailable";
  locationsExpected: number;
  locationsSucceeded: number;
  sourceStartDate: string;
  sourceEndDate: string;
  rows: Array<{ locationId: number; date: string; value: number }>;
  failedLocationIds: number[];
};

export function assertCompletedGBPMonth(year: number, month: number, now = new Date()): { startDate: string; endDate: string } {
  const range = getCompleteCalendarMonthRange(year, month);
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const requestedMonthStart = new Date(`${range.startDate}T00:00:00.000Z`);
  if (requestedMonthStart >= currentMonthStart) {
    throw new Error("GBP imports are limited to completed calendar months.");
  }
  return range;
}

/**
 * Builds one snapshot per Google daily metric. A value is present only when
 * Google returned at least one raw daily row. Empty responses therefore remain
 * unavailable rather than being converted into a fabricated zero.
 */
export function buildGBPMonthlyMetricSnapshots(input: {
  locationIds: number[];
  metricTypes: string[];
  year: number;
  month: number;
  results: GBPMetricFetchResult[];
  now?: Date;
}): GBPMonthlyMetricSnapshot[] {
  const { startDate, endDate } = assertCompletedGBPMonth(input.year, input.month, input.now);
  const uniqueLocationIds = Array.from(new Set(input.locationIds));
  if (uniqueLocationIds.length === 0) {
    throw new Error("No explicitly ready GBP locations are mapped for this territory.");
  }
  const uniqueMetricTypes = Array.from(new Set(input.metricTypes.filter(Boolean)));
  if (uniqueMetricTypes.length === 0) {
    throw new Error("At least one GBP Performance API metric is required.");
  }

  return uniqueMetricTypes.map(metricType => {
    const relevant = input.results.filter(result => result.metricType === metricType && uniqueLocationIds.includes(result.locationId));
    const successful = relevant.filter(result => result.success);
    const failedLocationIds = uniqueLocationIds.filter(locationId =>
      !successful.some(result => result.locationId === locationId),
    );
    const rows = successful.flatMap(result => result.rows
      .filter(row => row.date >= startDate && row.date <= endDate)
      .map(row => ({ locationId: result.locationId, date: row.date, value: row.value })),
    );
    const locationsSucceeded = uniqueLocationIds.length - failedLocationIds.length;
    const allLocationsSucceeded = locationsSucceeded === uniqueLocationIds.length;
    const coverageStatus = rows.length === 0
      ? "unavailable"
      : allLocationsSucceeded ? "complete" : "partial";

    return {
      metricType,
      value: rows.length === 0 ? null : rows.reduce((sum, row) => sum + row.value, 0),
      coverageStatus,
      locationsExpected: uniqueLocationIds.length,
      locationsSucceeded,
      sourceStartDate: startDate,
      sourceEndDate: endDate,
      rows,
      failedLocationIds,
    };
  });
}
