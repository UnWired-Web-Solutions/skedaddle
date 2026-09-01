import { describe, expect, it } from "vitest";
import {
  findGBPLocationRegistryEntry,
  getGBPMappingSummary,
  getGBPReadyLocationMappings,
} from "../shared/gbpLocationRegistry";

describe("GBP location registry", () => {
  it("allows only explicitly mapped, verified locations into territory imports", () => {
    const entries = getGBPReadyLocationMappings();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every(entry => entry.mappingStatus === "ready")).toBe(true);
    expect(entries.every(entry => entry.operationalStatus === "verified")).toBe(true);
    expect(entries.every(entry => Boolean(entry.territoryId))).toBe(true);
  });

  it("does not infer a mapping for blank or ambiguous shop codes", () => {
    expect(findGBPLocationRegistryEntry(null)).toBeNull();
    expect(findGBPLocationRegistryEntry("27")?.mappingStatus).toBe("review_required");
    expect(findGBPLocationRegistryEntry("3")?.territoryId).toBeNull();
  });

  it("keeps permanently closed listings excluded", () => {
    expect(findGBPLocationRegistryEntry("30")?.mappingStatus).toBe("excluded");
    expect(findGBPLocationRegistryEntry("38")?.mappingStatus).toBe("excluded");
  });

  it("exposes an auditable candidate summary", () => {
    const summary = getGBPMappingSummary();
    expect(summary.totalCandidates).toBe(32);
    expect(summary.ready).toBeGreaterThan(10);
    expect(summary.reviewRequired).toBeGreaterThan(0);
    expect(summary.excluded).toBeGreaterThan(0);
  });
});
