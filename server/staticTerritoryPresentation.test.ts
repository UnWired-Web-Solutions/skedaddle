import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const locationDetailSource = readFileSync(new URL("../client/src/pages/LocationDetail.tsx", import.meta.url), "utf8");
const actionPlanSource = readFileSync(new URL("../client/src/data/actionPlans.ts", import.meta.url), "utf8");

describe("active territory presentation source safeguards", () => {
  it("does not render static KPI values or dashboard-completeness claims on Home", () => {
    expect(homeSource).not.toContain("T12 Revenue");
    expect(homeSource).not.toContain("loc.kpis.");
    expect(homeSource).not.toContain("complete dashboards");
    expect(homeSource).toContain("Metrics are shown only in their source-aware territory views.");
    expect(homeSource).toContain("Unavailable coverage is not shown as zero.");
  });

  it("does not restore static summary values or an inferred ownership label on Location Detail", () => {
    expect(locationDetailSource).not.toContain("loc.kpis.");
    expect(locationDetailSource).not.toContain("Dashboard updated");
    expect(locationDetailSource).not.toContain("Updated July 2026");
    expect(locationDetailSource).not.toContain("Revenue & jobs by species — ranked");
    expect(locationDetailSource).toContain("Franchise reporting territory");
    expect(locationDetailSource).toContain("Corporate classification:</strong> Not asserted in this portal.");
  });

  it("keeps active 90-day plans free of static demand rankings and conversion assumptions", () => {
    expect(actionPlanSource).not.toContain('import { DASHBOARD_DATA }');
    expect(actionPlanSource).not.toContain("T12 demand");
    expect(actionPlanSource).not.toContain("closed-job revenue");
    expect(actionPlanSource).toContain("do not infer closed jobs or a conversion rate");
    expect(actionPlanSource).toContain("active workbook aggregate context where available");
  });
});
