/**
 * ingest-analytics.mjs — Parse GA4 and GBP CSV exports from the Skedaddle Franchise Analysis
 * spreadsheet and insert into the analytics database tables.
 *
 * Usage: node scripts/ingest-analytics.mjs --ga4 ./page_breakdown.csv --gbp ./gbp_data.csv --replace
 */

import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const ga4Path = readArg("--ga4") || process.env.GA4_CSV_PATH;
const gbpPath = readArg("--gbp") || process.env.GBP_CSV_PATH;
const replaceExisting = process.argv.includes("--replace");
if (!ga4Path || !gbpPath) {
  console.error("Provide --ga4 and --gbp CSV paths (or GA4_CSV_PATH / GBP_CSV_PATH).");
  process.exit(1);
}
if (!replaceExisting) {
  console.error("Refusing to replace analytics tables without the explicit --replace flag.");
  process.exit(1);
}

// ─── Parse GA4 Page Breakdown CSV ────────────────────────────────────────────

function parseGA4CSV(filepath) {
  const raw = readFileSync(filepath, "utf-8");
  const records = parse(raw, { columns: false, skip_empty_lines: false, relax_column_count: true });

  const headers = records[0];
  // Headers: col0=' ', col1='2022', col2='2023', col3='Gain/Loss', col4='2024', col5='2025', col6='2026',
  // then monthly: col7='January\n2022', col8='January\n2023', col9='January\n2024', col10='January\n2025', col11='January\n2026', ...

  // Build month column mapping: { "January 2022": colIndex, ... }
  const monthCols = {};
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  for (let i = 7; i < headers.length; i++) {
    const h = headers[i].replace(/\n/g, " ").trim();
    if (h) monthCols[h] = i;
  }

  // Parse rows — structure is:
  // Territory row (total sessions for that territory)
  //   Species Pages
  //   Blog Pages (or Blog Page)
  //   /location/xxx (location page sessions)
  // Sometimes also: Service Pages, Other Pages

  const rows = [];
  let currentTerritory = null;
  const skipNames = new Set([
    "Overall Site Data", "Contact US", "Home Page Form", "Leads Combined",
    // Section headers and month labels that appear mid-spreadsheet
    "Month", "LOCATION 2022", "LOCATION 2023", "LOCATION 2024", "LOCATION 2025", "LOCATION 2026",
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December",
  ]);

  for (let r = 1; r < records.length; r++) {
    const row = records[r];
    const label = (row[0] || "").trim();
    if (!label) continue;
    if (skipNames.has(label)) {
      // Parse overall site data for "network" territory
      if (label === "Overall Site Data") {
        currentTerritory = "Network (All)";
        extractMonthlyData(rows, "Network (All)", "total", row, monthCols, monthNames);
      }
      continue;
    }

    if (label === "Species Pages") {
      if (currentTerritory) {
        extractMonthlyData(rows, currentTerritory, "species_pages", row, monthCols, monthNames);
      }
    } else if (label === "Blog Pages" || label === "Blog Page") {
      if (currentTerritory) {
        extractMonthlyData(rows, currentTerritory, "blog_pages", row, monthCols, monthNames);
      }
    } else if (label === "Service Pages") {
      if (currentTerritory) {
        extractMonthlyData(rows, currentTerritory, "service_pages", row, monthCols, monthNames);
      }
    } else if (label.startsWith("/location/")) {
      if (currentTerritory) {
        extractMonthlyData(rows, currentTerritory, "location_page", row, monthCols, monthNames);
      }
    } else if (label === "Other Pages") {
      // skip
    } else {
      // This is a territory name row — extract total sessions
      currentTerritory = label;
      extractMonthlyData(rows, currentTerritory, "total", row, monthCols, monthNames);
    }
  }

  return rows;
}

function extractMonthlyData(rows, territory, pageType, row, monthCols, monthNames) {
  for (const [key, colIdx] of Object.entries(monthCols)) {
    const parts = key.split(" ");
    if (parts.length !== 2) continue;
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const month = monthNames.indexOf(monthName) + 1;
    if (month === 0 || isNaN(year)) continue;

    const val = row[colIdx];
    const sessions = parseInt((val || "0").replace(/,/g, ""));
    if (isNaN(sessions) || sessions === 0) continue;

    rows.push({ territory, pageType, year, month, sessions });
  }
}

// ─── Parse GBP Data CSV ──────────────────────────────────────────────────────

