import { inArray } from "drizzle-orm";
import { ga4PropertyMetadata } from "../drizzle/schema";
import { GA4_TERRITORY_PROPERTIES, getGA4PropertiesForTerritory } from "../shared/ga4TerritoryProperties";
import { getDb } from "./db";
import { fetchGA4PropertyLifecycleMetadata } from "./googleAnalyticsClient";

export async function refreshGA4PropertyLifecycleMetadata() {
  const propertyIds = Array.from(new Set(GA4_TERRITORY_PROPERTIES.flatMap(mapping => mapping.propertyIds)));
  const result = await fetchGA4PropertyLifecycleMetadata(propertyIds);
  if (result.failedCount > 0 || result.rows.length !== propertyIds.length) {
    throw new Error("GA4 property metadata refresh was incomplete; no metadata changes were applied.");
  }
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const fetchedAt = new Date();
  await db.transaction(async tx => {
    await tx.delete(ga4PropertyMetadata);
    await tx.insert(ga4PropertyMetadata).values(result.rows.map(row => ({ ...row, fetchedAt })));
  });
  return { propertiesExpected: propertyIds.length, propertiesSynchronized: result.rows.length, fetchedAt };
}

export async function getGA4EligiblePropertyIdsForMonth(territoryId: string, year: number, month: number) {
  const propertyIds = getGA4PropertiesForTerritory(territoryId);
  if (propertyIds.length === 0) throw new Error(`No GA4 properties are mapped for ${territoryId}.`);
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const rows = await db.select().from(ga4PropertyMetadata)
    .where(inArray(ga4PropertyMetadata.propertyId, propertyIds));
  if (rows.length !== propertyIds.length) {
    throw new Error("GA4 property lifecycle metadata is incomplete; refresh it before importing historical months.");
  }
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const eligible = rows.filter(row => row.createdAt <= periodEnd && (!row.deletedAt || row.deletedAt >= periodStart));
  if (eligible.length === 0) {
    throw new Error(`No mapped GA4 properties existed during ${year}-${String(month).padStart(2, "0")}.`);
  }
  return eligible.map(row => row.propertyId);
}
