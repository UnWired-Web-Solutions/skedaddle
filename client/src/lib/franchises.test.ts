import { describe, expect, it } from "vitest";
import { DASHBOARD_DATA } from "../data/dashboardData";
import { deriveActivityTrend } from "../data/franchises";

describe("franchise activity trend", () => {
  it("uses a matched-month YoY comparison when the data is available", () => {
    const summary = deriveActivityTrend(DASHBOARD_DATA.hamilton);

    expect(summary.metric).toBe("GBP interactions");
    expect(summary.comparison).toBe("Jun 2026 vs Jun 2025 · YoY");
    expect(summary.changePercent).not.toBeNull();
  });

  it("uses organic clicks as the source when Search Console data exists", () => {
    const summary = deriveActivityTrend({
      ...DASHBOARD_DATA.hamilton,
      gsc: {
        monthly: [
          { month: "2025-06", clicks: 100, impressions: 1000, avg_position: 8 },
          { month: "2026-06", clicks: 125, impressions: 1100, avg_position: 6 },
        ],
        total_clicks: 225,
        total_impressions: 2100,
        recent_clicks: 125,
      },
    });

    expect(summary.metric).toBe("Organic clicks");
    expect(summary.trend).toBe("up");
    expect(summary.comparison).toBe("Jun 2026 vs Jun 2025 · YoY");
  });
});
