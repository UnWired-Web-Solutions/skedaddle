/**
 * Operator-run full import for initial reconciliation or controlled recovery.
 * The same deterministic reader, parser, lock, audit, and activation path is
 * used by the scheduled callback.
 *
 * Run with: node --import tsx scripts/import-salesforce-workbook.mjs
 */
const {
  ensureSalesforceWorkbookSource,
  executeSalesforceWorkbookImport,
} = await import("../server/salesforceWorkbookImportService.ts");

function safeError(error) {
  if (!error || typeof error !== "object") return { message: "Workbook import failed." };
  const value = error;
  const message = typeof value.message === "string" ? value.message.split("\n")[0] : "Workbook import failed.";
  const result = { name: value.name, message, code: value.code, errno: value.errno, sqlState: value.sqlState };
  if (value.cause && value.cause !== error) result.cause = safeError(value.cause);
  return result;
}

let result;
try {
  const source = await ensureSalesforceWorkbookSource();
  result = await executeSalesforceWorkbookImport({ source, triggerType: "manual" });
} catch (error) {
  console.error(JSON.stringify(safeError(error), null, 2));
  process.exitCode = 1;
  throw new Error("Workbook import failed; see redacted error summary above.");
}

const summary = "parsed" in result && result.parsed
  ? {
      ok: result.ok,
      status: "status" in result ? result.status : undefined,
      skipped: "skipped" in result ? result.skipped : undefined,
      runId: result.runId,
      sourceRowCount: result.parsed.sourceRowCount,
      rowsProcessed: result.parsed.rowsProcessed,
      rowsRejected: result.parsed.rowsRejected,
      blankIdCount: result.parsed.blankIdCount,
      duplicateIdCount: result.parsed.duplicateIdCount,
      unperiodizedRowCount: result.parsed.unperiodizedRowCount,
      sourceFingerprint: result.parsed.sourceFingerprint,
      maxSourceModifiedAt: result.parsed.maxSourceModifiedAt,
      aggregateRowCount: result.parsed.aggregates.length,
      unknownTerritories: result.parsed.unknownTerritories,
      unknownStatuses: result.parsed.unknownStatuses,
    }
  : result;

console.log(JSON.stringify(summary, null, 2));
process.exit(process.exitCode ?? 0);
