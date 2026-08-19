import { describe, expect, it } from "vitest";
import { GSC_TERRITORY_SCOPES } from "../shared/gscTerritoryPaths";

describe("live Search Console import safeguards", () => {
  it("permits live import only for territories with an explicitly ready scope", () => {
    const ready = GSC_TERRITORY_SCOPES.filter(scope => scope.status === "ready");
    expect(ready.map(scope => scope.territoryId)).toEqual(expect.arrayContaining([
      "minneapolis",
      "montreal",
      "madison",
      "maryland-central",
      "oh-columbus",
      "pa-pittsburgh",
    ]));
    expect(GSC_TERRITORY_SCOPES.filter(scope => scope.status !== "ready").length).toBeGreaterThan(0);
  });
});
