/**
 * Controlled GA4 historical backfill.
 *
 * Examples:
 *   pnpm backfill:ga4 -- --territory hamilton --from 2025-01 --to 2026-08
 *   pnpm backfill:ga4 -- --all --from 2025-01 --to 2026-08
 *
 * Runs sequentially to keep API load bounded. It emits only aggregate run
 * outcomes and never prints property IDs, page paths, credentials, or API rows.
 */
import { importGA4TerritoryMonth } from "../server/googleAnalyticsImporter";
import { GA4_TERRITORY_PROPERTIES } from "../shared/ga4TerritoryProperties";

type YearMonth = { year: number; month: number };

function readArg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseYearMonth(value: string | undefined, flag: string): YearMonth {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error(`${flag} must use YYYY-MM format.`);
  }
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function toIndex(period: YearMonth) {
  return period.year * 12 + period.month - 1;
}

function monthsInRange(from: YearMonth, to: YearMonth) {
  if (toIndex(from) > toIndex(to)) throw new Error("--from must be on or before --to.");
  const now = new Date();
  const currentMonthIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
  if (toIndex(to) >= currentMonthIndex) throw new Error("--to must be a completed UTC calendar month.");
  const months: YearMonth[] = [];
  for (let index = toIndex(from); index <= toIndex(to); index += 1) {
    months.push({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  }
  return months;
}

const territoryId = readArg("--territory");
const allTerritories = process.argv.includes("--all");
if (Boolean(territoryId) === allTerritories) {
  throw new Error("Choose exactly one scope: --territory <id> or --all.");
}

const from = parseYearMonth(readArg("--from"), "--from");
const to = parseYearMonth(readArg("--to"), "--to");
const territories = allTerritories
  ? GA4_TERRITORY_PROPERTIES.map(mapping => mapping.territoryId)
  : [territoryId as string];
const months = monthsInRange(from, to);
const summary = { attempted: 0, complete: 0, partial: 0, unavailable: 0, failed: 0, retainedCompleteSnapshot: 0 };

for (const period of months) {
  for (const id of territories) {
    summary.attempted += 1;
    try {
      const result = await importGA4TerritoryMonth(id, period.year, period.month);
      if (result.coverage.complete) summary.complete += 1;
      else summary.partial += 1;
      if (result.retainedExistingCompleteSnapshot) summary.retainedCompleteSnapshot += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("No mapped GA4 properties existed during")) summary.unavailable += 1;
      else summary.failed += 1;
    }
  }
}

console.log(JSON.stringify({ status: summary.failed === 0 ? "complete" : "completed_with_failures", from, to, territoryCount: territories.length, ...summary }));
process.exit(summary.failed === 0 ? 0 : 1);
