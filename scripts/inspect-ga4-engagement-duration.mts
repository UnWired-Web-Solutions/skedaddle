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
  console.error("Usage: pnpm exec tsx scripts/inspect-ga4-engagement-duration.mts --territory <id> --year <YYYY> --month <1-12>");
  process.exit(2);
}

const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
const client = getGA4Client();
let propertiesSucceeded = 0;
let propertiesFailed = 0;
let propertiesWithPositiveAggregateDuration = 0;
let propertiesWithPositivePageDuration = 0;

for (const propertyId of getGA4PropertiesForTerritory(territoryId)) {
  try {
    const [aggregate, pageSample] = await Promise.all([
      client.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: "userEngagementDuration" }, { name: "sessions" }],
          limit: "1",
        },
      }),
      client.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "userEngagementDuration" }, { name: "sessions" }],
          limit: "1",
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
      }),
    ]);
    const aggregateDuration = Number.parseFloat(aggregate.data.rows?.[0]?.metricValues?.[0]?.value ?? "0") || 0;
    const pageDuration = Number.parseFloat(pageSample.data.rows?.[0]?.metricValues?.[0]?.value ?? "0") || 0;
    propertiesSucceeded += 1;
    if (aggregateDuration > 0) propertiesWithPositiveAggregateDuration += 1;
    if (pageDuration > 0) propertiesWithPositivePageDuration += 1;
  } catch {
    propertiesFailed += 1;
  }
}

console.log(JSON.stringify({
  territoryId,
  period: `${year}-${String(month).padStart(2, "0")}`,
  propertiesExpected: getGA4PropertiesForTerritory(territoryId).length,
  propertiesSucceeded,
  propertiesFailed,
  propertiesWithPositiveAggregateDuration,
  propertiesWithPositivePageDuration,
  rawValuesPrinted: false,
}));

process.exit(propertiesFailed === 0 ? 0 : 1);
