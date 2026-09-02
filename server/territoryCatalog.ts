/**
 * Approved territory identity and geography only. This is deliberately kept
 * separate from legacy dashboard fixtures and contains no performance values,
 * suburb lists, customer data, or inferred service coverage.
 */
export interface TerritoryCatalogEntry {
  id: string;
  name: string;
  city: string;
  state: string;
  country: "US" | "CA";
}

export const TERRITORY_CATALOG: readonly TerritoryCatalogEntry[] = [
  { id: "hamilton", name: "Skedaddle Hamilton", city: "Hamilton", state: "ON", country: "CA" },
  { id: "durham", name: "Skedaddle Durham", city: "Whitby", state: "ON", country: "CA" },
  { id: "ottawa", name: "Skedaddle Ottawa", city: "Ottawa", state: "ON", country: "CA" },
  { id: "minneapolis", name: "Skedaddle Minneapolis", city: "Minneapolis", state: "MN", country: "US" },
  { id: "montreal", name: "Skedaddle Montreal", city: "Montreal", state: "QC", country: "CA" },
  { id: "london", name: "Skedaddle London", city: "London", state: "ON", country: "CA" },
  { id: "madison", name: "Skedaddle Madison", city: "Madison", state: "WI", country: "US" },
  { id: "milwaukee", name: "Skedaddle Milwaukee", city: "Milwaukee", state: "WI", country: "US" },
  { id: "maryland-central", name: "Skedaddle Maryland Central", city: "Annapolis", state: "MD", country: "US" },
  { id: "co-denver", name: "Skedaddle Denver", city: "Denver", state: "CO", country: "US" },
  { id: "oh-columbus", name: "Skedaddle Columbus", city: "Columbus", state: "OH", country: "US" },
  { id: "md-baltimore", name: "Skedaddle Baltimore", city: "Baltimore", state: "MD", country: "US" },
  { id: "pa-pittsburgh", name: "Skedaddle Pittsburgh", city: "Pittsburgh", state: "PA", country: "US" },
  { id: "orangeville", name: "Skedaddle Orangeville", city: "Orangeville", state: "ON", country: "CA" },
  { id: "atlanta-north", name: "Skedaddle Atlanta North", city: "Atlanta", state: "GA", country: "US" },
  { id: "okanagan", name: "Skedaddle Okanagan", city: "Kelowna", state: "BC", country: "CA" },
  { id: "coquitlam", name: "Skedaddle Coquitlam", city: "Coquitlam", state: "BC", country: "CA" },
  { id: "l-windsor", name: "Skedaddle Windsor", city: "Windsor", state: "ON", country: "CA" },
  { id: "barrie-north", name: "Skedaddle Barrie North", city: "Barrie", state: "ON", country: "CA" },
];

export function getTerritoryCatalogEntry(id: string): TerritoryCatalogEntry | undefined {
  return TERRITORY_CATALOG.find((territory) => territory.id === id);
}
