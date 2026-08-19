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
    registeredPaths: ["/location/hamilton/", "/location/kitchener-waterloo/", "/location/cambridge/", "/location/elora-fergus/"],
    status: "partial",
    notes: "Registered prefixes cover Hamilton, Kitchener/Waterloo, Cambridge, and Elora/Fergus. Guelph and Acton require scope review.",
  },
  {
    territoryId: "durham",
    registeredPaths: [],
    status: "review_required",
    notes: "No Durham Region URL-prefix property appeared in the owner property inventory. Confirm the canonical path before importing.",
  },
  {
    territoryId: "ottawa",
    registeredPaths: ["/location/ottawa/"],
    status: "partial",
    notes: "Ottawa is registered; Belleville and Peterborough need scope review before a combined territory import.",
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
    status: "review_required",
    notes: "The legacy GA4 grouping includes Windsor, which is also a standalone franchise territory. Keep scopes separate until the reporting rule is confirmed.",
  },
  { territoryId: "madison", registeredPaths: ["/location/madison/"], status: "ready", notes: "Registered territory prefix." },
  {
    territoryId: "milwaukee",
    registeredPaths: ["/location/milwaukee/"],
    status: "partial",
    notes: "Milwaukee is registered; the Lake Country/Waukesha scope requires review.",
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
    registeredPaths: ["/location/barrie/", "/location/collingwood/"],
    status: "partial",
    notes: "Barrie and Collingwood are registered; York Region and the remaining service cities require scope review.",
  },
  {
    territoryId: "co-denver",
    registeredPaths: ["/location/denver/"],
    status: "partial",
    notes: "Denver is registered; the surrounding Colorado city scope requires review.",
  },
  {
    territoryId: "coquitlam",
    registeredPaths: ["/location/Coquitlam/", "/location/vancouver/"],
    status: "partial",
    notes: "Coquitlam and Vancouver are registered; Metro Vancouver and Newton scope needs review.",
  },
  {
    territoryId: "atlanta-north",
    registeredPaths: ["/location/north-atlanta-ga/"],
    status: "partial",
    notes: "Use the North Atlanta hub only. Its bat- and mouse-removal properties are child content, not separate territory prefixes.",
  },
  {
    territoryId: "orangeville",
    registeredPaths: ["/location/orangeville/"],
    status: "partial",
    notes: "Orangeville is registered; Brampton and Mississauga require scope review.",
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
    status: "review_required",
    notes: "Several listed Baltimore locations can overlap with Maryland Central reporting. Confirm ownership boundaries before importing.",
  },
  {
    territoryId: "okanagan",
    registeredPaths: ["/location/Okanagan/"],
    status: "partial",
    notes: "Okanagan is registered; Victoria requires scope review.",
  },
  {
    territoryId: "l-windsor",
    registeredPaths: ["/location/windsor/"],
    status: "review_required",
    notes: "Windsor is registered as its own property but is included in the legacy London GA4 grouping. Confirm the reporting boundary before importing.",
  },
];

export function getGscTerritoryScope(territoryId: string): GscTerritoryScope | undefined {
  return GSC_TERRITORY_SCOPES.find(scope => scope.territoryId === territoryId);
}
