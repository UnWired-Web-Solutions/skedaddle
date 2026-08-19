import { GSC_TERRITORY_SCOPES } from "../shared/gscTerritoryPaths";
import { importSearchConsoleTerritoryMonth } from "../server/googleSearchConsoleImporter";

const START_YEAR = 2025;
const START_MONTH = 1;
const END_YEAR = 2026;
const END_MONTH = 7;

const readyTerritories = GSC_TERRITORY_SCOPES.filter(scope => scope.status === "ready");

function periodsBetween() {
  const periods: Array<{ year: number; month: number }> = [];
  let year = START_YEAR;
  let month = START_MONTH;
  while (year < END_YEAR || (year === END_YEAR && month <= END_MONTH)) {
    periods.push({ year, month });
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return periods;
}

for (const period of periodsBetween()) {
  for (const scope of readyTerritories) {
    const result = await importSearchConsoleTerritoryMonth(scope.territoryId, period.year, period.month);
    console.log(JSON.stringify(result));
  }
}
