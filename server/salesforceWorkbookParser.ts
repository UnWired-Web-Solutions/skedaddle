import { createHash } from "node:crypto";
import { findSalesforceWorkbookTerritory } from "../shared/salesforceWorkbookMapping";

export const SALESFORCE_WORKBOOK_HEADER = [
  "Id",
  "Status",
  "SchedStartTime",
  "LastModifiedDate",
  "CreatedDate",
  "Street",
  "City",
  "PostalCode",
  "Work_Type__c",
  "Reporting_Primary_Territory__c",
  "Contact.Account.Lead_Source__c",
  "salesperson_new__c",
  "Species__c",
  "Invoice_pre_tax_amount__c",
] as const;

export const KNOWN_SALESFORCE_WORKBOOK_STATUSES = new Set([
  "Completed",
  "Compl.DoJobsche.duringPA",
  "Lost Quote",
  "Compl.DoJobsche.afterPA",
  "Quote Follow Up",
  "Lost Quote - no further action",
  "Cannot Complete",
  "Scheduled",
  "Dispatched",
  "None",
  "Canceled",
  "Unscheduled",
  "Do-Job Cancelled",
  "Archived Recall - Open",
  "In Progress",
  "Completed - Do Job scheduled after PA date",
]);

export type SalesforceWorkbookAggregateInput = {
  territoryId: string;
  sourceTerritoryLabel: string;
  periodYear: number;
  periodMonth: number;
  statusLabel: string;
  speciesLabel: string;
  cityLabel: string;
  currencyCode: "CAD" | "USD";
  recordCount: number;
  invoiceValueCount: number;
  invoicePreTaxAmount: string;
};

export type SalesforceWorkbookParseResult = {
  sourceRowCount: number;
  rowsProcessed: number;
  rowsRejected: number;
  blankIdCount: number;
  duplicateIdCount: number;
  unperiodizedRowCount: number;
  sourceFingerprint: string;
  maxSourceModifiedAt: string | null;
  territoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  unknownTerritories: Record<string, number>;
  unknownStatuses: Record<string, number>;
  aggregates: SalesforceWorkbookAggregateInput[];
};

