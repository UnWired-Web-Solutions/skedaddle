import { google, type drive_v3, type sheets_v4 } from "googleapis";
import { ENV } from "./_core/env";
import { SalesforceWorkbookRowAccumulator, type SalesforceWorkbookParseResult } from "./salesforceWorkbookParser";

export const SALESFORCE_WORKBOOK_ID = "1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ";
export const SALESFORCE_WORKBOOK_TITLE = "Salesforce Data";
export const SALESFORCE_WORKBOOK_SHEET = "Sheet1";
export const SALESFORCE_WORKBOOK_SOURCE_RANGE = "Sheet1!A:N";
// The current workbook is approximately 270k rows. Fifty-thousand-row ranges
// remain bounded while reducing network round-trips enough for Heartbeat's
// execution window.
const BATCH_SIZE = 50_000;

type ServiceAccountCredential = {
  type: "service_account";
  client_email: string;
  private_key: string;
  project_id: string;
};

function getCredential(): ServiceAccountCredential {
  if (!ENV.gscServiceAccountJson) throw new Error("Google service-account credential is not configured.");
  try {
    const credential = JSON.parse(ENV.gscServiceAccountJson) as ServiceAccountCredential;
    if (
      credential.type !== "service_account" ||
      !credential.client_email ||
      !credential.private_key ||
      !credential.project_id
    ) {
      throw new Error("missing fields");
    }
    return credential;
  } catch {
    throw new Error("Google service-account credential is invalid.");
  }
}

export function getSalesforceWorkbookSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredential(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

export function getSalesforceWorkbookDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredential(),
    scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

/** Separate content client used only after a changed revision requires an XLSX export. */
export function getSalesforceWorkbookDriveContentClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredential(),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

function safeSheetsError(error: unknown): Error {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
  return new Error(`Google Sheets workbook read failed (status ${code}).`);
}

function safeDriveError(error: unknown): Error {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
  return new Error(`Google Drive workbook metadata read failed (status ${code}).`);
}

export type SalesforceWorkbookRead = {
  title: string;
  sheetName: string;
  configuredRowCount: number;
  header: unknown[];
  rows: unknown[][];
};

export type SalesforceWorkbookDriveMetadata = {
  version: string;
  modifiedTime: string;
};

export async function readSalesforceWorkbookDriveMetadata(
  client: drive_v3.Drive = getSalesforceWorkbookDriveClient(),
): Promise<SalesforceWorkbookDriveMetadata> {
  try {
    const response = await client.files.get({
      fileId: SALESFORCE_WORKBOOK_ID,
      fields: "id,name,mimeType,modifiedTime,version,trashed",
      supportsAllDrives: true,
    });
    const metadata = response.data;
    if (
      metadata.id !== SALESFORCE_WORKBOOK_ID ||
      metadata.name !== SALESFORCE_WORKBOOK_TITLE ||
      metadata.mimeType !== "application/vnd.google-apps.spreadsheet" ||
      metadata.trashed ||
      !metadata.version ||
      !metadata.modifiedTime
    ) {
      throw new Error("unexpected workbook metadata");
    }
    return { version: String(metadata.version), modifiedTime: metadata.modifiedTime };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Google Drive workbook metadata read failed")) throw error;
    throw safeDriveError(error);
  }
}

export async function readSalesforceWorkbook(
  client: sheets_v4.Sheets = getSalesforceWorkbookSheetsClient(),
): Promise<SalesforceWorkbookRead> {
  try {
    const metadata = await client.spreadsheets.get({
      spreadsheetId: SALESFORCE_WORKBOOK_ID,
      includeGridData: false,
    });
    const title = metadata.data.properties?.title ?? "";
    const sheet = metadata.data.sheets?.find(entry => entry.properties?.title === SALESFORCE_WORKBOOK_SHEET);
    const configuredRowCount = sheet?.properties?.gridProperties?.rowCount ?? 0;
    if (title !== SALESFORCE_WORKBOOK_TITLE || !sheet || configuredRowCount < 1) {
      throw new Error("unexpected workbook metadata");
    }

    const ranges = [`${SALESFORCE_WORKBOOK_SHEET}!A1:N1`];
    for (let start = 2; start <= configuredRowCount; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, configuredRowCount);
      ranges.push(`${SALESFORCE_WORKBOOK_SHEET}!A${start}:N${end}`);
    }
    const response = await client.spreadsheets.values.batchGet({
      spreadsheetId: SALESFORCE_WORKBOOK_ID,
      ranges,
      majorDimension: "ROWS",
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    const [headerRange, ...dataRanges] = response.data.valueRanges ?? [];
    const header = headerRange?.values?.[0] ?? [];
    const rows: unknown[][] = [];
    for (const range of dataRanges) rows.push(...(range.values ?? []));
    return { title, sheetName: SALESFORCE_WORKBOOK_SHEET, configuredRowCount, header, rows };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Google Sheets workbook read failed")) throw error;
    throw safeSheetsError(error);
  }
}

/**
 * Reads only one bounded Sheets range at a time and feeds it directly into the
 * parser. This is the production changed-revision path: no 270k-row response
 * or raw source-row array is retained after each range has been processed.
 */
export async function readSalesforceWorkbookIncrementally(
  client: sheets_v4.Sheets = getSalesforceWorkbookSheetsClient(),
): Promise<SalesforceWorkbookParseResult> {
  try {
    const metadata = await client.spreadsheets.get({ spreadsheetId: SALESFORCE_WORKBOOK_ID, includeGridData: false });
    const title = metadata.data.properties?.title ?? "";
    const sheet = metadata.data.sheets?.find(entry => entry.properties?.title === SALESFORCE_WORKBOOK_SHEET);
    const configuredRowCount = sheet?.properties?.gridProperties?.rowCount ?? 0;
    if (title !== SALESFORCE_WORKBOOK_TITLE || !sheet || configuredRowCount < 1) throw new Error("unexpected workbook metadata");
    const headerResponse = await client.spreadsheets.values.get({
      spreadsheetId: SALESFORCE_WORKBOOK_ID,
      range: `${SALESFORCE_WORKBOOK_SHEET}!A1:N1`,
      majorDimension: "ROWS",
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    const accumulator = new SalesforceWorkbookRowAccumulator();
    accumulator.begin(headerResponse.data.values?.[0] ?? []);
    for (let start = 2; start <= configuredRowCount; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, configuredRowCount);
      const response = await client.spreadsheets.values.get({
        spreadsheetId: SALESFORCE_WORKBOOK_ID,
        range: `${SALESFORCE_WORKBOOK_SHEET}!A${start}:N${end}`,
        majorDimension: "ROWS",
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });
      for (const row of response.data.values ?? []) accumulator.addRow(row);
      if ((response.data.values?.length ?? 0) < BATCH_SIZE) break;
    }
    return accumulator.finish();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Salesforce Drive workbook")) throw error;
    throw safeSheetsError(error);
  }
}
