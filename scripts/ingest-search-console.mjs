/**
 * Import one territory/month from the main Search Console domain property.
 *
 * Standard GSC CSV exports are supported:
 *   Pages:   Top pages, Clicks, Impressions, CTR, Position
 *   Queries: Top queries, Clicks, Impressions, CTR, Position
 *
 * Example:
 * node scripts/ingest-search-console.mjs \
 *   --pages ./Pages.csv --queries ./Queries.csv \
 *   --territory durham --year 2026 --month 7 \
 *   --property sc-domain:skedaddlewildlife.com \
 *   --path-prefix /location/durham-region/ --replace
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

const pagesPath = readArg("--pages");
const queriesPath = readArg("--queries");
const territoryId = readArg("--territory");
const year = Number(readArg("--year"));
const month = Number(readArg("--month"));
const sourceProperty = readArg("--property");
const rawPathPrefix = readArg("--path-prefix");
const replaceExisting = process.argv.includes("--replace");

if (!pagesPath || !queriesPath || !territoryId || !sourceProperty || !rawPathPrefix || !year || !month) {
  throw new Error("Provide --pages, --queries, --territory, --year, --month, --property, and --path-prefix.");
}
if (!/^sc-domain:/.test(sourceProperty)) {
  throw new Error("--property must be the main Search Console domain property (for example sc-domain:skedaddlewildlife.com).");
}
if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
  throw new Error("--year and --month must identify a valid reporting month.");
}
if (!replaceExisting) {
  throw new Error("Refusing to replace this territory/month without the explicit --replace flag.");
}

const pathPrefix = `/${rawPathPrefix.replace(/^\/+|\/+$/g, "")}/`;
const sourceDomain = sourceProperty.slice("sc-domain:".length).toLowerCase();

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function readCsv(filepath) {
  return parse(readFileSync(filepath, "utf-8"), {
    columns: headers => headers.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
  });
}

function numberValue(value) {
  const normalized = String(value ?? "0").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentageBps(value) {
  const normalized = String(value ?? "0").replace("%", "").trim();
  return Math.round(numberValue(normalized) * 100);
}

function positionHundredths(value) {
  return Math.round(numberValue(value) * 100);
}

function getFirst(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function parsePages() {
  return readCsv(pagesPath).map((row, index) => {
    const pageUrl = String(getFirst(row, ["top_pages", "page", "pages", "url"])).trim();
    if (!pageUrl) throw new Error(`Pages CSV row ${index + 2} has no page URL.`);
    const url = new URL(pageUrl);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== sourceDomain && !hostname.endsWith(`.${sourceDomain}`)) {
      throw new Error(`Pages CSV row ${index + 2} is outside ${sourceProperty}: ${pageUrl}`);
    }
    const normalizedPath = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    if (!normalizedPath.startsWith(pathPrefix)) {
      throw new Error(`Pages CSV row ${index + 2} is outside ${pathPrefix}: ${pageUrl}`);
    }
    return {
      pageUrl,
      clicks: Math.round(numberValue(row.clicks)),
      impressions: Math.round(numberValue(row.impressions)),
      ctrBps: percentageBps(row.ctr),
      positionHundredths: positionHundredths(row.position),
    };
  });
}

function parseQueries() {
  return readCsv(queriesPath).map((row, index) => {
    const query = String(getFirst(row, ["top_queries", "query", "queries"])).trim();
    if (!query) throw new Error(`Queries CSV row ${index + 2} has no query.`);
    return {
      query,
      clicks: Math.round(numberValue(row.clicks)),
      impressions: Math.round(numberValue(row.impressions)),
      ctrBps: percentageBps(row.ctr),
      positionHundredths: positionHundredths(row.position),
    };
  });
}

async function insertBatches(conn, table, valueColumn, rows) {
  for (let index = 0; index < rows.length; index += 500) {
    const batch = rows.slice(index, index + 500);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap(row => [
      territoryId, year, month, row[valueColumn], row.clicks, row.impressions,
      row.ctrBps, row.positionHundredths, sourceProperty, pathPrefix,
    ]);
    await conn.execute(
      `INSERT INTO ${table} (territoryId, year, month, ${valueColumn}, clicks, impressions, ctrBps, positionHundredths, sourceProperty, pathPrefix) VALUES ${placeholders}`,
      values,
    );
  }
}

async function main() {
  const pages = parsePages();
  const queries = parseQueries();
  const conn = await mysql.createConnection(DATABASE_URL);
  await conn.beginTransaction();
  try {
    const scope = [territoryId, year, month, sourceProperty];
    await conn.execute("DELETE FROM gsc_page_metrics WHERE territoryId = ? AND year = ? AND month = ? AND sourceProperty = ?", scope);
    await conn.execute("DELETE FROM gsc_query_metrics WHERE territoryId = ? AND year = ? AND month = ? AND sourceProperty = ?", scope);
    await insertBatches(conn, "gsc_page_metrics", "pageUrl", pages);
    await insertBatches(conn, "gsc_query_metrics", "query", queries);
    await conn.commit();
    console.log(`Imported ${pages.length} pages and ${queries.length} queries for ${territoryId}, ${year}-${String(month).padStart(2, "0")} (${pathPrefix}).`);
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
