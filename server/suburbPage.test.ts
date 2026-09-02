import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSuburbSchema } from "./templates/suburbPageSchema";

const visibleFactSchemaInput = {
  territoryName: "Skedaddle Minneapolis",
  territorySlug: "minneapolis",
  franchisePhone: "(952) 460-2680",
  franchiseFoundedYear: "2023",
  suburbName: "Prior Lake",
  suburbSlug: "prior-lake",
  latitude: 44.7133,
  longitude: -93.4227,
  county: "Scott County, MN",
  state: "MN",
  country: "US" as const,
  species: [{
    name: "Squirrel",
    serviceType: "Squirrel information",
    slug: "squirrel",
    description: "Reviewer-approved, visible squirrel information for the draft.",
  }],
  neighbourhoods: ["Lower Prior Lake"],
  faqs: [{ question: "What should a homeowner review?", answer: "Review the proposed page with the content team before publishing." }],
  gbpUrl: "https://www.google.com/maps/search/?api=1&query=Skedaddle+Minneapolis",
  visibleBusinessDescription: "Review-required wildlife service information for Prior Lake homeowners.",
  reviewerConfirmedServiceAvailability: true as const,
};

describe("Suburb Page Content Generator", () => {
  describe("Source-safe JSON-LD", () => {
    it("emits only reviewer-confirmed facts that are visible in the draft", () => {
      const schema = buildSuburbSchema(visibleFactSchemaInput);
      const localBusiness = schema[0] as Record<string, unknown>;
      const service = schema[2] as Record<string, unknown>;

      expect(schema).toHaveLength(4);
      expect(localBusiness["@type"]).toBe("LocalBusiness");
      expect(localBusiness.description).toBe(visibleFactSchemaInput.visibleBusinessDescription);
      expect(localBusiness.telephone).toBe(visibleFactSchemaInput.franchisePhone);
      expect(localBusiness).not.toHaveProperty("priceRange");
      expect(localBusiness).not.toHaveProperty("openingHoursSpecification");
      expect(localBusiness).not.toHaveProperty("serviceArea");
      expect(service).not.toHaveProperty("offers");
      expect(service).not.toHaveProperty("availability");
      expect(schema.some((block: any) => block["@type"] === "HowTo")).toBe(false);
    });

    it("omits hidden source fields and rejects missing reviewer service confirmation", () => {
      const schema = buildSuburbSchema(visibleFactSchemaInput);
      expect(schema[0]).not.toHaveProperty("geo");
      expect(schema[0]).not.toHaveProperty("foundingDate");
      expect(() => buildSuburbSchema({ ...visibleFactSchemaInput, reviewerConfirmedServiceAvailability: false as true })).toThrow("service availability");
    });
  });

  describe("Source-safe AEO/GEO workflow", () => {
    it("retires static dashboard performance and requires review-context safeguards", () => {
      const routerSource = readFileSync(resolve(process.cwd(), "server/suburbPageRouter.ts"), "utf8");
      const clientSource = readFileSync(resolve(process.cwd(), "client/src/pages/SuburbPageGenerator.tsx"), "utf8");
      const contract = readFileSync(resolve(process.cwd(), "SUBURB_CONTENT_SOURCE_CONTRACT.md"), "utf8");
      const research = readFileSync(resolve(process.cwd(), "AEO_GEO_CONTENT_RESEARCH.md"), "utf8");

      expect(routerSource).not.toContain("DASHBOARD_DATA");
      expect(routerSource).not.toContain("total_revenue");
      expect(routerSource).not.toContain("total_jobs");
      expect(routerSource).not.toContain("Salesforce CRM (Kira export");
      expect(routerSource).toContain("No active Drive-workbook aggregate is available for this territory");
      expect(routerSource).toContain("Reviewer-confirmed service availability");
      expect(routerSource).toContain("Structured data must mirror visible, reviewer-approved facts");
      expect(routerSource).toContain("reviewerApprovalAttestation");
      expect(clientSource).not.toContain("Tier ");
      expect(clientSource).not.toContain("Claude Opus 5");
      expect(clientSource).toContain("No static suburb list, job total, or revenue ranking is used");
      expect(contract).toContain("must not import `DASHBOARD_DATA`");
      expect(contract).toContain("not a ranking, rich-result, grounding, or citation guarantee");
      expect(research).toContain("LocalBusiness structured data");
      expect(research).toContain("Bing Webmaster Guidelines");
    });
  });
});
