/**
 * Salesforce API Client
 * Uses jsforce to manage OAuth2 connections and run SOQL queries.
 */
import jsforce from "jsforce";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { salesforceConnections } from "../drizzle/schema";

// ─── Environment ─────────────────────────────────────────────────────────────

function getSfEnv() {
  return {
    clientId: process.env.SF_CLIENT_ID ?? "",
    clientSecret: process.env.SF_CLIENT_SECRET ?? "",
    loginUrl: process.env.SF_LOGIN_URL ?? "https://login.salesforce.com",
    redirectUri: `${process.env.SF_REDIRECT_URI ?? ""}`,
  };
}

// ─── OAuth2 Helpers ──────────────────────────────────────────────────────────

/**
 * Build the jsforce OAuth2 instance used for authorization flows.
 */
export function getOAuth2() {
  const env = getSfEnv();
  return new jsforce.OAuth2({
    loginUrl: env.loginUrl,
    clientId: env.clientId,
    clientSecret: env.clientSecret,
    redirectUri: env.redirectUri,
  });
}

/**
 * Get the Salesforce authorization URL to redirect the user to.
 */
export function getAuthorizationUrl(): string {
  const oauth2 = getOAuth2();
  return oauth2.getAuthorizationUrl({ scope: "api id web refresh_token" });
}

/**
 * Exchange an authorization code for tokens and persist the connection.
 */
export async function handleOAuthCallback(code: string, userId?: number) {
  const oauth2 = getOAuth2();
  const conn = new jsforce.Connection({ oauth2 });

  const userInfo = await conn.authorize(code);

  // Persist to database
  const db = drizzle(process.env.DATABASE_URL!);

  // Check if we already have a connection for this org
  const existing = await db
    .select()
    .from(salesforceConnections)
    .where(eq(salesforceConnections.sfOrgId, userInfo.organizationId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing connection
    await db
      .update(salesforceConnections)
      .set({
        accessToken: conn.accessToken!,
        refreshToken: conn.refreshToken!,
        instanceUrl: conn.instanceUrl!,
        sfUserId: userInfo.id,
        status: "active",
      })
      .where(eq(salesforceConnections.id, existing[0].id));
  } else {
    // Create new connection
    await db.insert(salesforceConnections).values({
      label: "Skedaddle Salesforce",
      instanceUrl: conn.instanceUrl!,
      accessToken: conn.accessToken!,
      refreshToken: conn.refreshToken!,
      sfUserId: userInfo.id,
      sfOrgId: userInfo.organizationId,
      status: "active",
      createdByUserId: userId ?? null,
    });
  }

  return {
    instanceUrl: conn.instanceUrl,
    userId: userInfo.id,
    orgId: userInfo.organizationId,
  };
}

// ─── Connection Retrieval ────────────────────────────────────────────────────

/**
 * Get the active Salesforce connection from the database and return a live jsforce Connection.
 * Auto-refreshes the access token if expired.
 */
export async function getActiveConnection(): Promise<InstanceType<typeof jsforce.Connection> | null> {
  const db = drizzle(process.env.DATABASE_URL!);

  const rows = await db
    .select()
    .from(salesforceConnections)
    .where(eq(salesforceConnections.status, "active"))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  const oauth2 = getOAuth2();

  const conn = new jsforce.Connection({
    oauth2,
    instanceUrl: row.instanceUrl,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
  });

  // Listen for token refresh events and persist the new access token
  conn.on("refresh", async (newAccessToken: string) => {
    try {
      await db
        .update(salesforceConnections)
        .set({ accessToken: newAccessToken })
        .where(eq(salesforceConnections.id, row.id));
    } catch (err) {
      console.error("[Salesforce] Failed to persist refreshed token:", err);
    }
  });

  return conn;
}

/**
 * Get the connection status (for UI display).
 */
export async function getConnectionStatus() {
  const db = drizzle(process.env.DATABASE_URL!);

  const rows = await db
    .select({
      id: salesforceConnections.id,
      label: salesforceConnections.label,
      instanceUrl: salesforceConnections.instanceUrl,
      sfOrgId: salesforceConnections.sfOrgId,
      sfUserId: salesforceConnections.sfUserId,
      status: salesforceConnections.status,
      createdAt: salesforceConnections.createdAt,
      updatedAt: salesforceConnections.updatedAt,
    })
    .from(salesforceConnections)
    .limit(1);

  if (rows.length === 0) {
    return { connected: false as const };
  }

  return {
    connected: true as const,
    connection: rows[0],
  };
}

// ─── SOQL Query Helpers ──────────────────────────────────────────────────────

/**
 * Run a SOQL query against the connected Salesforce org.
 */
export async function runQuery(
  soql: string
): Promise<{ totalSize: number; records: Record<string, any>[] }> {
  const conn = await getActiveConnection();
  if (!conn) {
    throw new Error("No active Salesforce connection. Please connect first.");
  }

  const result = await conn.query(soql);
  return {
    totalSize: result.totalSize,
    records: result.records,
  };
}

/**
 * Describe a Salesforce object to discover its fields.
 */
export async function describeObject(objectName: string) {
  const conn = await getActiveConnection();
  if (!conn) {
    throw new Error("No active Salesforce connection. Please connect first.");
  }

  const desc = await conn.describe(objectName);
  return {
    name: desc.name,
    label: desc.label,
    fields: desc.fields.map((f: any) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      length: f.length,
      picklistValues: f.picklistValues?.map((v: any) => ({ label: v.label, value: v.value })),
    })),
  };
}

/**
 * List all Salesforce objects (for schema discovery).
 */
export async function listObjects() {
  const conn = await getActiveConnection();
  if (!conn) {
    throw new Error("No active Salesforce connection. Please connect first.");
  }

  const result = await conn.describeGlobal();
  return result.sobjects
    .filter((obj: any) => obj.queryable)
    .map((obj: any) => ({
      name: obj.name,
      label: obj.label,
      custom: obj.custom,
    }));
}

/**
 * Test the connection by running a simple query.
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const conn = await getActiveConnection();
    if (!conn) {
      return { success: false, message: "No active connection found" };
    }
    const result = await conn.query("SELECT Id FROM Organization LIMIT 1");
    return {
      success: true,
      message: `Connected to Salesforce org (${result.totalSize} org record found)`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, message };
  }
}
