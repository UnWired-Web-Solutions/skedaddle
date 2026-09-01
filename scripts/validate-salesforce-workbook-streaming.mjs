import { performance } from "node:perf_hooks";

const { readSalesforceWorkbookIncrementally } = await import("../server/googleSalesforceWorkbookClient.ts");

try {
  const startedAt = performance.now();
  const parsed = await readSalesforceWorkbookIncrementally();
  console.log(JSON.stringify({
    ok: true,
    elapsedMs: Math.round(performance.now() - startedAt),
    sourceRowCount: parsed.sourceRowCount,
    rowsProcessed: parsed.rowsProcessed,
    rowsRejected: parsed.rowsRejected,
    unperiodizedRowCount: parsed.unperiodizedRowCount,
    aggregateRowCount: parsed.aggregates.length,
    sourceFingerprint: parsed.sourceFingerprint,
    maxSourceModifiedAt: parsed.maxSourceModifiedAt,
    unknownTerritories: parsed.unknownTerritories,
    unknownStatuses: parsed.unknownStatuses,
  }, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message.split("\n")[0] : "Streaming workbook validation failed.";
  console.error(JSON.stringify({ ok: false, message }, null, 2));
  process.exitCode = 1;
}
