/**
 * googleAnalyticsClient.ts — GA4 Data API client using the same service account
 * as the Search Console integration (skedaddle-search-console-reade@uws-gbp-analytics.iam.gserviceaccount.com).
 *
 * CONNECTED: Aug 20 2026 — service account granted Administrator access at account level
 * via the Analytics Admin API (accounts/39401450/accessBindings).
 *
 * Skedaddle uses 129 separate GA4 properties (one per sub-location city),
 * all under account 39401450. This client aggregates data across all properties
 * belonging to a territory using the mapping in shared/ga4TerritoryProperties.ts.
 */

import { google, type analyticsdata_v1beta } from "googleapis";
import { ENV } from "./_core/env";
import { getGA4PropertiesForTerritory, GA4_TERRITORY_PROPERTIES, SKEDADDLE_GA4_CONTROL_PROPERTY } from "../shared/ga4TerritoryProperties";

type ServiceAccountCredential = {
  client_email: string;
  private_key: string;
  project_id: string;
  type: "service_account";
};

function getCredential(): ServiceAccountCredential {
  if (!ENV.gscServiceAccountJson) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_JSON is not configured. The same credential is used for GA4 Data API access.",
    );
  }

  let credential: ServiceAccountCredential;
  try {
    credential = JSON.parse(ENV.gscServiceAccountJson) as ServiceAccountCredential;
  } catch {
    throw new Error("GSC_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  if (
    credential.type !== "service_account" ||
    !credential.client_email ||
    !credential.private_key ||
    !credential.project_id
  ) {
    throw new Error("GSC_SERVICE_ACCOUNT_JSON is missing required service-account fields.");
  }

  return credential;
}

/**
 * Returns an authenticated GA4 Data API client (analyticsdata v1beta).
 */
export function getGA4Client() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredential(),
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  return google.analyticsdata({ version: "v1beta", auth });
}

type RunReportRow = analyticsdata_v1beta.Schema$Row;

/**
 * Verify that the service account can access the GA4 account.
 * Tests against the first available territory property.
 */
export async function verifyGA4Access(): Promise<{
  connected: boolean;
  accountId: string;
  territoriesAvailable: number;
  error?: string;
}> {
  try {
    const client = getGA4Client();
    // Test with the control property (main skedaddlewildlife.com)
    await client.properties.runReport({
      property: `properties/${SKEDADDLE_GA4_CONTROL_PROPERTY}`,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
        limit: "1",
      },
    });

    return {
      connected: true,
      accountId: "39401450",
      territoriesAvailable: GA4_TERRITORY_PROPERTIES.length,
    };
  } catch (error: any) {
    const message = error?.message || "Unknown error verifying GA4 access";
    return {
      connected: false,
      accountId: "39401450",
      territoriesAvailable: 0,
      error: message.includes("403") || message.includes("permission")
        ? "Service account does not have access to the Skedaddle Wildlife GA4 account."
        : message,
    };
  }
}

/**
 * Fetch total sessions and users for a territory by aggregating across all its GA4 properties.
 * This is the primary function for the DashThis replacement.
 */
