import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Mock the env module
vi.mock("./_core/env", () => ({
  ENV: {
    anthropicApiKey: "test-key-123",
    forgeApiUrl: "https://forge.example.com",
    forgeApiKey: "forge-key-123",
  },
}));

describe("Strategy Report Router", { timeout: 15_000 }, () => {
  it("starts independent narrative tasks concurrently while preserving section order", async () => {
    const { runReportNarrativeTasks } = await import("./strategyReportRouter");
    let started = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const tasks = ["executive", "gap", "program", "content", "gbp", "plan", "risks", "recommendations"]
      .map(label => async () => {
        started += 1;
        await gate;
        return label;
      });

    const pending = runReportNarrativeTasks(tasks);
    await Promise.resolve();
    expect(started).toBe(tasks.length);
    release();
    await expect(pending).resolves.toEqual([
      "executive", "gap", "program", "content", "gbp", "plan", "risks", "recommendations",
    ]);
  });

  it("retries one transient detached-frame failure when rendering the exact draft PDF", async () => {
    const { runStrategyPdfRenderAttempt } = await import("./strategyReportRouter");
    let attempts = 0;
    const rendered = await runStrategyPdfRenderAttempt(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('Execution context is not available in detached frame or worker "about:blank"');
      }
      return Buffer.from("verified-pdf");
    });
    expect(attempts).toBe(2);
    expect(rendered.toString()).toBe("verified-pdf");
  });

  it("does not retry unrelated PDF rendering failures", async () => {
    const { runStrategyPdfRenderAttempt } = await import("./strategyReportRouter");
    let attempts = 0;
    await expect(runStrategyPdfRenderAttempt(async () => {
      attempts += 1;
      throw new Error("PDF storage permission denied");
    })).rejects.toThrow("PDF storage permission denied");
    expect(attempts).toBe(1);
  });

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

    // Persisted analytics data is preferred when available and explicit when absent.
    expect(data.ga4).toHaveProperty("monthly");
    expect(data.ga4).toHaveProperty("totalSessions");
    expect(data.ga4).toHaveProperty("totalPriorityPageSessions");
    expect(data.ga4).toHaveProperty("completeMonths");
    expect(data.ga4).toHaveProperty("partialMonths");
    expect(data).toHaveProperty("analyticsSource");
    expect(data.reportingPeriod).toEqual({
      start: "2025-07-01",
      end: "2026-06-30",
      label: "2025-07 through 2026-06",
    });

    // Derived fields
    expect(data.topSpeciesNames.length).toBeGreaterThan(0);
    expect(data.topSuburbNames.length).toBeGreaterThan(0);
    expect(data.seasonalTiming).toBeDefined();
    expect(data.salesDataSource.kind).toMatch(/active_drive_workbook_aggregate|historical_snapshot/);
    expect(data.networkAvgJobValue).toBeGreaterThan(0);
    expect(data.subMarkets).toBeDefined();
    expect(data.subMarkets.length).toBeGreaterThan(0);
    expect(data.gbpSubListings).toBeDefined();
    expect(data.suburbPageStatus).toBeDefined();
    expect(data.currentGbpPostVolume).toBe("Not provided");
    // Page coverage remains deliberately unknown unless an exact analytics match is measured.
    expect(data.suburbPageStatus).toMatch(/validated|partial|unknown/);
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
      const calls = data.gbp.monthly
        .map(month => month.calls)
        .filter((value): value is number => value !== null);
      expect(data.gbp.peakCalls).toBe(calls.length > 0 ? Math.max(...calls) : null);
    }
  });

  it("should export strategyReportRouter with correct procedures", async () => {
    const { strategyReportRouter } = await import("./strategyReportRouter");
    expect(strategyReportRouter).toBeDefined();
    expect((strategyReportRouter as any)._def.procedures.exportPdf).toBeDefined();
  });

  it("keeps the Drive workbook provenance and conversion-unavailability disclosure in the report source", () => {
    const source = readFileSync(resolve(process.cwd(), "server/strategyReportRouter.ts"), "utf8");
    expect(source).toContain("Work-Order Data Status");
    expect(source).toContain("unavailable pending an approved status definition");
    expect(source).toContain("active_drive_workbook_aggregate");
    expect(source).toContain("recorded pre-tax invoice value");
    expect(source).not.toContain("Use closed revenue, jobs, inspections, close rate");
    expect(source).not.toContain("<strong>Data Sources:</strong> Salesforce CRM");
    expect(source).toContain("Historical Sales Snapshot");
  });

  it("qualifies workbook-primary and historical-fallback sales context in report prompts and deterministic narratives", () => {
    const source = readFileSync(resolve(process.cwd(), "server/strategyReportRouter.ts"), "utf8");
    expect(source).toContain("Active Drive-workbook aggregate context");
    expect(source).toContain("Historical source context: the listed revenue and job figures are from a prior sales snapshot, not current Google Drive workbook values.");
    expect(source).toContain("not closed-job, recognized-revenue, inspection, lead, or conversion measures");
    expect(source).toContain("not current Drive-workbook evidence");
  });

  it("uses the strongest approved non-Claude internal narrative path without direct Anthropic transport", () => {
    const source = readFileSync(resolve(process.cwd(), "server/strategyReportRouter.ts"), "utf8");
    expect(source).toContain('const INTERNAL_REPORT_MODEL = "gpt-5.5"');
    expect(source).toContain('reasoning: { effort: "high" }');
    expect(source).not.toContain("https://api.anthropic.com/v1/messages");
    expect(source).not.toContain("anthropicApiKey");
    expect(source).not.toContain("claude-opus-5");
    expect(source).not.toContain("claude-opus-4-7");
  });

  it("does not split a 90-day task at an ordinary GBP mention", async () => {
    const { formatNinetyDayPlanHtml } = await import("./strategyReportRouter");
    const html = formatNinetyDayPlanHtml(
      "Month 1 — Foundation\nPriorities: Analytics owner — verify GA4, Search Console, GBP, and Salesforce coverage — produce an approved baseline; Content lead — audit dedicated hubs — document confirmed gaps",
    );
    expect(html).toContain("Analytics owner — verify GA4, Search Console, GBP, and Salesforce coverage");
    expect(html).not.toContain("<li>, and Salesforce coverage");
  });
});
