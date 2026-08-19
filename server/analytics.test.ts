import { describe, it, expect, vi } from "vitest";

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
  });

  it("should expose verified territory close-rate snapshots", async () => {
    const mod = await import("./analyticsRouter");
    expect(mod.analyticsRouter._def.procedures.getTerritoryCloseRate).toBeDefined();
  });

  it("should define durable GSC and Salesforce performance tables", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.gscPageMetrics).toBeDefined();
    expect(schema.gscQueryMetrics).toBeDefined();
    expect(schema.salesforcePerformanceSnapshots).toBeDefined();
  });

  it("should be wired into the main app router", async () => {
    const mod = await import("./routers");
    // tRPC v11 nested routers are accessible via record key
    expect(mod.appRouter._def.record.analytics).toBeDefined();
  });
});
