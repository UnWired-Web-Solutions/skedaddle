/** Refresh read-only GA4 property lifecycle metadata; no analytics event rows are retrieved. */
import { refreshGA4PropertyLifecycleMetadata } from "../server/googleAnalyticsPropertyMetadata";

try {
  const result = await refreshGA4PropertyLifecycleMetadata();
  console.log(JSON.stringify({
    status: "complete",
    propertiesExpected: result.propertiesExpected,
    propertiesSynchronized: result.propertiesSynchronized,
    fetchedAt: result.fetchedAt.toISOString(),
  }));
} catch {
  console.error("GA4 property metadata refresh did not complete; no metadata changes were applied.");
  process.exitCode = 1;
}

process.exit(process.exitCode ?? 0);
