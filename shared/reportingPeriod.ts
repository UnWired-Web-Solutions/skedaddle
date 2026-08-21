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
