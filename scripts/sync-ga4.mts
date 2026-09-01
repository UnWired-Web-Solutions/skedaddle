/**
 * Persist one completed GA4 calendar month for one territory or all 19.
 *
 * Examples:
 *   pnpm ingest:ga4 -- --territory hamilton --year 2026 --month 7
 *   pnpm ingest:ga4 -- --all --year 2026 --month 7
 *
 * When year/month are omitted, the most recently completed UTC month is used.
 */

import { importGA4TerritoryMonth } from "../server/googleAnalyticsImporter";
import { GA4_TERRITORY_PROPERTIES } from "../shared/ga4TerritoryProperties";

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const now = new Date();
const defaultMonth = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
const defaultYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
const year = Number(readArg("--year") ?? defaultYear);
const month = Number(readArg("--month") ?? defaultMonth);
const territoryId = readArg("--territory");
const allTerritories = process.argv.includes("--all");

if (Boolean(territoryId) === allTerritories) {
  throw new Error("Choose exactly one scope: --territory <id> or --all.");
}
if (!Number.isInteger(year) || year < 2020 || year > 2100) {
  throw new Error("--year must be a valid reporting year.");
}
if (!Number.isInteger(month) || month < 1 || month > 12) {
  throw new Error("--month must be between 1 and 12.");
}

const territories = allTerritories
  ? GA4_TERRITORY_PROPERTIES.map(mapping => mapping.territoryId)
  : [territoryId as string];
const failures: Array<{ territoryId: string; error: string }> = [];
const partialTerritories: string[] = [];
let retainedExistingCompleteSnapshots = 0;
for (const id of territories) {
  try {
    const result = await importGA4TerritoryMonth(id, year, month);
    console.log(JSON.stringify({
      territoryId: result.territoryId,
      period: result.period,
      pageCount: result.pageCount,
      coverage: {
        propertiesExpected: result.coverage.propertiesExpected,
        propertiesSucceeded: result.coverage.propertiesSucceeded,
        complete: result.coverage.complete,
      },
      snapshotApplied: result.snapshotApplied,
      retainedExistingCompleteSnapshot: result.retainedExistingCompleteSnapshot,
    }));
    if (!result.coverage.complete) partialTerritories.push(id);
    if (result.retainedExistingCompleteSnapshot) retainedExistingCompleteSnapshots += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ territoryId: id, error: message });
    console.error(`[GA4 import failed] ${id}: ${message}`);
  }
}

if (failures.length > 0) {
  throw new Error(`${failures.length}/${territories.length} GA4 territory imports failed.`);
}
if (partialTerritories.length > 0) {
  throw new Error(
    `${partialTerritories.length}/${territories.length} GA4 territory imports were partial: ${partialTerritories.join(", ")}.`,
  );
}
if (retainedExistingCompleteSnapshots > 0) {
  console.log(JSON.stringify({ retainedExistingCompleteSnapshots }));
}
process.exit(0);
