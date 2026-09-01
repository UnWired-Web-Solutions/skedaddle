import { createHash } from "node:crypto";
import { findSalesforceWorkbookTerritory } from "../shared/salesforceWorkbookMapping";

export const SALESFORCE_WORKBOOK_HEADER = [
  "Id", "Status", "SchedStartTime", "LastModifiedDate", "CreatedDate", "Street", "City", "PostalCode",
  "Work_Type__c", "Reporting_Primary_Territory__c", "Contact.Account.Lead_Source__c", "salesperson_new__c",
  "Species__c", "Invoice_pre_tax_amount__c",
] as const;

export const KNOWN_SALESFORCE_WORKBOOK_STATUSES = new Set([
  "Completed", "Compl.DoJobsche.duringPA", "Lost Quote", "Compl.DoJobsche.afterPA", "Quote Follow Up",
  "Lost Quote - no further action", "Cannot Complete", "Scheduled", "Dispatched", "None", "Canceled",
  "Unscheduled", "Do-Job Cancelled", "Archived Recall - Open", "In Progress",
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

type MutableAggregate = Omit<SalesforceWorkbookAggregateInput, "invoicePreTaxAmount"> & { invoicePreTaxAmountCents: bigint };
type AggregateDimensions = Omit<MutableAggregate, "recordCount" | "invoiceValueCount" | "invoicePreTaxAmountCents">;

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseSourceDate(value: unknown, label: string): Date | null {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${label}; import stopped.`);
  return parsed;
}

function parseAmountToCents(value: unknown): bigint | null {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.replace(/[$,\s]/g, "");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Invalid Invoice_pre_tax_amount__c; import stopped.");
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

function normalizedDimensionKey(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
}

function aggregateKey(row: AggregateDimensions) {
  return [
    normalizedDimensionKey(row.territoryId), normalizedDimensionKey(row.sourceTerritoryLabel), row.periodYear,
    row.periodMonth, normalizedDimensionKey(row.statusLabel), normalizedDimensionKey(row.speciesLabel),
    normalizedDimensionKey(row.cityLabel), row.currencyCode,
  ].join("|");
}

function centsToDecimal(cents: bigint): string {
  const negative = cents < BigInt(0);
  const absolute = negative ? -cents : cents;
  return `${negative ? "-" : ""}${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}

function addCount(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

/** Parses rows incrementally. It retains only aggregate counters and source IDs, never sensitive row values. */
export class SalesforceWorkbookRowAccumulator {
  private readonly fingerprint = createHash("sha256");
  private readonly seenIds = new Set<string>();
  private readonly territoryCounts: Record<string, number> = {};
  private readonly statusCounts: Record<string, number> = {};
  private readonly unknownTerritories: Record<string, number> = {};
  private readonly unknownStatuses: Record<string, number> = {};
  private readonly aggregateMap = new Map<string, MutableAggregate>();
  private started = false;
  private sourceRowCount = 0;
  private rowsRejected = 0;
  private blankIdCount = 0;
  private duplicateIdCount = 0;
  private unperiodizedRowCount = 0;
  private maxSourceModifiedAt: Date | null = null;

  begin(header: unknown[]) {
    if (this.started) throw new Error("Salesforce Drive workbook parser was already started.");
    const normalizedHeader = header.map(text);
    if (normalizedHeader.length !== SALESFORCE_WORKBOOK_HEADER.length || normalizedHeader.some((value, index) => value !== SALESFORCE_WORKBOOK_HEADER[index])) {
      throw new Error("Salesforce Drive workbook header changed; import stopped.");
    }
    this.fingerprint.update(JSON.stringify(normalizedHeader));
    this.started = true;
  }

  private addAggregate(dimensions: AggregateDimensions, amountCents: bigint | null) {
    const key = aggregateKey(dimensions);
    const current = this.aggregateMap.get(key) ?? { ...dimensions, recordCount: 0, invoiceValueCount: 0, invoicePreTaxAmountCents: BigInt(0) };
    current.recordCount += 1;
    if (amountCents !== null) {
      current.invoiceValueCount += 1;
      current.invoicePreTaxAmountCents += amountCents;
    }
    this.aggregateMap.set(key, current);
  }

  addRow(sourceRow: unknown[]) {
    if (!this.started) throw new Error("Salesforce Drive workbook parser must begin with a validated header.");
    const row = Array.from({ length: SALESFORCE_WORKBOOK_HEADER.length }, (_, index) => sourceRow[index] ?? "");
    this.sourceRowCount += 1;
    this.fingerprint.update("\n");
    this.fingerprint.update(JSON.stringify(row));
    const id = text(row[0]);
    const statusLabel = text(row[1]) || "<blank>";
    const sourceTerritoryLabel = text(row[9]) || "<blank>";
    const speciesLabel = text(row[12]) || "<blank>";
    const cityLabel = text(row[6]) || "<blank>";
    addCount(this.statusCounts, statusLabel);
    addCount(this.territoryCounts, sourceTerritoryLabel);
    if (!KNOWN_SALESFORCE_WORKBOOK_STATUSES.has(statusLabel)) addCount(this.unknownStatuses, statusLabel);

    if (!id) {
      this.blankIdCount += 1;
      this.rowsRejected += 1;
      return;
    }
    if (this.seenIds.has(id)) {
      this.duplicateIdCount += 1;
      this.rowsRejected += 1;
      return;
    }
    this.seenIds.add(id);
    const sourceModifiedAt = parseSourceDate(row[3], "LastModifiedDate");
    if (!sourceModifiedAt) throw new Error("Blank LastModifiedDate; import stopped.");
    if (!this.maxSourceModifiedAt || sourceModifiedAt > this.maxSourceModifiedAt) this.maxSourceModifiedAt = sourceModifiedAt;
    const scheduledAt = parseSourceDate(row[2], "SchedStartTime");
    if (!scheduledAt) {
      this.unperiodizedRowCount += 1;
      this.rowsRejected += 1;
      return;
    }
    if (sourceTerritoryLabel === "<blank>") {
      addCount(this.unknownTerritories, sourceTerritoryLabel);
      this.rowsRejected += 1;
      return;
    }
    const mapping = findSalesforceWorkbookTerritory(sourceTerritoryLabel);
    if (!mapping) throw new Error("Salesforce Drive workbook contains an unrecognized territory label; import stopped.");
    if (mapping.status !== "ready" || !mapping.territoryId || !mapping.currencyCode) {
      addCount(this.unknownTerritories, sourceTerritoryLabel);
      this.rowsRejected += 1;
      return;
    }
    const amountCents = parseAmountToCents(row[13]);
    const common = {
      territoryId: mapping.territoryId,
      sourceTerritoryLabel,
      periodYear: scheduledAt.getUTCFullYear(),
      periodMonth: scheduledAt.getUTCMonth() + 1,
      currencyCode: mapping.currencyCode,
    };
    this.addAggregate({ ...common, statusLabel: "__ALL__", speciesLabel: "__ALL__", cityLabel: "__ALL__" }, amountCents);
    this.addAggregate({ ...common, statusLabel, speciesLabel: "__ALL__", cityLabel: "__ALL__" }, amountCents);
    this.addAggregate({ ...common, statusLabel: "__ALL__", speciesLabel, cityLabel: "__ALL__" }, amountCents);
    this.addAggregate({ ...common, statusLabel: "__ALL__", speciesLabel: "__ALL__", cityLabel }, amountCents);
  }

  finish(): SalesforceWorkbookParseResult {
    if (!this.started) throw new Error("Salesforce Drive workbook parser must begin with a validated header.");
    if (this.blankIdCount > 0 || this.duplicateIdCount > 0) throw new Error("Salesforce Drive workbook contains blank or duplicate work-order IDs; import stopped.");
    return {
      sourceRowCount: this.sourceRowCount,
      rowsProcessed: this.sourceRowCount - this.rowsRejected,
      rowsRejected: this.rowsRejected,
      blankIdCount: this.blankIdCount,
      duplicateIdCount: this.duplicateIdCount,
      unperiodizedRowCount: this.unperiodizedRowCount,
      sourceFingerprint: this.fingerprint.digest("hex"),
      maxSourceModifiedAt: this.maxSourceModifiedAt?.toISOString() ?? null,
      territoryCounts: this.territoryCounts,
      statusCounts: this.statusCounts,
      unknownTerritories: this.unknownTerritories,
      unknownStatuses: this.unknownStatuses,
      aggregates: Array.from(this.aggregateMap.values()).map(row => ({
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
}

export function parseSalesforceWorkbookRows(header: unknown[], rows: unknown[][]): SalesforceWorkbookParseResult {
  const accumulator = new SalesforceWorkbookRowAccumulator();
  accumulator.begin(header);
  for (const row of rows) accumulator.addRow(row);
  return accumulator.finish();
}
