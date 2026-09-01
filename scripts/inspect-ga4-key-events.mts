import { createHash } from "node:crypto";
import { getGA4AdminClient } from "../server/googleAnalyticsClient";
import { GA4_TERRITORY_PROPERTIES } from "../shared/ga4TerritoryProperties";

type KeyEvent = {
  eventName?: string | null;
  custom?: boolean | null;
  countingMethod?: string | null;
};

async function listKeyEvents(propertyId: string) {
  const client = getGA4AdminClient();
  const events: KeyEvent[] = [];
  let pageToken: string | undefined;
  do {
    const response = await client.properties.keyEvents.list({
      parent: `properties/${propertyId}`,
      pageSize: 200,
      pageToken,
    });
    events.push(...((response.data.keyEvents ?? []) as KeyEvent[]));
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);
  return events;
}

const territoryResults = [] as Array<{
  territoryId: string;
  propertiesExpected: number;
  propertiesSucceeded: number;
  propertiesFailed: number;
  propertiesWithKeyEvents: number;
  definitionsTotal: number;
  definitionSetsConsistent: boolean;
  countedOncePerEvent: number;
  countedOncePerSession: number;
  customDefinitions: number;
}>;

for (const territory of GA4_TERRITORY_PROPERTIES) {
  let succeeded = 0;
  let failed = 0;
  let propertiesWithKeyEvents = 0;
  let definitionsTotal = 0;
  let countedOncePerEvent = 0;
  let countedOncePerSession = 0;
  let customDefinitions = 0;
  const definitionSets = new Set<string>();

  for (const propertyId of territory.propertyIds) {
    try {
      const events = await listKeyEvents(propertyId);
      succeeded += 1;
      definitionsTotal += events.length;
      if (events.length > 0) propertiesWithKeyEvents += 1;
      for (const event of events) {
        if (event.countingMethod === "ONCE_PER_EVENT") countedOncePerEvent += 1;
        if (event.countingMethod === "ONCE_PER_SESSION") countedOncePerSession += 1;
        if (event.custom) customDefinitions += 1;
      }
      const signature = events
        .map(event => `${event.eventName ?? ""}|${event.countingMethod ?? ""}|${event.custom ? "custom" : "default"}`)
        .sort()
        .join("\n");
      definitionSets.add(createHash("sha256").update(signature).digest("hex"));
    } catch {
      failed += 1;
    }
  }

  territoryResults.push({
    territoryId: territory.territoryId,
    propertiesExpected: territory.propertyIds.length,
    propertiesSucceeded: succeeded,
    propertiesFailed: failed,
    propertiesWithKeyEvents,
    definitionsTotal,
    definitionSetsConsistent: failed === 0 && definitionSets.size === 1,
    countedOncePerEvent,
    countedOncePerSession,
    customDefinitions,
  });
}

console.log(JSON.stringify({
  territoriesExpected: GA4_TERRITORY_PROPERTIES.length,
  territoriesComplete: territoryResults.filter(row => row.propertiesFailed === 0).length,
  territoriesWithConsistentDefinitionSets: territoryResults.filter(row => row.definitionSetsConsistent).length,
  territories: territoryResults,
}));
