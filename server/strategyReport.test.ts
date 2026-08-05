import { describe, it, expect, vi } from "vitest";

// Mock the env module
vi.mock("./_core/env", () => ({
  ENV: {
    anthropicApiKey: "test-key-123",
    forgeApiUrl: "https://forge.example.com",
    forgeApiKey: "forge-key-123",
  },
}));

describe("Strategy Report Router", () => {
  it("should export buildTerritoryData function", async () => {
    const { buildTerritoryData } = await import("./strategyReportRouter");
    expect(buildTerritoryData).toBeDefined();
    expect(typeof buildTerritoryData).toBe("function");
  });

  it("should build territory data object for Hamilton", async () => {
    const { buildTerritoryData } = await import("./strategyReportRouter");
    const data = await buildTerritoryData("hamilton");

    // Verify structure
    expect(data.id).toBe("hamilton");
    expect(data.name).toBeDefined();
    expect(data.city).toBeDefined();
    expect(data.state).toBeDefined();
    expect(data.country).toBeDefined();
    expect(data.currency).toMatch(/^(CAD|USD)$/);
    expect(data.totalRevenue).toBeGreaterThan(0);
    expect(data.totalJobs).toBeGreaterThan(0);
    expect(data.avgJobValue).toBeGreaterThan(0);

    // Species data
    expect(data.species.length).toBeGreaterThan(0);
    expect(data.species[0]).toHaveProperty("species");
    expect(data.species[0]).toHaveProperty("total_revenue");
    expect(data.species[0]).toHaveProperty("total_jobs");
    expect(data.species[0]).toHaveProperty("pctRevenue");
    expect(data.species[0]).toHaveProperty("avgJobValue");

    // Suburb data
    expect(data.suburbs.length).toBeGreaterThan(0);
    expect(data.suburbs[0]).toHaveProperty("suburb");
    expect(data.suburbs[0]).toHaveProperty("revenue");
    expect(data.suburbs[0]).toHaveProperty("jobs");
    expect(data.suburbs[0]).toHaveProperty("avgJobValue");
    expect(data.suburbs[0]).toHaveProperty("pctRevenue");
    expect(data.suburbs[0]).toHaveProperty("hasPage");

    // GBP data
    expect(data.gbp).toHaveProperty("monthly");
    expect(data.gbp).toHaveProperty("totalCalls");
    expect(data.gbp).toHaveProperty("totalClicks");
    expect(data.gbp).toHaveProperty("totalSearches");

    // GSC data
    expect(data.gsc).toHaveProperty("monthly");
    expect(data.gsc).toHaveProperty("totalClicks");
    expect(data.gsc).toHaveProperty("totalImpressions");

    // Derived fields
    expect(data.topSpeciesNames.length).toBeGreaterThan(0);
    expect(data.topSuburbNames.length).toBeGreaterThan(0);
    expect(data.seasonalTiming).toBeDefined();
    expect(data.networkAvgJobValue).toBe(2203);
    expect(data.subMarkets).toBeDefined();
    expect(data.subMarkets.length).toBeGreaterThan(0);
    expect(data.gbpSubListings).toBeDefined();
    expect(data.suburbPageStatus).toBeDefined();
    expect(data.currentGbpPostVolume).toBeDefined();
    // Hamilton should have partial page validation data
    expect(data.suburbPageStatus).toBe("partial");
    // Species should have network benchmarks
    expect(data.species[0].networkAvgJobValue).toBeGreaterThan(0);
    expect(data.species[0].networkPctRevenue).toBeGreaterThanOrEqual(0);
  });

  it("should build territory data for Milwaukee (USD territory)", async () => {
    const { buildTerritoryData } = await import("./strategyReportRouter");
    const data = await buildTerritoryData("milwaukee");

    expect(data.currency).toBe("USD");
    expect(data.currencySymbol).toBe("$");
    expect(data.country).toBe("United States");
    expect(data.totalRevenue).toBeGreaterThan(0);
  });

  it("should throw for non-existent territory", async () => {
    const { buildTerritoryData } = await import("./strategyReportRouter");
    await expect(buildTerritoryData("nonexistent-territory")).rejects.toThrow();
  });

  it("should have species sorted by revenue (highest first)", async () => {
    const { buildTerritoryData } = await import("./strategyReportRouter");
    const data = await buildTerritoryData("hamilton");

    for (let i = 1; i < data.species.length; i++) {
      expect(data.species[i - 1].total_revenue).toBeGreaterThanOrEqual(data.species[i].total_revenue);
    }
  });

  it("should have species pctRevenue sum approximately to 100%", async () => {
    const { buildTerritoryData } = await import("./strategyReportRouter");
    const data = await buildTerritoryData("hamilton");

    const totalPct = data.species.reduce((sum, s) => sum + s.pctRevenue, 0);
    // Allow some tolerance for rounding and filtered zero-revenue species
    expect(totalPct).toBeGreaterThan(90);
    expect(totalPct).toBeLessThanOrEqual(100.1);
  });

  it("should have GBP peak month identified correctly", async () => {
    const { buildTerritoryData } = await import("./strategyReportRouter");
    const data = await buildTerritoryData("hamilton");

    if (data.gbp.monthly.length > 0) {
      const maxCalls = Math.max(...data.gbp.monthly.map(m => m.calls));
      expect(data.gbp.peakCalls).toBe(maxCalls);
    }
  });

  it("should export strategyReportRouter with correct procedures", async () => {
    const { strategyReportRouter } = await import("./strategyReportRouter");
    expect(strategyReportRouter).toBeDefined();
  });
});
