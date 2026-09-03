export type ReportingMonth = { year: number; month: number };

export type ReportingWindow = {
  start: ReportingMonth;
  end: ReportingMonth;
  sourceLabel: string;
};

/** The period covered by the checked-in Salesforce demand snapshot. */
export const INITIAL_SALES_REPORT_WINDOW: ReportingWindow = {
  start: { year: 2025, month: 7 },
  end: { year: 2026, month: 6 },
  sourceLabel: "Salesforce demand snapshot",
};

export function reportingMonthKey(value: ReportingMonth): number {
  return value.year * 100 + value.month;
}

/**
 * Returns the latest twelve fully completed UTC calendar months. This is the
 * reporting window for current workbook performance surfaces; it deliberately
 * excludes the partial month in which a request is made.
 */
export function latestTwelveCompletedMonths(asOf = new Date()): ReportingWindow {
  const endDate = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 1, 1));
  const startDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - 11, 1));
  return {
    start: { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1 },
    end: { year: endDate.getUTCFullYear(), month: endDate.getUTCMonth() + 1 },
    sourceLabel: "Latest 12 completed UTC calendar months",
  };
}

export function isMonthInWindow(year: number, month: number, window: ReportingWindow): boolean {
  const key = reportingMonthKey({ year, month });
  return key >= reportingMonthKey(window.start) && key <= reportingMonthKey(window.end);
}

export function previousYearWindow(window: ReportingWindow): ReportingWindow {
  return {
    start: { year: window.start.year - 1, month: window.start.month },
    end: { year: window.end.year - 1, month: window.end.month },
    sourceLabel: `${window.sourceLabel} comparison`,
  };
}

export function reportingMonthIso(value: ReportingMonth): string {
  return `${value.year}-${String(value.month).padStart(2, "0")}`;
}

export function reportingWindowLabel(window: ReportingWindow): string {
  return `${reportingMonthIso(window.start)} through ${reportingMonthIso(window.end)}`;
}
