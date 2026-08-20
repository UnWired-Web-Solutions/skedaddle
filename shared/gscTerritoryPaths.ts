/**
 * Search Console territory scope registry.
 *
 * Verified against the owner account's property picker on 2026-08-19. Values
 * are registered URL-prefix properties, not inferred website paths. A status
 * other than "ready" blocks automatic territory import until its scope is
 * reviewed, preserving the portal's no-fabrication rule.
 */

export const GSC_PARENT_PROPERTY = "sc-domain:skedaddlewildlife.com";

export type GscScopeStatus = "ready" | "partial" | "review_required";

export interface GscTerritoryScope {
  territoryId: string;
  registeredPaths: string[];
  status: GscScopeStatus;
  notes: string;
}

export const GSC_TERRITORY_SCOPES: GscTerritoryScope[] = [
  {
    territoryId: "hamilton",
    registeredPaths: ["/location/hamilton/", "/location/kitchener-waterloo/", "/location/cambridge/", "/location/elora-fergus/", "/location/guelph/"],
    status: "ready",
    notes: "Hamilton, Kitchener/Waterloo, Cambridge, Elora/Fergus, and Guelph all have verified live GSC pages. Acton has no pages — excluded.",
  },
  {
    territoryId: "durham",
    registeredPaths: ["/location/ajax/", "/location/bowmanville/", "/location/durham-region/", "/location/etobicoke/", "/location/north-york/", "/location/oshawa/", "/location/pickering/", "/location/rexdale/", "/location/scarborough/", "/location/whitby/"],
    status: "ready",
    notes: "All mapped Durham Region cities have matching live Search Console location roots.",
  },
  {
    territoryId: "ottawa",
    registeredPaths: ["/location/belleville/", "/location/ottawa/", "/location/peterborough/"],
    status: "ready",
    notes: "Ottawa, Belleville, and Peterborough all have matching live Search Console location roots.",
  },
  {
    territoryId: "minneapolis",
    registeredPaths: ["/location/minneapolis/", "/location/saint-paul/", "/location/anoka-county/", "/location/hennepin-county/"],
    status: "ready",
    notes: "All listed Minneapolis territory location prefixes are registered.",
  },
  { territoryId: "montreal", registeredPaths: ["/location/montreal/"], status: "ready", notes: "Registered territory prefix." },
  {
    territoryId: "london",
    registeredPaths: ["/location/london/"],
    status: "ready",
    notes: "London has verified live GSC pages. Windsor is a separate territory with its own scope — no overlap.",
  },
  { territoryId: "madison", registeredPaths: ["/location/madison/"], status: "ready", notes: "Registered territory prefix." },
  {
    territoryId: "milwaukee",
    registeredPaths: ["/location/lake-country-waukesha/", "/location/milwaukee/"],
    status: "ready",
    notes: "Milwaukee and Lake Country/Waukesha both have matching live Search Console location roots.",
  },
  {
    territoryId: "maryland-central",
    registeredPaths: [
      "/location/anne-arundel-md/", "/location/howard-county-md/", "/location/annapolis-md/", "/location/annapolis-junction-md/",
      "/location/bowie-md/", "/location/columbia-md/", "/location/clarksville-md/", "/location/crofton-md/",
      "/location/elkridge-md/", "/location/ellicott-md/", "/location/severna-park-md/", "/location/calvert-county-md/", "/location/prince-georges-md/",
    ],
    status: "ready",
    notes: "Registered prefixes cover the listed Maryland Central locations. Do not add Baltimore-area prefixes because they overlap with the Baltimore territory.",
  },
  {
    territoryId: "barrie-north",
    registeredPaths: ["/location/barrie/", "/location/collingwood/", "/location/markham/", "/location/newmarket/", "/location/richmond-hill/", "/location/thornhill/", "/location/vaughan/", "/location/whitchurch-stouffville/", "/location/woodbridge/", "/location/york-region/"],
    status: "ready",
    notes: "All mapped Barrie/York Region cities have matching live Search Console location roots.",
  },
  {
    territoryId: "co-denver",
    registeredPaths: ["/location/denver/"],
    status: "ready",
    notes: "Denver has verified live GSC pages. Surrounding CO cities (Lakewood, Thornton, Littleton, Arvada, Westminster) have no dedicated location pages on the site.",
  },
  {
    territoryId: "coquitlam",
    registeredPaths: ["/location/coquitlam/", "/location/vancouver/"],
    status: "ready",
    notes: "Coquitlam and Vancouver have verified live GSC pages. Metro Vancouver and Newton have no dedicated pages — excluded.",
  },
  {
    territoryId: "atlanta-north",
    registeredPaths: ["/location/north-atlanta-ga/", "/location/marietta-ga/", "/location/smyrna-ga/", "/location/roswell-ga/", "/location/sandy-springs-ga/"],
    status: "ready",
    notes: "North Atlanta, Marietta, Smyrna, Roswell, and Sandy Springs all have verified live GSC pages with blog content.",
  },
  {
    territoryId: "orangeville",
    registeredPaths: ["/location/brampton/", "/location/mississauga/", "/location/orangeville/"],
    status: "ready",
    notes: "Orangeville, Brampton, and Mississauga all have matching live Search Console location roots.",
  },
  {
    territoryId: "oh-columbus",
    registeredPaths: [
      "/location/columbus/", "/location/dublin/", "/location/gahanna/", "/location/grove-city/", "/location/hilliard/",
      "/location/new-albany/", "/location/pickerington/", "/location/reynoldsburg/", "/location/upper-arlington/",
      "/location/westerville/", "/location/whitehall/", "/location/delaware/", "/location/clintonville/", "/location/franklinton/",
    ],
    status: "ready",
    notes: "All listed Columbus territory location prefixes are registered.",
  },
  { territoryId: "pa-pittsburgh", registeredPaths: ["/location/pittsburgh/"], status: "ready", notes: "Registered territory prefix." },
  {
    territoryId: "md-baltimore",
    registeredPaths: ["/location/baltimore-md/", "/location/bethesda-md/", "/location/montgomery-county-md/", "/location/rockville-md/", "/location/silver-spring-md/", "/location/wheaton-md/"],
    status: "ready",
    notes: "All Baltimore territory paths verified with live GSC data. No overlap with Maryland Central — MD Central uses different path slugs (anne-arundel-md, howard-county-md, etc.).",
  },
  {
    territoryId: "okanagan",
    registeredPaths: ["/location/okanagan/", "/location/victoria/"],
    status: "ready",
    notes: "Okanagan and Victoria both have matching live Search Console location roots.",
  },
  {
    territoryId: "l-windsor",
    registeredPaths: ["/location/windsor/"],
    status: "ready",
    notes: "Windsor has verified live GSC pages. It is a standalone franchise territory — separate from London in both GSC and GA4 reporting.",
  },
];

export function getGscTerritoryScope(territoryId: string): GscTerritoryScope | undefined {
  return GSC_TERRITORY_SCOPES.find(scope => scope.territoryId === territoryId);
}
