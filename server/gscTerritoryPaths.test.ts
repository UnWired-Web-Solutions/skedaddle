import { describe, expect, it } from "vitest";
import { FRANCHISE_LOCATIONS } from "../client/src/data/franchises";
import {
  GSC_PARENT_PROPERTY,
  GSC_TERRITORY_SCOPES,
  getGscTerritoryScope,
} from "../shared/gscTerritoryPaths";

describe("Search Console territory scope registry", () => {
  it("uses the verified Skedaddle domain property", () => {
    expect(GSC_PARENT_PROPERTY).toBe("sc-domain:skedaddlewildlife.com");
  });

  it("makes an explicit scope decision for every franchise territory", () => {
    expect(GSC_TERRITORY_SCOPES).toHaveLength(FRANCHISE_LOCATIONS.length);
    for (const franchise of FRANCHISE_LOCATIONS) {
      const scope = getGscTerritoryScope(franchise.id);
      expect(scope, `Missing GSC scope for ${franchise.id}`).toBeDefined();
      expect(["ready", "partial", "review_required"]).toContain(scope?.status);
      if (scope?.status === "ready") {
        expect(scope.registeredPaths.length).toBeGreaterThan(0);
      }
    }
  });

  it("enables only the additional territories whose mapped cities have live matching paths", () => {
    const expectedPaths: Record<string, string[]> = {
      durham: ["/location/durham-region/", "/location/ajax/", "/location/whitby/"],
      ottawa: ["/location/ottawa/", "/location/belleville/", "/location/peterborough/"],
      milwaukee: ["/location/milwaukee/", "/location/lake-country-waukesha/"],
      "barrie-north": ["/location/barrie/", "/location/york-region/", "/location/collingwood/"],
      orangeville: ["/location/orangeville/", "/location/brampton/", "/location/mississauga/"],
      okanagan: ["/location/okanagan/", "/location/victoria/"],
    };

    for (const [territoryId, paths] of Object.entries(expectedPaths)) {
      const scope = getGscTerritoryScope(territoryId);
      expect(scope?.status).toBe("ready");
      for (const path of paths) expect(scope?.registeredPaths).toContain(path);
    }
  });
});
