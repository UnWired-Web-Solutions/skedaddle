/**
 * GBP location registry — grounded in the UWS Business Profile Manager
 * inventory reviewed on Aug. 31, 2026. These are matching candidates only;
 * no record is eligible for import until the Business Information API returns
 * a matching live resource name and shop code.
 */

export type GBPMappingStatus = "ready" | "review_required" | "excluded" | "unmapped";

export type GBPProfileOperationalStatus =
  | "verified"
  | "published_permanently_closed"
  | "verification_required_permanently_closed";

export interface GBPLocationRegistryEntry {
  /** Google Business Profile `storeCode` / Business Profile Manager shop code. */
  shopCode: string | null;
  /** Manager-inventory coverage label recorded during the access audit. */
  coverageLabel: string;
  operationalStatus: GBPProfileOperationalStatus;
  /** Canonical portal territory ID when the mapping is explicit and approved. */
  territoryId: string | null;
  mappingStatus: GBPMappingStatus;
  /** The safety rationale for the import decision. */
  rationale: string;
}

/**
 * Initial registry. It intentionally keeps ambiguous or blank-shop-code
 * profiles out of territory aggregation. The live location sync must compare
 * API resource names and store codes to these entries before it can import.
 */
export const GBP_LOCATION_REGISTRY: readonly GBPLocationRegistryEntry[] = [
  { shopCode: null, coverageLabel: "Belleville / Prince Edward / Trenton", operationalStatus: "published_permanently_closed", territoryId: null, mappingStatus: "excluded", rationale: "Permanently closed listing; never include in current territory totals." },
  { shopCode: null, coverageLabel: "Bowie / Arnold and surrounding areas", operationalStatus: "verified", territoryId: null, mappingStatus: "review_required", rationale: "Verified listing has no recorded shop code; await live resource ID before matching." },
  { shopCode: "05487409052313605925", coverageLabel: "Towson / Dundalk and surrounding areas", operationalStatus: "verified", territoryId: "md-baltimore", mappingStatus: "ready", rationale: "Explicit Baltimore territory candidate." },
  { shopCode: "07191039821340075907", coverageLabel: "Arvada / Aurora and surrounding areas", operationalStatus: "verified", territoryId: "co-denver", mappingStatus: "ready", rationale: "Explicit Denver territory candidate." },
  { shopCode: "08501327997348826881", coverageLabel: "Obetz / Dublin and surrounding areas", operationalStatus: "verified", territoryId: "oh-columbus", mappingStatus: "ready", rationale: "Explicit Columbus territory candidate." },
  { shopCode: "1", coverageLabel: "Ancaster address", operationalStatus: "verified", territoryId: "hamilton", mappingStatus: "ready", rationale: "Explicit Hamilton territory candidate." },
  { shopCode: "11549891598088423237", coverageLabel: "Imperial / Hookstown and surrounding areas", operationalStatus: "verified", territoryId: "pa-pittsburgh", mappingStatus: "ready", rationale: "Explicit Pittsburgh territory candidate." },
  { shopCode: "11631462055787707296", coverageLabel: "Olney / Laurel and surrounding areas", operationalStatus: "verified", territoryId: "maryland-central", mappingStatus: "ready", rationale: "Explicit Maryland Central territory candidate." },
  { shopCode: "11974700586889312946", coverageLabel: "Essex / LaSalle and surrounding areas", operationalStatus: "verified", territoryId: "l-windsor", mappingStatus: "ready", rationale: "Explicit Windsor territory candidate." },
  { shopCode: "12", coverageLabel: "York / Toronto and surrounding areas", operationalStatus: "verified", territoryId: null, mappingStatus: "excluded", rationale: "Toronto is outside the current 19-territory portal scope." },
  { shopCode: "13465152855530330435", coverageLabel: "Atlanta / Decatur and surrounding areas", operationalStatus: "verified", territoryId: "atlanta-north", mappingStatus: "ready", rationale: "Explicit Atlanta North territory candidate." },
  { shopCode: "19", coverageLabel: "Ottawa / Arnprior and surrounding areas", operationalStatus: "verified", territoryId: "ottawa", mappingStatus: "ready", rationale: "Explicit Ottawa territory candidate." },
  { shopCode: "2", coverageLabel: "Grimsby / Lincoln and surrounding areas", operationalStatus: "verified", territoryId: null, mappingStatus: "excluded", rationale: "Niagara is outside the current 19-territory portal scope." },
  { shopCode: "20", coverageLabel: "Laval / Hudson and surrounding areas", operationalStatus: "verified", territoryId: "montreal", mappingStatus: "ready", rationale: "Explicit Montreal territory candidate." },
  { shopCode: "21", coverageLabel: "Lower Sackville address", operationalStatus: "verified", territoryId: null, mappingStatus: "excluded", rationale: "Halifax is outside the current 19-territory portal scope." },
  { shopCode: "22", coverageLabel: "Truro address", operationalStatus: "verified", territoryId: null, mappingStatus: "excluded", rationale: "Truro is outside the current 19-territory portal scope." },
  { shopCode: "23", coverageLabel: "Greater Sudbury", operationalStatus: "verified", territoryId: null, mappingStatus: "excluded", rationale: "Sudbury is outside the current 19-territory portal scope." },
  { shopCode: "24", coverageLabel: "Aurora / Barrie and surrounding areas", operationalStatus: "verified", territoryId: "barrie-north", mappingStatus: "ready", rationale: "Explicit Barrie / York Region territory candidate." },
  { shopCode: "25", coverageLabel: "London / Ingersoll and surrounding areas", operationalStatus: "verified", territoryId: "london", mappingStatus: "ready", rationale: "Explicit London territory candidate." },
  { shopCode: "26", coverageLabel: "Ajax / Oshawa and surrounding areas", operationalStatus: "verified", territoryId: "durham", mappingStatus: "ready", rationale: "Explicit Durham territory candidate." },
  { shopCode: "27", coverageLabel: "Lakefield / Campbellford and surrounding areas", operationalStatus: "verified", territoryId: null, mappingStatus: "review_required", rationale: "Could be Ottawa or Peterborough; requires an approved territory assignment." },
  { shopCode: "3", coverageLabel: "Brant / Delhi and surrounding areas", operationalStatus: "verified", territoryId: null, mappingStatus: "review_required", rationale: "Could be Hamilton or Brantford; requires an approved territory assignment." },
  { shopCode: "30", coverageLabel: "Katy / Manvel and surrounding areas", operationalStatus: "verification_required_permanently_closed", territoryId: null, mappingStatus: "excluded", rationale: "Unverified and permanently closed; never include in current territory totals." },
  { shopCode: "32", coverageLabel: "Madison / DeForest and surrounding areas", operationalStatus: "verified", territoryId: "madison", mappingStatus: "ready", rationale: "Explicit Madison territory candidate." },
  { shopCode: "33", coverageLabel: "Delta / Anmore and surrounding areas", operationalStatus: "verified", territoryId: "coquitlam", mappingStatus: "ready", rationale: "Explicit Coquitlam / Metro Vancouver territory candidate." },
  { shopCode: "34", coverageLabel: "Oliver / Vernon and surrounding areas", operationalStatus: "verified", territoryId: "okanagan", mappingStatus: "ready", rationale: "Explicit Okanagan territory candidate." },
  { shopCode: "35", coverageLabel: "Erin / Bolton and surrounding areas", operationalStatus: "verified", territoryId: "orangeville", mappingStatus: "ready", rationale: "Explicit Orangeville territory candidate." },
  { shopCode: "38", coverageLabel: "Duncan / Colwood and surrounding areas", operationalStatus: "published_permanently_closed", territoryId: null, mappingStatus: "excluded", rationale: "Permanently closed listing; never include in current territory totals." },
  { shopCode: "5", coverageLabel: "Ayr / Baden and surrounding areas", operationalStatus: "verified", territoryId: null, mappingStatus: "review_required", rationale: "Kitchener / Waterloo handling requires explicit confirmation before aggregation." },
  { shopCode: "6", coverageLabel: "Milton / Brampton and surrounding areas", operationalStatus: "verified", territoryId: null, mappingStatus: "review_required", rationale: "Mississauga / Brampton handling requires explicit confirmation before aggregation." },
  { shopCode: "865343", coverageLabel: "Wales / Hartland and surrounding areas", operationalStatus: "verified", territoryId: "milwaukee", mappingStatus: "ready", rationale: "Explicit Milwaukee territory candidate." },
  { shopCode: "16834354687722739934", coverageLabel: "Minneapolis / Anoka / Orono and surrounding areas", operationalStatus: "verified", territoryId: "minneapolis", mappingStatus: "ready", rationale: "Explicit Minneapolis territory candidate." },
];

export function findGBPLocationRegistryEntry(shopCode: string | null | undefined): GBPLocationRegistryEntry | null {
  if (!shopCode) return null;
  return GBP_LOCATION_REGISTRY.find(entry => entry.shopCode === shopCode) ?? null;
}

export function getGBPReadyLocationMappings(territoryId?: string): GBPLocationRegistryEntry[] {
  return GBP_LOCATION_REGISTRY.filter(entry =>
    entry.mappingStatus === "ready" &&
    entry.operationalStatus === "verified" &&
    (!territoryId || entry.territoryId === territoryId),
  );
}

export function getGBPMappingSummary() {
  const count = (status: GBPMappingStatus) => GBP_LOCATION_REGISTRY.filter(entry => entry.mappingStatus === status).length;
  return {
    totalCandidates: GBP_LOCATION_REGISTRY.length,
    ready: count("ready"),
    reviewRequired: count("review_required"),
    excluded: count("excluded"),
    unmapped: count("unmapped"),
    territoriesReady: Array.from(new Set(getGBPReadyLocationMappings().map(entry => entry.territoryId))).filter(Boolean).sort(),
  };
}
