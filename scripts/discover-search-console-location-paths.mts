import { writeFile } from "node:fs/promises";
import { getSearchConsoleClient, SKEDADDLE_SEARCH_CONSOLE_PROPERTY } from "../server/googleSearchConsoleClient";

const client = getSearchConsoleClient();
const response = await client.searchanalytics.query({
  siteUrl: SKEDADDLE_SEARCH_CONSOLE_PROPERTY,
  requestBody: {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    dimensions: ["page"],
    rowLimit: 25_000,
  },
});

const locationPaths = (response.data.rows ?? [])
  .map(row => row.keys?.[0] ?? "")
  .filter(page => page.includes("/location/"))
  .map(page => new URL(page).pathname)
  .filter((path, index, paths) => paths.indexOf(path) === index)
  .sort();

await writeFile(
  "/home/ubuntu/gsc-live-location-paths-2026-07.json",
  `${JSON.stringify(locationPaths, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({ count: locationPaths.length, output: "/home/ubuntu/gsc-live-location-paths-2026-07.json" }));
