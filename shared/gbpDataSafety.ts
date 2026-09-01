/** Source and completeness rules for GBP dashboard data. */

export type GBPPeriodSource = "persisted_business_profile_api" | "legacy_spreadsheet" | "partial" | "unavailable";

export type GBPPeriodCoverage = {
  source: GBPPeriodSource;
  locationsExpected: number;
  locationsSucceeded: number;
  complete: boolean;
  yoyEligible: boolean;
};

export function assessGBPPeriodCoverage(input: {
  liveRows: number;
  liveCoverageStatus?: "complete" | "partial";
  locationsExpected?: number;
  locationsSucceeded?: number;
  hasLegacyRecord: boolean;
}): GBPPeriodCoverage {
  const locationsExpected = input.locationsExpected ?? 0;
  const locationsSucceeded = input.locationsSucceeded ?? 0;

  if (input.liveCoverageStatus === "complete" && input.liveRows > 0 && locationsExpected > 0 && locationsSucceeded === locationsExpected) {
    return {
      source: "persisted_business_profile_api",
      locationsExpected,
      locationsSucceeded,
      complete: true,
      yoyEligible: true,
    };
  }

  // A partial attempted refresh must remain visible and must not be masked by
  // legacy figures, because that would falsely enable a live YoY comparison.
  if (input.liveCoverageStatus === "partial") {
    return {
      source: "partial",
      locationsExpected,
      locationsSucceeded,
      complete: false,
      yoyEligible: false,
    };
  }

  if (input.hasLegacyRecord) {
    return {
      source: "legacy_spreadsheet",
      locationsExpected: 0,
      locationsSucceeded: 0,
      complete: false,
      yoyEligible: true,
    };
  }

  return {
    source: "unavailable",
    locationsExpected: 0,
    locationsSucceeded: 0,
    complete: false,
    yoyEligible: false,
  };
}

export function isGBPYoYEligible(current: GBPPeriodCoverage, previous: GBPPeriodCoverage): boolean {
  return current.yoyEligible && previous.yoyEligible && current.source !== "partial" && previous.source !== "partial";
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function getCompleteCalendarMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("year and month must describe a valid calendar month.");
  }
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { startDate, endDate: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` };
}
