/**
 * GA4 Territory Property Mapping
 * Maps each of the 19 canonical franchise territories to their GA4 property IDs.
 * Skedaddle uses separate GA4 properties per sub-location,
 * so each territory may have multiple property IDs.
 *
 * Territory IDs match shared/territoryMapping.ts (the canonical source).
 * Account: Skedaddle Wildlife (39401450)
 * Total properties discovered: 129
 * Generated: Aug 19, 2026
 */

export interface GA4TerritoryMapping {
  territoryId: string;
  propertyIds: string[];
  notes: string;
}

export const SKEDADDLE_GA4_ACCOUNT_ID = "39401450";

/** The main corporate/network property — tracks skedaddlewildlife.com overall */
export const SKEDADDLE_GA4_CONTROL_PROPERTY = "308369125";

export const GA4_TERRITORY_PROPERTIES: GA4TerritoryMapping[] = [
  {
    territoryId: "atlanta-north",
    propertyIds: ["446717989", "446737287", "446818789", "446821258", "446822081", "446823887", "446824194", "446827617", "446833421", "446833564", "446836205", "446852423"],
    notes: "Sub-locations: Marietta, Smyrna, Peachtree Corners, Brookhaven, East Cobb, Sandy Springs, Hiram, Roswell, Mableton, Johns Creek, North Atlanta, Vinings",
  },
  {
    territoryId: "barrie-north",
    propertyIds: ["386522863", "386983418", "409155385", "386531140", "386228220", "386349373", "409157507", "387056234", "409102139", "409154277"],
    notes: "Sub-locations: Barrie, York Region, Collingwood, Newmarket, Markham, Richmond Hill, Thornhill, Vaughan, Woodbridge, Whitchurch/Stouffville",
  },
  {
    territoryId: "co-denver",
    propertyIds: ["475775344", "475775567", "475775841", "475793709", "475787513", "475794339", "475795059", "475796922"],
    notes: "Sub-locations: Denver, Lakewood, Thornton, Littleton, Foothills Region, Arvada, Westminster, Englewood",
  },
  {
    territoryId: "coquitlam",
    propertyIds: ["386626635", "426909661"],
    notes: "Sub-locations: Coquitlam, Vancouver",
  },
  {
    territoryId: "durham",
    propertyIds: ["386091935", "386412751", "386678979", "386747068", "386785776", "386903560", "386266107", "386689926", "386579574", "386492593"],
    notes: "Sub-locations: Durham, Pickering, Bowmanville, Whitby, Oshawa, Ajax, Scarborough, North York, Etobicoke, Rexdale",
  },
  {
    territoryId: "hamilton",
    propertyIds: ["386253218", "386951044", "427422530", "427430066", "510065673"],
    notes: "Sub-locations: Hamilton, Kitchener/Waterloo, Guelph, Elora & Fergus, Cambridge",
  },
  {
    territoryId: "l-windsor",
    propertyIds: ["534472838"],
    notes: "Sub-locations: Windsor",
  },
  {
    territoryId: "london",
    propertyIds: ["387162165"],
    notes: "Sub-locations: London",
  },
  {
    territoryId: "madison",
    propertyIds: ["386333856"],
    notes: "Sub-locations: Madison",
  },
  {
    territoryId: "maryland-central",
    propertyIds: ["426814229", "426785738", "426783946", "455082263", "455082346", "455115352", "455118412", "455127000", "455127001", "455137804", "455124071", "455125356", "455136583", "455136584"],
    notes: "Sub-locations: Prince George's County, Anne Arundel, Calvert County, Pasadena, Annapolis, Severna Park, Annapolis Junction, Bowie, Howard County, Columbia, Clarksville, Crofton, Elkridge, Ellicott City",
  },
  {
    territoryId: "md-baltimore",
    propertyIds: ["455121039", "455174211", "455120736", "455111143", "455173388", "455159446", "487050874", "455082263"],
    notes: "Sub-locations: Baltimore, Bethesda, Montgomery County, Rockville, Silver Springs, Wheaton, Washington, Pasadena",
  },
  {
    territoryId: "milwaukee",
    propertyIds: ["386821319", "386208908"],
    notes: "Sub-locations: Milwaukee, Lake Country/Waukesha",
  },
  {
    territoryId: "minneapolis",
    propertyIds: ["426784934", "409099002", "409118728", "464858798"],
    notes: "Sub-locations: Minneapolis, Anoka County, Hennepin County, Saint Paul",
  },
  {
    territoryId: "montreal",
    propertyIds: ["386983862"],
    notes: "Sub-locations: Montreal",
  },
  {
    territoryId: "oh-columbus",
    propertyIds: ["475793711", "475791585", "475758029", "475770505", "475780060", "475777952", "475777541", "475777604", "475787515", "475787520", "475795641", "475794028", "475772719", "475773145", "475796134", "475791279"],
    notes: "Sub-locations: Columbus, Pickerington, Reynoldsburg, Grove City, Gahanna, Hilliard, Whitehall, Clintonville, Franklinton, Westerville, New Albany,  Upper Arlington, Delaware, Dublin, Gahanna, Sunbury",
  },
  {
    territoryId: "okanagan",
    propertyIds: ["386178416", "409155184"],
    notes: "Sub-locations: Okanagan, Victoria",
  },
  {
    territoryId: "orangeville",
    propertyIds: ["409126906", "489589930", "386878372"],
    notes: "Sub-locations: Orangeville, Brampton, Mississauga",
  },
  {
    territoryId: "ottawa",
    propertyIds: ["386553931", "386448586", "409105860"],
    notes: "Sub-locations: Ottawa, Belleville, Peterborough",
  },
  {
    territoryId: "pa-pittsburgh",
    propertyIds: ["487034337"],
    notes: "Sub-locations: Pittsburgh",
  },
];

export function getGA4PropertiesForTerritory(territoryId: string): string[] {
  const mapping = GA4_TERRITORY_PROPERTIES.find(t => t.territoryId === territoryId);
  return mapping?.propertyIds ?? [];
}
