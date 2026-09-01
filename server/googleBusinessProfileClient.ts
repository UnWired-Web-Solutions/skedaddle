/**
 * Google Business Profile API client. It is intentionally fail-closed until
 * Google approves the Performance API project quota and UWS supplies a
 * `business.manage` offline-refresh authorization through project secrets.
 */

import { google } from "googleapis";
import { ENV } from "./_core/env";
import { isISODate } from "../shared/gbpDataSafety";

export const GBP_OAUTH_SCOPE = "https://www.googleapis.com/auth/business.manage";
const ACCOUNT_MANAGEMENT_BASE_URL = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFORMATION_BASE_URL = "https://mybusinessbusinessinformation.googleapis.com/v1";
const PERFORMANCE_BASE_URL = "https://businessprofileperformance.googleapis.com/v1";

export type GBPAccount = { name: string; accountName?: string; type?: string; role?: string };
export type GBPLiveLocation = {
  name: string;
  title: string;
  storeCode?: string;
  websiteUri?: string;
  storefrontAddress?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  openInfo?: Record<string, unknown>;
};
export type GBPPerformanceValue = { date: string; value: number };

export function hasGBPAuthConfiguration(): boolean {
  return Boolean(ENV.gbpOAuthClientId && ENV.gbpOAuthClientSecret && ENV.gbpOAuthRefreshToken);
}

/** True when the OAuth client pair is present, even before a user refresh token is obtained. */
export function hasGBPOAuthClientConfiguration(): boolean {
  return Boolean(ENV.gbpOAuthClientId && ENV.gbpOAuthClientSecret);
}

/**
 * Confirms Google accepts the configured client pair. The deliberately invalid
 * refresh-token grant cannot retrieve user data; a Google `invalid_grant`
 * response proves the client ID/secret were accepted rather than rejected as
 * `invalid_client`.
 */
export async function validateGBPOAuthClientCredentials(): Promise<{ accepted: true }> {
  if (!hasGBPOAuthClientConfiguration()) {
    throw new Error("GBP OAuth client credentials are not configured.");
  }
  const body = new URLSearchParams({
    client_id: ENV.gbpOAuthClientId,
    client_secret: ENV.gbpOAuthClientSecret,
    grant_type: "refresh_token",
    refresh_token: "gbp-client-credential-validation-no-token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (payload.error === "invalid_grant") return { accepted: true };
  if (payload.error === "invalid_client" || response.status === 401) {
    throw new Error("Google rejected the configured GBP OAuth client credentials.");
  }
  throw new Error(`Unexpected Google OAuth credential validation response (${response.status}).`);
}

export function getGBPOAuthClient() {
  if (!hasGBPAuthConfiguration()) {
    throw new Error("GBP OAuth is not configured. Add GBP_OAUTH_CLIENT_ID, GBP_OAUTH_CLIENT_SECRET, and GBP_OAUTH_REFRESH_TOKEN through project secrets before attempting a live import.");
  }
  const client = new google.auth.OAuth2(
    ENV.gbpOAuthClientId,
    ENV.gbpOAuthClientSecret,
    ENV.gbpOAuthRedirectUri,
  );
  client.setCredentials({ refresh_token: ENV.gbpOAuthRefreshToken });
  return client;
}

async function getAccessToken(): Promise<string> {
  const response = await getGBPOAuthClient().getAccessToken();
  if (!response.token) {
    throw new Error("Google did not return a GBP access token. Check the stored OAuth authorization and scope.");
  }
  return response.token;
}

function encodePath(path: string): string {
  return path.split("/").map(segment => encodeURIComponent(segment)).join("/");
}

async function requestGBP<T>(baseUrl: string, path: string, query?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${baseUrl}/${encodePath(path)}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const accessToken = await getAccessToken();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GBP API request failed (${response.status}): ${detail || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function listGBPAccounts(): Promise<GBPAccount[]> {
  const response = await requestGBP<{ accounts?: GBPAccount[] }>(ACCOUNT_MANAGEMENT_BASE_URL, "accounts");
  return response.accounts ?? [];
}

/** Lists every accessible location, including locations inherited through a business group. */
export async function listGBPLocations(): Promise<GBPLiveLocation[]> {
  const locations: GBPLiveLocation[] = [];
  let pageToken: string | undefined;
  do {
    const response = await requestGBP<{ locations?: GBPLiveLocation[]; nextPageToken?: string }>(
      BUSINESS_INFORMATION_BASE_URL,
      "accounts/-/locations",
      {
        pageSize: 100,
        pageToken,
        readMask: "name,title,storeCode,websiteUri,storefrontAddress,metadata,openInfo",
      },
    );
    locations.push(...(response.locations ?? []));
    pageToken = response.nextPageToken;
  } while (pageToken);
  return locations;
}

function addDateQuery(query: URLSearchParams, prefix: string, value: string) {
  if (!isISODate(value)) throw new Error(`Invalid ISO date: ${value}`);
  const [year, month, day] = value.split("-");
  query.set(`${prefix}.year`, year);
  query.set(`${prefix}.month`, String(Number(month)));
  query.set(`${prefix}.day`, String(Number(day)));
}

export function buildGBPDailyMetricUrl(locationName: string, metricType: string, startDate: string, endDate: string): string {
  if (!/^locations\/[^/]+$/.test(locationName)) throw new Error("GBP location name must use the locations/{locationId} format.");
  if (!metricType) throw new Error("GBP daily metric is required.");
  const url = new URL(`${PERFORMANCE_BASE_URL}/${encodePath(locationName)}:getDailyMetricsTimeSeries`);
  url.searchParams.set("dailyMetric", metricType);
  addDateQuery(url.searchParams, "dailyRange.start_date", startDate);
  addDateQuery(url.searchParams, "dailyRange.end_date", endDate);
  return url.toString();
}

export async function getGBPDailyMetricTimeSeries(
  locationName: string,
  metricType: string,
  startDate: string,
  endDate: string,
): Promise<GBPPerformanceValue[]> {
  const url = buildGBPDailyMetricUrl(locationName, metricType, startDate, endDate);
  const accessToken = await getAccessToken();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GBP Performance API request failed (${response.status}): ${detail || response.statusText}`);
  }
  const data = await response.json() as {
    timeSeries?: { datedValues?: Array<{ date?: { year?: number; month?: number; day?: number }; value?: number | string }> };
  };
  return (data.timeSeries?.datedValues ?? []).flatMap(item => {
    const { year, month, day } = item.date ?? {};
    if (!year || !month || !day || item.value === undefined) return [];
    const value = Number(item.value);
    if (!Number.isFinite(value)) return [];
    return [{ date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, value }];
  });
}
