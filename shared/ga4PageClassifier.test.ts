import { describe, expect, it } from "vitest";
import { TERRITORY_GROUPS } from "./territoryMapping";
import {
  classifyGA4PagePath,
  normalizeGA4PagePath,
  suburbSlugMatchesPage,
} from "./ga4PageClassifier";
import {
  GA4_TERRITORY_PROPERTIES,
  getGA4MappingSummary,
} from "./ga4TerritoryProperties";

describe("GA4 territory mapping", () => {
  it("assigns unique properties to every canonical portal territory", () => {
    const summary = getGA4MappingSummary();
    const canonicalIds = TERRITORY_GROUPS.map(group => group.id).sort();
    const mappedIds = GA4_TERRITORY_PROPERTIES.map(mapping => mapping.territoryId).sort();

    expect(mappedIds).toEqual(canonicalIds);
    expect(summary).toMatchObject({
      accountPropertiesDiscovered: 129,
      territoryCount: 19,
      assignedReferences: 103,
      uniqueAssignedProperties: 103,
      accountPropertiesOutsideCurrentTerritoryMap: 25,
    });
    expect(summary.duplicates).toEqual([]);
    expect(
      summary.uniqueAssignedProperties + 1 + summary.accountPropertiesOutsideCurrentTerritoryMap,
    ).toBe(summary.accountPropertiesDiscovered);
  });
});

describe("GA4 page classification", () => {
  it("normalizes absolute URLs, query strings, and trailing slashes", () => {
    expect(normalizeGA4PagePath("https://www.skedaddlewildlife.com/location/hamilton/?utm_source=test"))
      .toBe("/location/hamilton");
    expect(normalizeGA4PagePath("/location//hamilton///")).toBe("/location/hamilton");
  });

  it("classifies the page families used by reports", () => {
    expect(classifyGA4PagePath("/location/hamilton/")).toBe("location_page");
    expect(classifyGA4PagePath("/location/hamilton/raccoon-removal/")).toBe("species_pages");
    expect(classifyGA4PagePath("/blog/how-to-keep-raccoons-out/")).toBe("blog_pages");
    expect(classifyGA4PagePath("/services/residential/")).toBe("service_pages");
    expect(classifyGA4PagePath("/corporate-partners/")).toBe("other_pages");
    expect(classifyGA4PagePath("/about-us/")).toBe("other_pages");
  });

  it("matches suburbs only on a complete URL path segment", () => {
    expect(suburbSlugMatchesPage("/location/hamilton/stoney-creek/", "Stoney Creek")).toBe(true);
    expect(suburbSlugMatchesPage("https://example.com/location/hamilton/stoney-creek/", "Stoney Creek")).toBe(true);
    expect(suburbSlugMatchesPage("/location/hamilton/hamilton-mountain/", "Hamilton")).toBe(true);
    expect(suburbSlugMatchesPage("/location/hamilton/hamilton-mountain/", "Milton")).toBe(false);
  });
});
