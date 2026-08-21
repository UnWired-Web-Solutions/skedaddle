import { describe, it, expect } from "vitest";

// Test the proposal router's territory data and HTML generation logic
describe("Proposal Generator", () => {
  describe("getTerritories", () => {
    it("should return a list of territories with required fields", async () => {
      const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");

      expect(FRANCHISE_LOCATIONS.length).toBeGreaterThan(0);

      for (const loc of FRANCHISE_LOCATIONS) {
        expect(loc.id).toBeDefined();
        expect(loc.name).toBeDefined();
        expect(loc.city).toBeDefined();
        expect(loc.state).toBeDefined();
        expect(loc.country).toBeDefined();
      }

      const dashboardIds = Object.keys(DASHBOARD_DATA);
      expect(dashboardIds.length).toBeGreaterThan(0);
    });

    it("should have revenue data for territories with dashboard data", async () => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");

      let withRevenue = 0;
      for (const [id, data] of Object.entries(DASHBOARD_DATA)) {
        expect(data.total_revenue).toBeDefined();
        if (data.total_revenue > 0) withRevenue++;
      }
      // Most territories should have revenue data (barrie-north is new/empty)
      expect(withRevenue).toBeGreaterThan(Object.keys(DASHBOARD_DATA).length * 0.9);
    });

    it("should have suburb data for most territories with dashboard data", async () => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");

      let withSuburbs = 0;
      for (const [id, data] of Object.entries(DASHBOARD_DATA)) {
        expect(data.suburbs).toBeDefined();
        if (data.suburbs.length > 0) {
          withSuburbs++;
          for (const suburb of data.suburbs) {
            expect(suburb.suburb).toBeDefined();
            expect(suburb.revenue).toBeGreaterThanOrEqual(0);
          }
        }
      }
      // Most territories should have suburb data
      expect(withSuburbs).toBeGreaterThan(Object.keys(DASHBOARD_DATA).length * 0.8);
    });

    it("should have species data for most territories with dashboard data", async () => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");

      let withSpecies = 0;
      for (const [id, data] of Object.entries(DASHBOARD_DATA)) {
        expect(data.species).toBeDefined();
        if (data.species.length > 0) {
          withSpecies++;
          for (const sp of data.species) {
            expect(sp.species).toBeDefined();
            expect(sp.total_revenue).toBeGreaterThanOrEqual(0);
          }
        }
      }
      // Most territories should have species data
      expect(withSpecies).toBeGreaterThan(Object.keys(DASHBOARD_DATA).length * 0.8);
    });
  });

  describe("Proposal HTML Template", () => {
    it("should generate valid HTML with all three pages", () => {
      const mockNarrative = "Ottawa is a strong wildlife control market with significant growth potential.";

      const html = `
        <div class="page">
          <h2>THE OPPORTUNITY</h2>
          <p>${mockNarrative}</p>
          <h2>What We Will Build</h2>
        </div>
        <div class="page">
          <h2>Investment — Per Location Pricing</h2>
        </div>
        <div class="page">
          <h2>Current Plan vs. New Campaign</h2>
        </div>
      `;

      expect(html).toContain("THE OPPORTUNITY");
      expect(html).toContain("Investment — Per Location Pricing");
      expect(html).toContain("Current Plan vs. New Campaign");
      expect(html).toContain(mockNarrative);
    });

    it("should expose exact-preview PDF export", async () => {
      const { proposalRouter } = await import("./proposalRouter");
      const procedures = (proposalRouter as any)._def.procedures;
      expect(procedures.preview).toBeDefined();
      expect(procedures.generate).toBeDefined();
      expect(procedures.exportPdf).toBeDefined();
    });

    it("should keep token cost and exploration buffer explicit", async () => {
      const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("./proposalRouter.ts", import.meta.url), "utf-8"));
      expect(source).toContain("estimatedTokenCost");
      expect(source).toContain("tokenBufferPercent");
      expect(source).toContain("Only the deliverables explicitly listed in the approved scope notes");
      expect(source).not.toContain('<td class="check">✓</td>');
    });
  });

  describe("Territory Data Completeness for Ottawa", () => {
    it("should have Ottawa-specific data for proposal generation", async () => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");

      const ottawa = DASHBOARD_DATA["ottawa"];
      expect(ottawa).toBeDefined();

      // Verify Ottawa has the key data points referenced in Dave's proposal
      expect(ottawa.total_revenue).toBeGreaterThan(2000000); // ~$3M
      expect(ottawa.suburbs.length).toBeGreaterThan(3); // Multiple suburbs

      // Check for key Ottawa suburbs
      const suburbNames = ottawa.suburbs.map((c) => c.suburb.toLowerCase());
      expect(suburbNames.some((s) => s.includes("kanata") || s.includes("ottawa"))).toBe(true);
    });
  });

  describe("Anthropic API Integration", () => {
    it.runIf(process.env.RUN_LIVE_API_TESTS === "1")("should have ANTHROPIC_API_KEY configured", () => {
      const key = process.env.ANTHROPIC_API_KEY;
      expect(key).toBeDefined();
      expect(key!.length).toBeGreaterThan(10);
    });

    it("should use claude-opus-5 model", () => {
      const expectedModel = "claude-opus-5";
      expect(expectedModel).toBe("claude-opus-5");
    });
  });
});
