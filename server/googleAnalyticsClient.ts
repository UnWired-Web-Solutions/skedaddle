/**
 * googleAnalyticsClient.ts — GA4 Data API client using the same service account
 * as the Search Console integration (skedaddle-search-console-reade@uws-gbp-analytics.iam.gserviceaccount.com).
 *
 * CONNECTED: Aug 20 2026 — service account granted Administrator access at account level
 * via the Analytics Admin API (accounts/39401450/accessBindings).
 *
 * The account contains 129 properties. Only properties explicitly assigned to
 * one of the 19 portal territories are aggregated here.
 */

import { google } from "googleapis";
import pLimit from "p-limit";
import { ENV } from "./_core/env";
import { classifyGA4PagePath, normalizeGA4PagePath, type GA4PageType } from "../shared/ga4PageClassifier";
import {
  getGA4MappingSummary,
  getGA4PropertiesForTerritory,
  GA4_TERRITORY_PROPERTIES,
  SKEDADDLE_GA4_CONTROL_PROPERTY,
} from "../shared/ga4TerritoryProperties";

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

export type GA4Coverage = {
  propertiesExpected: number;
  propertiesSucceeded: number;
  failedProperties: Array<{ propertyId: string; error: string }>;
  complete: boolean;
};

export type GA4CoveredResult<T> = {
  rows: T[];
  coverage: GA4Coverage;
};

const GA4_PROPERTY_CONCURRENCY = 4;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runAcrossTerritoryProperties<T>(
  territoryId: string,
  request: (propertyId: string) => Promise<T>,
): Promise<{ results: Array<{ propertyId: string; value: T }>; coverage: GA4Coverage }> {
  const propertyIds = getGA4PropertiesForTerritory(territoryId);
  if (propertyIds.length === 0) {
    throw new Error(`No GA4 properties are mapped for territory: ${territoryId}`);
  }
  const limit = pLimit(GA4_PROPERTY_CONCURRENCY);
  const settled = await Promise.all(propertyIds.map(propertyId => limit(async () => {
    try {
      return { propertyId, value: await request(propertyId), error: null };
    } catch (error) {
      return { propertyId, value: null, error: errorMessage(error) };
    }
  })));
  const failedProperties = settled
    .filter((item) => item.error !== null)
    .map(item => ({ propertyId: item.propertyId, error: item.error! }));
  const results = settled
    .filter((item) => item.value !== null)
    .map(({ propertyId, value }) => ({ propertyId, value: value! }));
  return {
    results,
    coverage: {
      propertiesExpected: propertyIds.length,
      propertiesSucceeded: results.length,
      failedProperties,
      complete: failedProperties.length === 0,
    },
  };
}

/**
 * Verify that the service account can access the GA4 account.
 * Tests against the first available territory property.
 */
export async function verifyGA4Access(): Promise<{
  connected: boolean;
  accountId: string;
  territoriesAvailable: number;
  mapping?: ReturnType<typeof getGA4MappingSummary>;
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

    const mapping = getGA4MappingSummary();
    return {
      connected: true,
      accountId: "39401450",
      territoriesAvailable: mapping.territoryCount,
      mapping,
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
): Promise<GA4CoveredResult<{ yearMonth: string; sessions: number; activeUsers: number }>> {
  const client = getGA4Client();
  const monthlyMap = new Map<string, { sessions: number; activeUsers: number }>();
  const { results, coverage } = await runAcrossTerritoryProperties(territoryId, async propertyId => {
    const res = await client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "yearMonth" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        limit: "100",
      },
    });
    return res.data.rows || [];
  });
  for (const { value: rows } of results) {
    for (const row of rows) {
      const ym = row.dimensionValues?.[0]?.value || "";
      const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
      const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
      const existing = monthlyMap.get(ym) || { sessions: 0, activeUsers: 0 };
      monthlyMap.set(ym, {
        sessions: existing.sessions + sessions,
        activeUsers: existing.activeUsers + users,
      });
    }
  }

  const rows = Array.from(monthlyMap.entries())
    .map(([yearMonth, data]) => ({ yearMonth, ...data }))
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  return { rows, coverage };
}

/**
 * Fetch top pages by sessions for a territory (aggregated across all its properties).
 */
