/**
 * Salesforce Integration Router
 * Admin-only procedures for managing the Salesforce connection and querying data.
 */
import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import {
  getAuthorizationUrl,
  getConnectionStatus,
  testConnection,
  runQuery,
  describeObject,
  listObjects,
} from "./salesforceClient";

export const salesforceRouter = router({
  /**
   * Get the current Salesforce connection status.
   */
  status: adminProcedure.query(async () => {
    return getConnectionStatus();
  }),

  /**
   * Get the OAuth authorization URL to redirect the admin to Salesforce login.
   */
  getAuthUrl: adminProcedure.query(async () => {
    const url = getAuthorizationUrl();
    return { url };
  }),

  /**
   * Test the active Salesforce connection.
   */
  testConnection: adminProcedure.query(async () => {
    return testConnection();
  }),

  /**
   * Run a SOQL query against the connected Salesforce org.
   */
  query: adminProcedure
    .input(z.object({ soql: z.string().min(1).max(5000) }))
    .mutation(async ({ input }) => {
      return runQuery(input.soql);
    }),

  /**
   * Describe a Salesforce object (discover fields).
   */
  describeObject: adminProcedure
    .input(z.object({ objectName: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      return describeObject(input.objectName);
    }),

  /**
   * List all queryable Salesforce objects.
   */
  listObjects: adminProcedure.query(async () => {
    return listObjects();
  }),

  /**
   * Disconnect (revoke) the Salesforce connection.
   */
  disconnect: adminProcedure.mutation(async () => {
    const { drizzle } = await import("drizzle-orm/mysql2");
    const { eq } = await import("drizzle-orm");
    const { salesforceConnections } = await import("../drizzle/schema");

    const db = drizzle(process.env.DATABASE_URL!);
    await db
      .update(salesforceConnections)
      .set({ status: "revoked" })
      .where(eq(salesforceConnections.status, "active"));

    return { success: true };
  }),
});
