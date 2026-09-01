export type SalesforceWorkbookTerritoryMapping = {
  sourceLabel: string;
  status: "ready" | "review_required" | "excluded";
  territoryId: string | null;
  currencyCode: "CAD" | "USD" | null;
  note?: string;
};

/** Exact source-label mappings only. No fuzzy city or territory inference is allowed. */
export const SALESFORCE_WORKBOOK_TERRITORIES: readonly SalesforceWorkbookTerritoryMapping[] = [
  { sourceLabel: "Hamilton", status: "ready", territoryId: "hamilton", currencyCode: "CAD" },
  { sourceLabel: "Durham", status: "ready", territoryId: "durham", currencyCode: "CAD" },
  { sourceLabel: "Ottawa", status: "ready", territoryId: "ottawa", currencyCode: "CAD" },
  { sourceLabel: "Montreal", status: "ready", territoryId: "montreal", currencyCode: "CAD" },
  { sourceLabel: "Minneapolis", status: "ready", territoryId: "minneapolis", currencyCode: "USD" },
  { sourceLabel: "Milwaukee", status: "ready", territoryId: "milwaukee", currencyCode: "USD" },
  { sourceLabel: "London", status: "ready", territoryId: "london", currencyCode: "CAD" },
  { sourceLabel: "Maryland - Central/Western Shore", status: "ready", territoryId: "maryland-central", currencyCode: "USD" },
  { sourceLabel: "Madison", status: "ready", territoryId: "madison", currencyCode: "USD" },
  { sourceLabel: "Denver", status: "ready", territoryId: "co-denver", currencyCode: "USD" },
  { sourceLabel: "Orangeville", status: "ready", territoryId: "orangeville", currencyCode: "CAD" },
  { sourceLabel: "Baltimore", status: "ready", territoryId: "md-baltimore", currencyCode: "USD" },
  { sourceLabel: "Columbus", status: "ready", territoryId: "oh-columbus", currencyCode: "USD" },
  { sourceLabel: "Atlanta North", status: "ready", territoryId: "atlanta-north", currencyCode: "USD" },
  { sourceLabel: "Coquitlam", status: "ready", territoryId: "coquitlam", currencyCode: "CAD" },
  { sourceLabel: "Okanagan", status: "ready", territoryId: "okanagan", currencyCode: "CAD" },
  { sourceLabel: "Pittsburgh", status: "ready", territoryId: "pa-pittsburgh", currencyCode: "USD" },
  { sourceLabel: "Windsor", status: "ready", territoryId: "l-windsor", currencyCode: "CAD" },
  {
    sourceLabel: "Victoria",
    status: "review_required",
    territoryId: null,
    currencyCode: null,
    note: "Do not infer an Okanagan assignment from another analytics source.",
  },
  {
    sourceLabel: "Birmingham",
    status: "excluded",
    territoryId: null,
    currencyCode: null,
    note: "Outside the current 19-territory portal scope.",
  },
];

const BY_SOURCE_LABEL = new Map(SALESFORCE_WORKBOOK_TERRITORIES.map(mapping => [mapping.sourceLabel, mapping]));

export function findSalesforceWorkbookTerritory(sourceLabel: string) {
  return BY_SOURCE_LABEL.get(sourceLabel) ?? null;
}

export const SALESFORCE_WORKBOOK_READY_TERRITORIES = SALESFORCE_WORKBOOK_TERRITORIES.filter(
  (mapping): mapping is SalesforceWorkbookTerritoryMapping & {
    status: "ready";
    territoryId: string;
    currencyCode: "CAD" | "USD";
  } => mapping.status === "ready" && Boolean(mapping.territoryId) && Boolean(mapping.currencyCode),
);