function parseGBPCSV(filepath) {
  const raw = readFileSync(filepath, "utf-8");
  const records = parse(raw, { columns: false, skip_empty_lines: false, relax_column_count: true });

  const headers = records[0];
  // Headers: col0='', col1='Oct 2024', ..., col21='Jun 2026', col22='Business Pages'

  // Build month column mapping
  const monthCols = {};
  const shortMonths = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

  for (let i = 1; i < headers.length; i++) {
    const h = headers[i].trim();
    if (h === "Business Pages") continue;
    const parts = h.split(" ");
    if (parts.length === 2 && shortMonths[parts[0]] && parts[1].length === 4) {
      monthCols[h] = { colIdx: i, month: shortMonths[parts[0]], year: parseInt(parts[1]) };
    }
  }

  // Find Business Pages column
  const bizColIdx = headers.findIndex(h => h.trim() === "Business Pages");

  const rows = [];
  let currentTerritory = null;
  let currentBizUrl = null;
  const metricNames = new Set(["Calls", "Bookings", "Directions", "Website Clicks"]);

  for (let r = 1; r < records.length; r++) {
    const row = records[r];
    const label = (row[0] || "").trim();
    if (!label) continue;

    if (metricNames.has(label)) {
      if (!currentTerritory) continue;
      const metricType = label.toLowerCase().replace(" ", "_"); // 'calls', 'bookings', 'directions', 'website_clicks'

      for (const [, info] of Object.entries(monthCols)) {
        const val = row[info.colIdx];
        const value = parseInt((val || "0").replace(/,/g, "").replace(/-/g, "0"));
        if (isNaN(value) || value === 0) continue;

        rows.push({
          territory: currentTerritory,
          metricType,
          year: info.year,
          month: info.month,
          value,
          businessUrl: currentBizUrl,
        });
      }
    } else {
      // Territory name
      currentTerritory = label;
      currentBizUrl = bizColIdx >= 0 ? (row[bizColIdx] || "").trim() || null : null;

      // Also extract the "total" row (sum of all metrics) for this territory
      // The territory row itself has the total interactions
      for (const [, info] of Object.entries(monthCols)) {
        const val = row[info.colIdx];
        const value = parseInt((val || "0").replace(/,/g, "").replace(/-/g, "0"));
        if (isNaN(value) || value === 0) continue;

        rows.push({
          territory: currentTerritory,
          metricType: "total",
          year: info.year,
          month: info.month,
          value,
          businessUrl: currentBizUrl,
        });
      }
    }
  }

  return rows;
}

// ─── Insert into database ────────────────────────────────────────────────────

async function main() {
  console.log("Parsing GA4 CSV...");
  const ga4Rows = parseGA4CSV(ga4Path);
  console.log(`  → ${ga4Rows.length} GA4 session records`);

  console.log("Parsing GBP CSV...");
  const gbpRows = parseGBPCSV(gbpPath);
  console.log(`  → ${gbpRows.length} GBP metric records`);

  console.log("Connecting to database...");
  const conn = await mysql.createConnection(DATABASE_URL);

  await conn.beginTransaction();
  try {
    // Replacement is explicit and atomic: readers see either the old complete
    // import or the new complete import, never half-populated tables.
    console.log("Replacing existing analytics data in a transaction...");
    await conn.execute("DELETE FROM ga4_sessions");
    await conn.execute("DELETE FROM gbp_metrics");

  // Insert GA4 data in batches
  console.log("Inserting GA4 sessions...");
  const ga4BatchSize = 500;
  for (let i = 0; i < ga4Rows.length; i += ga4BatchSize) {
    const batch = ga4Rows.slice(i, i + ga4BatchSize);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap(r => [r.territory, r.pageType, r.year, r.month, r.sessions]);
    await conn.execute(
      `INSERT INTO ga4_sessions (territory, pageType, year, month, sessions) VALUES ${placeholders}`,
      values
    );
    process.stdout.write(`  ${Math.min(i + ga4BatchSize, ga4Rows.length)}/${ga4Rows.length}\r`);
  }
  console.log(`  ✓ Inserted ${ga4Rows.length} GA4 records`);

  // Insert GBP data in batches
  console.log("Inserting GBP metrics...");
  const gbpBatchSize = 500;
  for (let i = 0; i < gbpRows.length; i += gbpBatchSize) {
    const batch = gbpRows.slice(i, i + gbpBatchSize);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const values = batch.flatMap(r => [r.territory, r.metricType, r.year, r.month, r.value, r.businessUrl]);
    await conn.execute(
      `INSERT INTO gbp_metrics (territory, metricType, year, month, value, businessUrl) VALUES ${placeholders}`,
      values
    );
    process.stdout.write(`  ${Math.min(i + gbpBatchSize, gbpRows.length)}/${gbpRows.length}\r`);
  }
    console.log(`  ✓ Inserted ${gbpRows.length} GBP records`);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  }

  // Summary
  const [ga4Count] = await conn.execute("SELECT COUNT(*) as cnt FROM ga4_sessions");
  const [gbpCount] = await conn.execute("SELECT COUNT(*) as cnt FROM gbp_metrics");
  const [ga4Territories] = await conn.execute("SELECT DISTINCT territory FROM ga4_sessions ORDER BY territory");
  const [gbpTerritories] = await conn.execute("SELECT DISTINCT territory FROM gbp_metrics ORDER BY territory");

  console.log("\n═══ SUMMARY ═══");
  console.log(`GA4 Sessions: ${ga4Count[0].cnt} records, ${ga4Territories.length} territories`);
  console.log(`GBP Metrics: ${gbpCount[0].cnt} records, ${gbpTerritories.length} territories`);
  console.log("\nGA4 Territories:", ga4Territories.map(r => r.territory).join(", "));
  console.log("\nGBP Territories:", gbpTerritories.map(r => r.territory).join(", "));

  await conn.end();
  console.log("\nDone!");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
