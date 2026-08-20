import { describe, expect, it } from "vitest";
import { GSC_TERRITORY_SCOPES } from "../shared/gscTerritoryPaths";

describe("live Search Console import safeguards", () => {
  it("all 19 territories have ready scope after Aug 20 resolution", () => {
    const ready = GSC_TERRITORY_SCOPES.filter(scope => scope.status === "ready");
    expect(ready.map(scope => scope.territoryId)).toEqual(expect.arrayContaining([
      "minneapolis",
      "montreal",
      "madison",
      "maryland-central",
      "oh-columbus",
      "pa-pittsburgh",
      "hamilton",
      "london",
      "co-denver",
      "coquitlam",
      "atlanta-north",
      "md-baltimore",
      "l-windsor",
    ]));
    // All territories should now be ready — no more blocked scopes
    expect(GSC_TERRITORY_SCOPES.filter(scope => scope.status !== "ready").length).toBe(0);
  });
});
