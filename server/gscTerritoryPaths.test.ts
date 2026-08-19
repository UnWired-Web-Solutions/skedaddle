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
});
