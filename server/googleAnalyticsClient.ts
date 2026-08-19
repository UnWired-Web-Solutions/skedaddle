/**
 * googleAnalyticsClient.ts — GA4 Data API client using the same service account
 * as the Search Console integration (skedaddle-search-console-reader@uws-gbp-analytics.iam.gserviceaccount.com).
 *
 * PREREQUISITE: The service account must be granted at least Viewer access on the
 * Skedaddle Wildlife GA4 property (p394014501) before any data can be fetched.
 * As of Aug 19 2026, this access has NOT been granted — the property is visible
 * in the GA4 picker but returns "Missing permissions" for the UWS account.
 *
 * Once access is granted, this client will be used by the GA4 importer to pull:
 * - Sessions by page path (for territory-filtered reporting)
 * - Top converting pages
 * - Top cities by sessions
 * - Channel breakdown (organic, direct, referral, etc.)
 */

import { google, type analyticsdata_v1beta } from "googleapis";
import { ENV } from "./_core/env";

export const SKEDADDLE_GA4_PROPERTY_ID = "properties/394014501";
export const SKEDADDLE_GA4_ACCOUNT_ID = "39401450";

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
 * Requires the service account to have Viewer access on the GA4 property.
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
 * Verify that the service account can access the Skedaddle GA4 property.
 * Returns connection status with property metadata.
 */
export async function verifyGA4Access(): Promise<{
  connected: boolean;
  propertyId: string;
  error?: string;
}> {
  try {
    const client = getGA4Client();
    // Run a minimal report to verify access (1 row, 1 metric)
    await client.properties.runReport({
      property: SKEDADDLE_GA4_PROPERTY_ID,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
        limit: "1",
      },
    });

    return {
      connected: true,
      propertyId: SKEDADDLE_GA4_PROPERTY_ID,
    };
  } catch (error: any) {
    const message = error?.message || "Unknown error verifying GA4 access";
    return {
      connected: false,
      propertyId: SKEDADDLE_GA4_PROPERTY_ID,
      error: message.includes("403") || message.includes("permission")
        ? "Service account does not have Viewer access on the Skedaddle Wildlife GA4 property. Ask Dave/Nina/Ares to add the service account as a Viewer."
        : message,
    };
  }
}

/**
 * Fetch sessions by page path for a given date range.
 * This will be used to build territory-filtered GA4 reporting once access is granted.
 *
 * @param startDate - YYYY-MM-DD format
 * @param endDate - YYYY-MM-DD format
 * @param pathFilter - Optional URL path prefix to filter (e.g., "/location/minneapolis/")
 */
export async function fetchGA4SessionsByPage(
  startDate: string,
  endDate: string,
  pathFilter?: string,
): Promise<Array<{ pagePath: string; sessions: number; activeUsers: number }>> {
  const client = getGA4Client();

  const dimensionFilter: analyticsdata_v1beta.Schema$FilterExpression | undefined = pathFilter
    ? {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "BEGINS_WITH",
            value: pathFilter,
          },
        },
      }
    : undefined;

  const res = await client.properties.runReport({
    property: SKEDADDLE_GA4_PROPERTY_ID,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensionFilter,
      limit: "500",
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  });

  return (res.data.rows || []).map((row: RunReportRow) => ({
    pagePath: row.dimensionValues?.[0]?.value || "",
    sessions: parseInt(row.metricValues?.[0]?.value || "0", 10),
    activeUsers: parseInt(row.metricValues?.[1]?.value || "0", 10),
  }));
}

/**
 * Fetch top cities by sessions for a given date range.
 * Used for the "Top Cities" panel in the DashThis replacement.
 */
export async function fetchGA4TopCities(
  startDate: string,
  endDate: string,
  pathFilter?: string,
): Promise<Array<{ city: string; sessions: number; activeUsers: number }>> {
  const client = getGA4Client();

  const dimensionFilter: analyticsdata_v1beta.Schema$FilterExpression | undefined = pathFilter
    ? {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "BEGINS_WITH",
            value: pathFilter,
          },
        },
      }
    : undefined;

  const res = await client.properties.runReport({
    property: SKEDADDLE_GA4_PROPERTY_ID,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "city" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensionFilter,
      limit: "50",
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  });

  return (res.data.rows || []).map((row: RunReportRow) => ({
    city: row.dimensionValues?.[0]?.value || "(not set)",
    sessions: parseInt(row.metricValues?.[0]?.value || "0", 10),
    activeUsers: parseInt(row.metricValues?.[1]?.value || "0", 10),
  }));
}

/**
 * Fetch channel breakdown (session default channel group) for a given date range.
 * Used for the traffic sources breakdown in the DashThis replacement.
 */
export async function fetchGA4ChannelBreakdown(
  startDate: string,
  endDate: string,
  pathFilter?: string,
): Promise<Array<{ channel: string; sessions: number; activeUsers: number }>> {
  const client = getGA4Client();

  const dimensionFilter: analyticsdata_v1beta.Schema$FilterExpression | undefined = pathFilter
    ? {
        filter: {
          fieldName: "pagePath",
          stringFilter: {
            matchType: "BEGINS_WITH",
            value: pathFilter,
          },
        },
      }
    : undefined;

  const res = await client.properties.runReport({
    property: SKEDADDLE_GA4_PROPERTY_ID,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      dimensionFilter,
      limit: "20",
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    },
  });

  return (res.data.rows || []).map((row: RunReportRow) => ({
    channel: row.dimensionValues?.[0]?.value || "(not set)",
    sessions: parseInt(row.metricValues?.[0]?.value || "0", 10),
    activeUsers: parseInt(row.metricValues?.[1]?.value || "0", 10),
  }));
}
