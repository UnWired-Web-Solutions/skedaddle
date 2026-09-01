/**
 * Full, read-only validation of the approved Salesforce Data workbook.
 * Run with: node --import tsx scripts/validate-salesforce-workbook.mjs
 */
const { readSalesforceWorkbook } = await import("../server/googleSalesforceWorkbookClient.ts");
const { parseSalesforceWorkbookRows } = await import("../server/salesforceWorkbookParser.ts");
const { findSalesforceWorkbookTerritory } = await import("../shared/salesforceWorkbookMapping.ts");

const workbook = await readSalesforceWorkbook();
const sourceTerritoryLabels = Array.from(new Set(workbook.rows.map(row => String(row[9] ?? "").trim()))).sort();
const unrecognizedTerritoryLabels = sourceTerritoryLabels.filter(label => !findSalesforceWorkbookTerritory(label));
if (unrecognizedTerritoryLabels.length) {
  console.error(JSON.stringify({ unrecognizedTerritoryLabels }, null, 2));
}
const parsed = parseSalesforceWorkbookRows(workbook.header, workbook.rows);
const maxAggregateLengths = parsed.aggregates.reduce((maxima, row) => ({
  sourceTerritoryLabel: Math.max(maxima.sourceTerritoryLabel, row.sourceTerritoryLabel.length),
  statusLabel: Math.max(maxima.statusLabel, row.statusLabel.length),
  speciesLabel: Math.max(maxima.speciesLabel, row.speciesLabel.length),
  cityLabel: Math.max(maxima.cityLabel, row.cityLabel.length),
}), { sourceTerritoryLabel: 0, statusLabel: 0, speciesLabel: 0, cityLabel: 0 });

console.log(JSON.stringify({
  title: workbook.title,
  sheetName: workbook.sheetName,
  configuredRowCount: workbook.configuredRowCount,
  sourceRowCount: parsed.sourceRowCount,
  rowsProcessed: parsed.rowsProcessed,
  rowsRejected: parsed.rowsRejected,
  blankIdCount: parsed.blankIdCount,
  duplicateIdCount: parsed.duplicateIdCount,
  unperiodizedRowCount: parsed.unperiodizedRowCount,
  sourceFingerprint: parsed.sourceFingerprint,
  maxSourceModifiedAt: parsed.maxSourceModifiedAt,
  aggregateRowCount: parsed.aggregates.length,
  maxAggregateLengths,
  territoryCounts: parsed.territoryCounts,
  statusCounts: parsed.statusCounts,
  unknownTerritories: parsed.unknownTerritories,
  unknownStatuses: parsed.unknownStatuses,
}, null, 2));