type MutableAggregate = Omit<SalesforceWorkbookAggregateInput, "invoicePreTaxAmount"> & {
  invoicePreTaxAmountCents: bigint;
};

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseSourceDate(value: unknown, label: string): Date | null {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${label}; import stopped.`);
  return parsed;
}

function parseAmountToCents(value: unknown): bigint | null {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.replace(/[$,\s]/g, "");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Invalid Invoice_pre_tax_amount__c; import stopped.");
  }
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

function addCount(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function normalizedDimensionKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function aggregateKey(row: Omit<MutableAggregate, "recordCount" | "invoiceValueCount" | "invoicePreTaxAmountCents">) {
  return [
    normalizedDimensionKey(row.territoryId),
    normalizedDimensionKey(row.sourceTerritoryLabel),
    row.periodYear,
    row.periodMonth,
    normalizedDimensionKey(row.statusLabel),
    normalizedDimensionKey(row.speciesLabel),
    normalizedDimensionKey(row.cityLabel),
    row.currencyCode,
  ].join("|");
}

function centsToDecimal(cents: bigint): string {
  const negative = cents < BigInt(0);
  const absolute = negative ? -cents : cents;
  const whole = absolute / BigInt(100);
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function parseSalesforceWorkbookRows(header: unknown[], rows: unknown[][]): SalesforceWorkbookParseResult {
  const normalizedHeader = header.map(text);
  if (
    normalizedHeader.length !== SALESFORCE_WORKBOOK_HEADER.length ||
    normalizedHeader.some((value, index) => value !== SALESFORCE_WORKBOOK_HEADER[index])
  ) {
    throw new Error("Salesforce Drive workbook header changed; import stopped.");
  }

  const fingerprint = createHash("sha256");
  fingerprint.update(JSON.stringify(normalizedHeader));
  const seenIds = new Set<string>();
  const territoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const unknownTerritories: Record<string, number> = {};
  const unknownStatuses: Record<string, number> = {};
  const aggregateMap = new Map<string, MutableAggregate>();
  let blankIdCount = 0;
  let duplicateIdCount = 0;
  let rowsRejected = 0;
  let unperiodizedRowCount = 0;
  let maxSourceModifiedAt: Date | null = null;

  const addAggregate = (dimensions: Omit<MutableAggregate, "recordCount" | "invoiceValueCount" | "invoicePreTaxAmountCents">, amountCents: bigint | null) => {
    const key = aggregateKey(dimensions);
    const current = aggregateMap.get(key) ?? {
      ...dimensions,
      recordCount: 0,
      invoiceValueCount: 0,
      invoicePreTaxAmountCents: BigInt(0),
    };
    current.recordCount += 1;
    if (amountCents !== null) {
      current.invoiceValueCount += 1;
      current.invoicePreTaxAmountCents += amountCents;
    }
    aggregateMap.set(key, current);
  };

  for (const sourceRow of rows) {
    const row = Array.from({ length: SALESFORCE_WORKBOOK_HEADER.length }, (_, index) => sourceRow[index] ?? "");
    fingerprint.update("\n");
    fingerprint.update(JSON.stringify(row));
    const id = text(row[0]);
    const statusLabel = text(row[1]) || "<blank>";
    const sourceTerritoryLabel = text(row[9]) || "<blank>";
    const speciesLabel = text(row[12]) || "<blank>";
    const cityLabel = text(row[6]) || "<blank>";
    addCount(statusCounts, statusLabel);
    addCount(territoryCounts, sourceTerritoryLabel);
    if (!KNOWN_SALESFORCE_WORKBOOK_STATUSES.has(statusLabel)) addCount(unknownStatuses, statusLabel);

    if (!id) {
      blankIdCount += 1;
      rowsRejected += 1;
      continue;
    }
    if (seenIds.has(id)) {
      duplicateIdCount += 1;
      rowsRejected += 1;
      continue;
    }
    seenIds.add(id);

    const sourceModifiedAt = parseSourceDate(row[3], "LastModifiedDate");
    if (!sourceModifiedAt) throw new Error("Blank LastModifiedDate; import stopped.");
    if (!maxSourceModifiedAt || sourceModifiedAt > maxSourceModifiedAt) maxSourceModifiedAt = sourceModifiedAt;

    const scheduledAt = parseSourceDate(row[2], "SchedStartTime");
    if (!scheduledAt) {
      unperiodizedRowCount += 1;
      rowsRejected += 1;
      continue;
    }

    if (sourceTerritoryLabel === "<blank>") {
      addCount(unknownTerritories, sourceTerritoryLabel);
      rowsRejected += 1;
      continue;
    }
    const mapping = findSalesforceWorkbookTerritory(sourceTerritoryLabel);
    if (!mapping) {
      throw new Error("Salesforce Drive workbook contains an unrecognized territory label; import stopped.");
    }
    if (mapping.status !== "ready" || !mapping.territoryId || !mapping.currencyCode) {
      addCount(unknownTerritories, sourceTerritoryLabel);
      rowsRejected += 1;
      continue;
    }

    const amountCents = parseAmountToCents(row[13]);
    const common = {
      territoryId: mapping.territoryId,
      sourceTerritoryLabel,
      periodYear: scheduledAt.getUTCFullYear(),
      periodMonth: scheduledAt.getUTCMonth() + 1,
      currencyCode: mapping.currencyCode,
    };
    addAggregate({ ...common, statusLabel: "__ALL__", speciesLabel: "__ALL__", cityLabel: "__ALL__" }, amountCents);
    addAggregate({ ...common, statusLabel, speciesLabel: "__ALL__", cityLabel: "__ALL__" }, amountCents);
    addAggregate({ ...common, statusLabel: "__ALL__", speciesLabel, cityLabel: "__ALL__" }, amountCents);
    addAggregate({ ...common, statusLabel: "__ALL__", speciesLabel: "__ALL__", cityLabel }, amountCents);
  }

  if (blankIdCount > 0 || duplicateIdCount > 0) {
    throw new Error("Salesforce Drive workbook contains blank or duplicate work-order IDs; import stopped.");
  }

  return {
    sourceRowCount: rows.length,
    rowsProcessed: rows.length - rowsRejected,
    rowsRejected,
    blankIdCount,
    duplicateIdCount,
    unperiodizedRowCount,
    sourceFingerprint: fingerprint.digest("hex"),
    maxSourceModifiedAt: maxSourceModifiedAt?.toISOString() ?? null,
    territoryCounts,
    statusCounts,
    unknownTerritories,
    unknownStatuses,
    aggregates: Array.from(aggregateMap.values()).map(row => ({
      territoryId: row.territoryId,
      sourceTerritoryLabel: row.sourceTerritoryLabel,
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
      statusLabel: row.statusLabel,
      speciesLabel: row.speciesLabel,
      cityLabel: row.cityLabel,
      currencyCode: row.currencyCode,
      recordCount: row.recordCount,
      invoiceValueCount: row.invoiceValueCount,
      invoicePreTaxAmount: centsToDecimal(row.invoicePreTaxAmountCents),
    })),
  };
}
