import { describe, expect, it } from "vitest";
import {
  INITIAL_SALES_REPORT_WINDOW,
  isMonthInWindow,
  previousYearWindow,
  reportingWindowLabel,
} from "./reportingPeriod";

describe("initial sales reporting period", () => {
  it("locks digital evidence to the checked-in Salesforce snapshot", () => {
    expect(reportingWindowLabel(INITIAL_SALES_REPORT_WINDOW)).toBe("2025-07 through 2026-06");
    expect(isMonthInWindow(2025, 7, INITIAL_SALES_REPORT_WINDOW)).toBe(true);
    expect(isMonthInWindow(2026, 6, INITIAL_SALES_REPORT_WINDOW)).toBe(true);
    expect(isMonthInWindow(2025, 6, INITIAL_SALES_REPORT_WINDOW)).toBe(false);
    expect(isMonthInWindow(2026, 7, INITIAL_SALES_REPORT_WINDOW)).toBe(false);
  });

  it("builds the aligned prior-year comparison window", () => {
    expect(previousYearWindow(INITIAL_SALES_REPORT_WINDOW)).toMatchObject({
      start: { year: 2024, month: 7 },
      end: { year: 2025, month: 6 },
    });
  });
});
