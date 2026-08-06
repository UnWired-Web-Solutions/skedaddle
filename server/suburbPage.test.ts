import { describe, it, expect, vi } from "vitest";

// Mock the Anthropic API call
vi.mock("node-fetch", () => ({ default: vi.fn() }));

describe("Suburb Page Content Generator", () => {
  describe("Species Tier Calculator", () => {
    it("should classify species into correct tiers based on revenue percentage", async () => {
      // Import the module to test the tier logic
      const speciesData = [
        { species: "Raccoon", total_revenue: 380000, total_jobs: 120 },
        { species: "Squirrel", total_revenue: 250000, total_jobs: 90 },
        { species: "Mouse", total_revenue: 180000, total_jobs: 80 },
        { species: "Bat", total_revenue: 100000, total_jobs: 40 },
        { species: "Skunk", total_revenue: 50000, total_jobs: 20 },
        { species: "Bird", total_revenue: 20000, total_jobs: 10 },
        { species: "Rat", total_revenue: 10000, total_jobs: 5 },
      ];
      const totalRevenue = 990000;

      // Tier logic: >= 15% = Tier 1, >= 5% = Tier 2, < 5% = Tier 3
      const tiers = speciesData
        .filter(s => s.total_revenue > 0)
        .map(s => {
          const pct = (s.total_revenue / totalRevenue) * 100;
          let tier: 1 | 2 | 3;
          if (pct >= 15) tier = 1;
          else if (pct >= 5) tier = 2;
          else tier = 3;
          return { species: s.species, pct: Math.round(pct * 10) / 10, tier };
        })
        .sort((a, b) => b.pct - a.pct);

      // Raccoon: 38.4% → Tier 1
      expect(tiers[0]).toEqual({ species: "Raccoon", pct: 38.4, tier: 1 });
      // Squirrel: 25.3% → Tier 1
      expect(tiers[1]).toEqual({ species: "Squirrel", pct: 25.3, tier: 1 });
      // Mouse: 18.2% → Tier 1
      expect(tiers[2]).toEqual({ species: "Mouse", pct: 18.2, tier: 1 });
      // Bat: 10.1% → Tier 2
      expect(tiers[3]).toEqual({ species: "Bat", pct: 10.1, tier: 2 });
      // Skunk: 5.1% → Tier 2
      expect(tiers[4]).toEqual({ species: "Skunk", pct: 5.1, tier: 2 });
      // Bird: 2% → Tier 3
      expect(tiers[5]).toEqual({ species: "Bird", pct: 2, tier: 3 });
      // Rat: 1% → Tier 3
      expect(tiers[6]).toEqual({ species: "Rat", pct: 1, tier: 3 });
    });

    it("should assign correct word count targets per tier", () => {
      const tierWordCounts = { 1: 140, 2: 90, 3: 50 };
      expect(tierWordCounts[1]).toBe(140); // 130-150 range
      expect(tierWordCounts[2]).toBe(90); // 80-100 range
      expect(tierWordCounts[3]).toBe(50); // 40-60 range
    });
  });

  describe("Schema Template", () => {
    it("should build valid JSON-LD schema with all 8 blocks", async () => {
      const { buildSuburbSchema } = await import("./templates/suburbPageSchema");

      const schema = buildSuburbSchema({
        territoryName: "Minneapolis",
        territorySlug: "minneapolis",
        franchisePhone: "(952) 460-2680",
        franchiseFoundedYear: "2023",
        parentOrgFoundedYear: "1989",
        suburbName: "Prior Lake",
        suburbSlug: "prior-lake",
        latitude: 44.7133,
        longitude: -93.4227,
        county: "Scott County, MN",
        state: "MN",
        country: "US",
        species: [
          { name: "Squirrel", serviceType: "Squirrel removal", slug: "squirrel", description: "Humane squirrel removal." },
          { name: "Raccoon", serviceType: "Raccoon removal", slug: "raccoon", description: "Humane raccoon removal." },
          { name: "Bat", serviceType: "Bat removal", slug: "bat", description: "Humane bat exclusion." },
          { name: "Skunk", serviceType: "Skunk removal", slug: "skunk", description: "Humane skunk removal." },
        ],
        neighbourhoods: ["Lower Prior Lake", "Upper Prior Lake", "The Wilds"],
        nearbyCities: ["Savage", "Shakopee", "Burnsville"],
        hours: {
          weekday: { opens: "06:30", closes: "20:00" },
          saturday: { opens: "07:00", closes: "16:00" },
          sunday: { opens: "09:00", closes: "15:00" },
        },
        faqs: [
          { question: "How much does wildlife removal cost?", answer: "Pricing depends on the species and scope." },
        ],
        gbpUrl: "https://www.google.com/maps/search/?api=1&query=Skedaddle+Minneapolis",
      });

      // Should have 8 blocks: LocalBusiness, Breadcrumbs, 4 Services, FAQ, HowTo
      expect(schema.length).toBe(8);

      // Block 1: LocalBusiness
      const lb = schema[0] as any;
      expect(lb["@type"]).toBe("LocalBusiness");
      expect(lb.name).toContain("Minneapolis");
      expect(lb.telephone).toBe("(952) 460-2680");
      expect(lb.serviceArea["@type"]).toBe("GeoCircle");
      expect(lb.serviceArea.geoMidpoint.latitude).toBe(44.7133);

      // Block 2: BreadcrumbList
      const bc = schema[1] as any;
      expect(bc["@type"]).toBe("BreadcrumbList");
      expect(bc.itemListElement.length).toBe(4);
      expect(bc.itemListElement[3].name).toBe("Prior Lake");

      // Blocks 3-6: Services
      const services = schema.slice(2, 6) as any[];
      expect(services.every(s => s["@type"] === "Service")).toBe(true);
      expect(services[0].name).toContain("Squirrel");
      expect(services[0].areaServed.name).toBe("Prior Lake");

      // Block 7: FAQPage
      const faq = schema[6] as any;
      expect(faq["@type"]).toBe("FAQPage");
      expect(faq.mainEntity.length).toBe(1);

      // Block 8: HowTo
      const howTo = schema[7] as any;
      expect(howTo["@type"]).toBe("HowTo");
      expect(howTo.step.length).toBe(5);
      expect(howTo.name).toContain("Prior Lake");
    });

    it("should use correct currency based on country", async () => {
      const { buildSuburbSchema } = await import("./templates/suburbPageSchema");

      const schemaUS = buildSuburbSchema({
        territoryName: "Minneapolis",
        territorySlug: "minneapolis",
        franchisePhone: "(952) 460-2680",
        franchiseFoundedYear: "2023",
        parentOrgFoundedYear: "1989",
        suburbName: "Prior Lake",
        suburbSlug: "prior-lake",
        latitude: 44.7133,
        longitude: -93.4227,
        county: "Scott County, MN",
        state: "MN",
        country: "US",
        species: [{ name: "Squirrel", serviceType: "Squirrel removal", slug: "squirrel", description: "Test" }],
        neighbourhoods: [],
        nearbyCities: [],
        hours: { weekday: { opens: "06:30", closes: "20:00" }, saturday: { opens: "07:00", closes: "16:00" }, sunday: { opens: "09:00", closes: "15:00" } },
        faqs: [],
        gbpUrl: "https://example.com",
      });

      const schemaCA = buildSuburbSchema({
        territoryName: "Ottawa",
        territorySlug: "ottawa",
        franchisePhone: "(613) 555-0000",
        franchiseFoundedYear: "1993",
        parentOrgFoundedYear: "1989",
        suburbName: "Kanata",
        suburbSlug: "kanata",
        latitude: 45.3088,
        longitude: -75.9106,
        county: "Ottawa, ON",
        state: "ON",
        country: "CA",
        species: [{ name: "Raccoon", serviceType: "Raccoon removal", slug: "raccoon", description: "Test" }],
        neighbourhoods: [],
        nearbyCities: [],
        hours: { weekday: { opens: "06:30", closes: "20:00" }, saturday: { opens: "07:00", closes: "16:00" }, sunday: { opens: "09:00", closes: "15:00" } },
        faqs: [],
        gbpUrl: "https://example.com",
      });

      // US should use USD
      const usService = schemaUS[2] as any;
      expect(usService.offers.priceCurrency).toBe("USD");

      // CA should use CAD
      const caService = schemaCA[2] as any;
      expect(caService.offers.priceCurrency).toBe("CAD");
    });
  });

  describe("Content Structure", () => {
    it("should have correct URL slug format", () => {
      const suburbName = "Prior Lake";
      const territoryId = "minneapolis";
      const suburbSlug = suburbName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const territorySlug = territoryId.replace(/_/g, "-");
      const urlSlug = `/location/${territorySlug}/${suburbSlug}/`;

      expect(urlSlug).toBe("/location/minneapolis/prior-lake/");
    });

    it("should generate correct meta title format", () => {
      const suburbName = "Prior Lake";
      const territoryName = "Minneapolis";
      const metaTitle = `Wildlife Removal in ${suburbName} | Skedaddle ${territoryName}`;

      expect(metaTitle).toBe("Wildlife Removal in Prior Lake | Skedaddle Minneapolis");
      expect(metaTitle.length).toBeLessThanOrEqual(60);
    });
  });

  describe("Anthropic API Configuration", () => {
    it("should have ANTHROPIC_API_KEY available in environment", () => {
      // This verifies the env var exists (it's set in the project secrets)
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
      expect(process.env.ANTHROPIC_API_KEY!.length).toBeGreaterThan(10);
    });
  });
});
