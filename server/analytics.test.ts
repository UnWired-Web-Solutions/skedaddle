import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    selectDistinct: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue([]),
  }),
}));

describe("analyticsRouter", () => {
  it("should export the analytics router module", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter).toBeDefined();
  });

  it("should have getTerritories procedure", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getTerritories).toBeDefined();
  });

  it("should have getDateRange procedure", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getDateRange).toBeDefined();
  });

  it("should have getMonthlyTrend procedure", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getMonthlyTrend).toBeDefined();
  });

  it("should have getInsights procedure", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getInsights).toBeDefined();
  });

  it("should have getYoYComparison procedure", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getYoYComparison).toBeDefined();
  });

  it("should have getMonthlyTrend procedure", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getMonthlyTrend).toBeDefined();
  });

  it("should have getSummaryKPIs procedure", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getSummaryKPIs).toBeDefined();
  });

  it("should expose territory-filtered Search Console reporting", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getSearchConsoleOverview).toBeDefined();
    expect(mod.analyticsRouter._def.procedures.getSearchConsoleScope).toBeDefined();
    expect(mod.analyticsRouter._def.procedures.syncSearchConsoleTerritory).toBeDefined();
  });

  it("should expose durable, coverage-aware GA4 imports", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getGA4MappingStatus).toBeDefined();
    expect(mod.analyticsRouter._def.procedures.syncGA4TerritoryMonth).toBeDefined();
    expect(mod.analyticsRouter._def.procedures.getGA4ImportStatus).toBeDefined();
    const routerSource = readFileSync(resolve(process.cwd(), "server/analyticsRouter.ts"), "utf8");
    const analyticsPage = readFileSync(resolve(process.cwd(), "client/src/pages/Analytics.tsx"), "utf8");
    expect(routerSource).toContain("activeSnapshot");
    expect(routerSource).toContain("desc(ga4ImportRuns.year), desc(ga4ImportRuns.month)");
    expect(analyticsPage).toContain("activeGA4Snapshot");
  });

  it("marks pre-April 2025 Search Console history as unavailable rather than estimating it", () => {
    const page = readFileSync(resolve(process.cwd(), "client/src/pages/Analytics.tsx"), "utf8");
    expect(page).toContain("Verified territory-filtered Search Console history begins in April 2025");
    expect(page).toContain("unavailable rather than estimated");
  });

  it("retires the legacy territory close-rate procedure", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getTerritoryCloseRate).toBeUndefined();
  });

  it("should define durable GSC, GA4, and Salesforce performance tables", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.gscPageMetrics).toBeDefined();
    expect(schema.gscQueryMetrics).toBeDefined();
    expect(schema.ga4TerritoryMonthly).toBeDefined();
    expect(schema.ga4TerritoryPages).toBeDefined();
    expect(schema.ga4ImportRuns).toBeDefined();
    expect(schema.salesforcePerformanceSnapshots).toBeDefined();
    expect(schema.salesforceWorkbookSources).toBeDefined();
    expect(schema.salesforceWorkbookImportRuns).toBeDefined();
    expect(schema.salesforceWorkbookAggregates).toBeDefined();
    expect(schema.reportDrafts).toBeDefined();
  });

  it("registers the GBP and GA4 migrations in the Drizzle journal", () => {
    const journal = JSON.parse(readFileSync(resolve(process.cwd(), "drizzle/meta/_journal.json"), "utf8"));
    expect(journal.entries.map((entry: { tag: string }) => entry.tag)).toEqual(expect.arrayContaining([
      "0004_gbp_image_workflow",
      "0005_ga4_territory_imports",
      "0006_report_generation_integrity",
    ]));
  });

  it("feeds persisted analytics into report and suburb workflows", () => {
    const strategySource = readFileSync(resolve(process.cwd(), "server/strategyReportRouter.ts"), "utf8");
    const proposalSource = readFileSync(resolve(process.cwd(), "server/proposalRouter.ts"), "utf8");
    const suburbSource = readFileSync(resolve(process.cwd(), "server/suburbPageRouter.ts"), "utf8");
    const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

    expect(strategySource).toContain("loadTerritoryReportingAnalytics");
    expect(proposalSource).toContain("loadTerritoryReportingAnalytics");
    expect(suburbSource).toContain("findSuburbAnalyticsEvidence");
    expect(appSource).toContain('<Route path="/suburb-pages">');
    expect(appSource).toContain("<ProtectedRoute component={SuburbPageGenerator} adminOnly />");
  });

  it("should be wired into the main app router", async () => {
    const mod = await import("./routers");
    // tRPC v11 nested routers are accessible via record key
    expect(mod.appRouter._def.record.analytics).toBeDefined();
    expect(mod.appRouter._def.record.salesforceWorkbook).toBeDefined();
  });
});
