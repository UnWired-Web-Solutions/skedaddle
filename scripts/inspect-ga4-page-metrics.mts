import { getGA4Client } from "../server/googleAnalyticsClient";
import { getGA4PropertiesForTerritory } from "../shared/ga4TerritoryProperties";

const args = process.argv.slice(2);
const valueFor = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const territoryId = valueFor("--territory");
const year = Number.parseInt(valueFor("--year") ?? "", 10);
const month = Number.parseInt(valueFor("--month") ?? "", 10);

if (!territoryId || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
  console.error("Usage: pnpm exec tsx scripts/inspect-ga4-page-metrics.mts --territory <id> --year <YYYY> --month <1-12>");
  process.exit(2);
}

const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
const propertyIds = getGA4PropertiesForTerritory(territoryId);
const client = getGA4Client();
let succeeded = 0;
let failed = 0;

for (const propertyId of propertyIds) {
  try {
    await client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "userEngagementDuration" },
          { name: "keyEvents" },
        ],
        limit: "1",
      },
    });
    succeeded += 1;
  } catch {
    failed += 1;
  }
}

console.log(JSON.stringify({
  territoryId,
  period: `${year}-${String(month).padStart(2, "0")}`,
  metrics: ["sessions", "activeUsers", "engagedSessions", "engagementRate", "userEngagementDuration", "keyEvents"],
  propertiesExpected: propertyIds.length,
  propertiesSucceeded: succeeded,
  propertiesFailed: failed,
  complete: failed === 0,
}));

process.exit(failed === 0 ? 0 : 1);
