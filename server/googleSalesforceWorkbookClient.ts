import { google, type sheets_v4 } from "googleapis";
import { ENV } from "./_core/env";

export const SALESFORCE_WORKBOOK_ID = "1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ";
export const SALESFORCE_WORKBOOK_TITLE = "Salesforce Data";
export const SALESFORCE_WORKBOOK_SHEET = "Sheet1";
export const SALESFORCE_WORKBOOK_SOURCE_RANGE = "Sheet1!A:N";
const BATCH_SIZE = 10_000;

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

function safeSheetsError(error: unknown): Error {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
  return new Error(`Google Sheets workbook read failed (status ${code}).`);
}

export type SalesforceWorkbookRead = {
  title: string;
  sheetName: string;
  configuredRowCount: number;
  header: unknown[];
  rows: unknown[][];
};

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

    const headerResponse = await client.spreadsheets.values.get({
      spreadsheetId: SALESFORCE_WORKBOOK_ID,
      range: `${SALESFORCE_WORKBOOK_SHEET}!A1:N1`,
      majorDimension: "ROWS",
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    const header = headerResponse.data.values?.[0] ?? [];
    const rows: unknown[][] = [];
    for (let start = 2; start <= configuredRowCount; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, configuredRowCount);
      const response = await client.spreadsheets.values.get({
        spreadsheetId: SALESFORCE_WORKBOOK_ID,
        range: `${SALESFORCE_WORKBOOK_SHEET}!A${start}:N${end}`,
        majorDimension: "ROWS",
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "FORMATTED_STRING",
      });
      const batch = response.data.values ?? [];
      rows.push(...batch);
      if (batch.length < BATCH_SIZE) break;
    }
    return { title, sheetName: SALESFORCE_WORKBOOK_SHEET, configuredRowCount, header, rows };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Google Sheets workbook read failed")) throw error;
    throw safeSheetsError(error);
  }
}
