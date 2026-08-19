import { importSearchConsoleTerritoryMonth } from "../server/googleSearchConsoleImporter";

const newlyVerifiedTerritories = [
  "durham",
  "ottawa",
  "milwaukee",
  "barrie-north",
  "orangeville",
  "okanagan",
];

for (let year = 2025, month = 1; year < 2026 || (year === 2026 && month <= 7); ) {
  for (const territoryId of newlyVerifiedTerritories) {
    const result = await importSearchConsoleTerritoryMonth(territoryId, year, month);
    console.log(JSON.stringify(result));
  }
  month += 1;
  if (month === 13) {
    month = 1;
    year += 1;
  }
}