export async function fetchGA4TerritorySessionsMonthly(
  territoryId: string,
  startDate: string,
  endDate: string,
): Promise<Array<{ yearMonth: string; sessions: number; activeUsers: number }>> {
  const propertyIds = getGA4PropertiesForTerritory(territoryId);
  if (propertyIds.length === 0) return [];

  const client = getGA4Client();
  const monthlyMap = new Map<string, { sessions: number; activeUsers: number }>();

  // Query each property and aggregate by month
  for (const propId of propertyIds) {
    try {
      const res = await client.properties.runReport({
        property: `properties/${propId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "yearMonth" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          limit: "100",
        },
      });

      for (const row of res.data.rows || []) {
        const ym = row.dimensionValues?.[0]?.value || "";
        const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
        const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
        const existing = monthlyMap.get(ym) || { sessions: 0, activeUsers: 0 };
        monthlyMap.set(ym, {
          sessions: existing.sessions + sessions,
          activeUsers: existing.activeUsers + users,
        });
      }
    } catch {
      // Skip properties that error (may be empty or misconfigured)
    }
  }

  return Array.from(monthlyMap.entries())
    .map(([yearMonth, data]) => ({ yearMonth, ...data }))
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

/**
 * Fetch top pages by sessions for a territory (aggregated across all its properties).
 */
export async function fetchGA4TerritoryTopPages(
  territoryId: string,
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<Array<{ pagePath: string; sessions: number; activeUsers: number }>> {
  const propertyIds = getGA4PropertiesForTerritory(territoryId);
  if (propertyIds.length === 0) return [];

  const client = getGA4Client();
  const pageMap = new Map<string, { sessions: number; activeUsers: number }>();

  for (const propId of propertyIds) {
    try {
      const res = await client.properties.runReport({
        property: `properties/${propId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          limit: "100",
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
      });

      for (const row of res.data.rows || []) {
        const path = row.dimensionValues?.[0]?.value || "";
        const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
        const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
        const existing = pageMap.get(path) || { sessions: 0, activeUsers: 0 };
        pageMap.set(path, {
          sessions: existing.sessions + sessions,
          activeUsers: existing.activeUsers + users,
        });
      }
    } catch {
      // Skip erroring properties
    }
  }

  return Array.from(pageMap.entries())
    .map(([pagePath, data]) => ({ pagePath, ...data }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}

/**
 * Fetch top cities by sessions for a territory (aggregated across all its properties).
 */
export async function fetchGA4TerritoryTopCities(
  territoryId: string,
  startDate: string,
  endDate: string,
  limit = 20,
): Promise<Array<{ city: string; sessions: number; activeUsers: number }>> {
  const propertyIds = getGA4PropertiesForTerritory(territoryId);
  if (propertyIds.length === 0) return [];

  const client = getGA4Client();
  const cityMap = new Map<string, { sessions: number; activeUsers: number }>();

  for (const propId of propertyIds) {
    try {
      const res = await client.properties.runReport({
        property: `properties/${propId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "city" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          limit: "50",
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
      });

      for (const row of res.data.rows || []) {
        const city = row.dimensionValues?.[0]?.value || "(not set)";
        const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
        const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
        const existing = cityMap.get(city) || { sessions: 0, activeUsers: 0 };
        cityMap.set(city, {
          sessions: existing.sessions + sessions,
          activeUsers: existing.activeUsers + users,
        });
      }
    } catch {
      // Skip erroring properties
    }
  }

  return Array.from(cityMap.entries())
    .map(([city, data]) => ({ city, ...data }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}

/**
 * Fetch channel breakdown for a territory (aggregated across all its properties).
 */
export async function fetchGA4TerritoryChannelBreakdown(
  territoryId: string,
  startDate: string,
  endDate: string,
): Promise<Array<{ channel: string; sessions: number; activeUsers: number }>> {
  const propertyIds = getGA4PropertiesForTerritory(territoryId);
  if (propertyIds.length === 0) return [];

  const client = getGA4Client();
  const channelMap = new Map<string, { sessions: number; activeUsers: number }>();

  for (const propId of propertyIds) {
    try {
      const res = await client.properties.runReport({
        property: `properties/${propId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          limit: "20",
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
      });

      for (const row of res.data.rows || []) {
        const channel = row.dimensionValues?.[0]?.value || "(not set)";
        const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
        const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
        const existing = channelMap.get(channel) || { sessions: 0, activeUsers: 0 };
        channelMap.set(channel, {
          sessions: existing.sessions + sessions,
          activeUsers: existing.activeUsers + users,
        });
      }
    } catch {
      // Skip erroring properties
    }
  }

  return Array.from(channelMap.entries())
    .map(([channel, data]) => ({ channel, ...data }))
    .sort((a, b) => b.sessions - a.sessions);
}

/**
 * List all territories that have GA4 properties mapped.
 */
export function getGA4ReadyTerritories(): string[] {
  return GA4_TERRITORY_PROPERTIES.map(t => t.territoryId);
}