export async function fetchGA4TerritoryTopPages(
  territoryId: string,
  startDate: string,
  endDate: string,
  limit = 25,
): Promise<GA4CoveredResult<{ pagePath: string; sessions: number; activeUsers: number }>> {
  const client = getGA4Client();
  const pageMap = new Map<string, { sessions: number; activeUsers: number }>();
  const { results, coverage } = await runAcrossTerritoryProperties(territoryId, async propertyId => {
    const res = await client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        limit: "100000",
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      },
    });
    return res.data.rows || [];
  });
  for (const { value: rows } of results) {
    for (const row of rows) {
      const path = normalizeGA4PagePath(row.dimensionValues?.[0]?.value || "/");
      const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
      const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
      const existing = pageMap.get(path) || { sessions: 0, activeUsers: 0 };
      pageMap.set(path, {
        sessions: existing.sessions + sessions,
        activeUsers: existing.activeUsers + users,
      });
    }
  }

  const rows = Array.from(pageMap.entries())
    .map(([pagePath, data]) => ({ pagePath, ...data }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
  return { rows, coverage };
}

/**
 * Fetch top cities by sessions for a territory (aggregated across all its properties).
 */
export async function fetchGA4TerritoryTopCities(
  territoryId: string,
  startDate: string,
  endDate: string,
  limit = 20,
): Promise<GA4CoveredResult<{ city: string; sessions: number; activeUsers: number }>> {
  const client = getGA4Client();
  const cityMap = new Map<string, { sessions: number; activeUsers: number }>();
  const { results, coverage } = await runAcrossTerritoryProperties(territoryId, async propertyId => {
    const res = await client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        limit: "10000",
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      },
    });
    return res.data.rows || [];
  });
  for (const { value: rows } of results) {
    for (const row of rows) {
      const city = row.dimensionValues?.[0]?.value || "(not set)";
      const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
      const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
      const existing = cityMap.get(city) || { sessions: 0, activeUsers: 0 };
      cityMap.set(city, {
        sessions: existing.sessions + sessions,
        activeUsers: existing.activeUsers + users,
      });
    }
  }

  const rows = Array.from(cityMap.entries())
    .map(([city, data]) => ({ city, ...data }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
  return { rows, coverage };
}

/**
 * Fetch channel breakdown for a territory (aggregated across all its properties).
 */
export async function fetchGA4TerritoryChannelBreakdown(
  territoryId: string,
  startDate: string,
  endDate: string,
): Promise<GA4CoveredResult<{ channel: string; sessions: number; activeUsers: number }>> {
  const client = getGA4Client();
  const channelMap = new Map<string, { sessions: number; activeUsers: number }>();
  const { results, coverage } = await runAcrossTerritoryProperties(territoryId, async propertyId => {
    const res = await client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        limit: "100",
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      },
    });
    return res.data.rows || [];
  });
  for (const { value: rows } of results) {
    for (const row of rows) {
      const channel = row.dimensionValues?.[0]?.value || "(not set)";
      const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
      const users = parseInt(row.metricValues?.[1]?.value || "0", 10);
      const existing = channelMap.get(channel) || { sessions: 0, activeUsers: 0 };
      channelMap.set(channel, {
        sessions: existing.sessions + sessions,
        activeUsers: existing.activeUsers + users,
      });
    }
  }

  const rows = Array.from(channelMap.entries())
    .map(([channel, data]) => ({ channel, ...data }))
    .sort((a, b) => b.sessions - a.sessions);
  return { rows, coverage };
}

export type GA4TerritoryMonthPage = {
  pagePath: string;
  pageType: GA4PageType;
  sessions: number;
  activeUsers: number;
};

export type GA4TerritoryMonthSnapshot = {
  territoryId: string;
  year: number;
  month: number;
  sessions: number;
  activeUsers: number;
  priorityPageSessions: number;
  pages: GA4TerritoryMonthPage[];
  coverage: GA4Coverage;
};

/** Fetch one complete calendar month for durable import and reporting. */
export async function fetchGA4TerritoryMonthSnapshot(
  territoryId: string,
  year: number,
  month: number,
): Promise<GA4TerritoryMonthSnapshot> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const client = getGA4Client();
  const { results, coverage } = await runAcrossTerritoryProperties(territoryId, async propertyId => {
    const [totals, pages] = await Promise.all([
      client.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          limit: "1",
        },
      }),
      client.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          limit: "100000",
        },
      }),
    ]);
    return { totals: totals.data.rows || [], pages: pages.data.rows || [] };
  });

  if (coverage.propertiesSucceeded === 0) {
    throw new Error(`Every mapped GA4 property failed for ${territoryId} ${year}-${String(month).padStart(2, "0")}.`);
  }

  let sessions = 0;
  let activeUsers = 0;
  const pageMap = new Map<string, { sessions: number; activeUsers: number }>();
  for (const { value } of results) {
    const total = value.totals[0];
    sessions += Number.parseInt(total?.metricValues?.[0]?.value || "0", 10);
    activeUsers += Number.parseInt(total?.metricValues?.[1]?.value || "0", 10);
    for (const row of value.pages) {
      const pagePath = normalizeGA4PagePath(row.dimensionValues?.[0]?.value || "/");
      const existing = pageMap.get(pagePath) || { sessions: 0, activeUsers: 0 };
      pageMap.set(pagePath, {
        sessions: existing.sessions + Number.parseInt(row.metricValues?.[0]?.value || "0", 10),
        activeUsers: existing.activeUsers + Number.parseInt(row.metricValues?.[1]?.value || "0", 10),
      });
    }
  }
  const pages = Array.from(pageMap.entries())
    .map(([pagePath, metrics]) => ({ pagePath, pageType: classifyGA4PagePath(pagePath), ...metrics }))
    .sort((a, b) => b.sessions - a.sessions);
  const priorityPageSessions = pages
    .filter(page => page.pageType === "species_pages" || page.pageType === "location_page")
    .reduce((sum, page) => sum + page.sessions, 0);

  return { territoryId, year, month, sessions, activeUsers, priorityPageSessions, pages, coverage };
}

/**
 * List all territories that have GA4 properties mapped.
 */
export function getGA4ReadyTerritories(): string[] {
  return GA4_TERRITORY_PROPERTIES.map(t => t.territoryId);
}
