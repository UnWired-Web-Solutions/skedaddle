/**
 * Import verified Salesforce inspections and closed jobs for one T12 snapshot.
 * CSV columns: species, inspections, closed_jobs. Include an __ALL__ total row.
 */

import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const csvPath = readArg("--csv");
const territoryId = readArg("--territory");
const periodStart = readArg("--period-start");
const periodEnd = readArg("--period-end");
const sourceLabel = readArg("--source-label") || "Salesforce verified export";
const replaceExisting = process.argv.includes("--replace");

if (!csvPath || !territoryId || !periodStart || !periodEnd) {
  throw new Error("Provide --csv, --territory, --period-start, and --period-end.");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
  throw new Error("Periods must use YYYY-MM-DD.");
}
if (!replaceExisting) throw new Error("Refusing to replace this snapshot without --replace.");

const rows = parse(readFileSync(csvPath, "utf-8"), {
  columns: header => header.map(value => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")),
  skip_empty_lines: true,
  trim: true,
}).map((row, index) => {
  const species = String(row.species || "").trim();
  const inspections = Number(String(row.inspections || "0").replace(/,/g, ""));
  const closedJobs = Number(String(row.closed_jobs || "0").replace(/,/g, ""));
  if (!species || !Number.isInteger(inspections) || !Number.isInteger(closedJobs) || inspections < 0 || closedJobs < 0 || closedJobs > inspections) {
    throw new Error(`Invalid performance data on CSV row ${index + 2}.`);
  }
  return { species, inspections, closedJobs };
});

if (!rows.some(row => row.species === "__ALL__")) {
  throw new Error("CSV must include an __ALL__ row so the territory close rate is auditable.");
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  await conn.beginTransaction();
  try {
    await conn.execute(
      "DELETE FROM salesforce_performance_snapshots WHERE territoryId = ? AND periodStart = ? AND periodEnd = ?",
      [territoryId, periodStart, periodEnd],
    );
    const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values = rows.flatMap(row => [territoryId, row.species, periodStart, periodEnd, row.inspections, row.closedJobs, sourceLabel]);
    await conn.execute(
      `INSERT INTO salesforce_performance_snapshots (territoryId, species, periodStart, periodEnd, inspections, closedJobs, sourceLabel) VALUES ${placeholders}`,
      values,
    );
    await conn.commit();
    console.log(`Imported ${rows.length} Salesforce performance rows for ${territoryId} (${periodStart} to ${periodEnd}).`);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
