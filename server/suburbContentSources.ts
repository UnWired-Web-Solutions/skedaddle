import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  salesforceWorkbookAggregates,
  salesforceWorkbookImportRuns,
  salesforceWorkbookSources,
} from "../drizzle/schema";
import { getDb } from "./db";

export interface TerritorySpeciesContext {
  source: "salesforce_drive_workbook";
  activeRun: {
    id: number;
    status: "complete" | "partial";
    rowsRejected: number;
    activatedAt: Date | null;
    maxSourceModifiedAt: string | null;
  };
  species: Array<{ name: string }>;
}

/**
 * Returns only the active workbook's territory-level species ordering. This is
 * intentionally aggregate-only: no revenue, currency values, row-level data,
 * customer data, conversion inference, or suburb-level interpretation escapes
 * this helper.
 */
export async function getTerritorySpeciesContext(
  territoryId: string,
): Promise<TerritorySpeciesContext | null> {
  const db = await getDb();
  if (!db) return null;

  const sourceRows = await db
    .select()
    .from(salesforceWorkbookSources)
    .orderBy(desc(salesforceWorkbookSources.updatedAt))
    .limit(1);
  const source = sourceRows[0];
  if (!source?.lastSuccessfulRunId) return null;

  const runRows = await db
    .select()
    .from(salesforceWorkbookImportRuns)
    .where(eq(salesforceWorkbookImportRuns.id, source.lastSuccessfulRunId))
    .limit(1);
  const run = runRows[0];
  if (!run || (run.status !== "complete" && run.status !== "partial")) return null;

  const speciesRows = await db
    .select({
      name: salesforceWorkbookAggregates.speciesLabel,
      workOrderCount: sql<number>`SUM(${salesforceWorkbookAggregates.recordCount})`,
    })
    .from(salesforceWorkbookAggregates)
    .where(
      and(
        eq(salesforceWorkbookAggregates.importRunId, run.id),
        eq(salesforceWorkbookAggregates.territoryId, territoryId),
        eq(salesforceWorkbookAggregates.statusLabel, "__ALL__"),
        eq(salesforceWorkbookAggregates.cityLabel, "__ALL__"),
        ne(salesforceWorkbookAggregates.speciesLabel, "__ALL__"),
      ),
    )
    .groupBy(salesforceWorkbookAggregates.speciesLabel);

  const species = speciesRows
    .filter((row) => row.name.trim().length > 0 && Number(row.workOrderCount) > 0)
    .sort((a, b) => Number(b.workOrderCount) - Number(a.workOrderCount) || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((row) => ({ name: row.name }));

  if (!species.length) return null;

  return {
    source: "salesforce_drive_workbook",
    activeRun: {
      id: run.id,
      status: run.status,
      rowsRejected: run.rowsRejected,
      activatedAt: run.activatedAt,
      maxSourceModifiedAt: run.maxSourceModifiedAt,
    },
    species,
  };
}
