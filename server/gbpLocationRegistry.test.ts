import { describe, expect, it } from "vitest";
import {
  findApprovedGBPLocationBinding,
  findGBPLocationCandidateByShopCode,
  getGBPImportEligibleBindings,
  getGBPMappingSummary,
  getGBPReadyLocationCandidates,
} from "../shared/gbpLocationRegistry";

describe("GBP location registry", () => {
  it("allows only explicitly mapped, verified locations into territory imports", () => {
    const entries = getGBPReadyLocationCandidates();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every(entry => entry.mappingStatus === "ready")).toBe(true);
    expect(entries.every(entry => entry.operationalStatus === "verified")).toBe(true);
    expect(entries.every(entry => Boolean(entry.territoryId))).toBe(true);
  });

  it("does not infer a mapping for blank or ambiguous shop codes", () => {
    expect(findGBPLocationCandidateByShopCode(null)).toBeNull();
    expect(findGBPLocationCandidateByShopCode("27")?.mappingStatus).toBe("review_required");
    expect(findGBPLocationCandidateByShopCode("3")?.territoryId).toBeNull();
  });

  it("keeps permanently closed listings excluded", () => {
    expect(findGBPLocationCandidateByShopCode("30")?.mappingStatus).toBe("excluded");
    expect(findGBPLocationCandidateByShopCode("38")?.mappingStatus).toBe("excluded");
  });

  it("never authorizes an import from a shop code without an exact approved API binding", () => {
    expect(findGBPLocationCandidateByShopCode("1")?.territoryId).toBe("hamilton");
    expect(findApprovedGBPLocationBinding({
      accountName: "accounts/123",
      apiLocationName: "locations/456",
      shopCode: "1",
    })).toBeNull();
    expect(getGBPImportEligibleBindings()).toEqual([]);
  });

  it("exposes an auditable candidate summary", () => {
    const summary = getGBPMappingSummary();
    expect(summary.totalCandidates).toBe(32);
    expect(summary.ready).toBeGreaterThan(10);
    expect(summary.reviewRequired).toBeGreaterThan(0);
    expect(summary.excluded).toBeGreaterThan(0);
    expect(summary.importEligible).toBe(0);
  });
});
