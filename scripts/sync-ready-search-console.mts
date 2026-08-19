import { GSC_TERRITORY_SCOPES } from "../shared/gscTerritoryPaths";
import { importSearchConsoleTerritoryMonth } from "../server/googleSearchConsoleImporter";

const now = new Date();
const completedMonth = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
const completedYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
const readyTerritories = GSC_TERRITORY_SCOPES.filter(scope => scope.status === "ready");

for (const scope of readyTerritories) {
  const result = await importSearchConsoleTerritoryMonth(scope.territoryId, completedYear, completedMonth);
  console.log(JSON.stringify(result));
}
