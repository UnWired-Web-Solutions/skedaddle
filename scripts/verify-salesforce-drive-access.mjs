/**
 * Verifies that the deployed Google service identity can read the approved
 * Salesforce Data workbook. It prints only workbook metadata and header names;
 * it never prints credential material or customer rows.
 */
import { google } from "googleapis";

const WORKBOOK_ID = "1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ";
const HEADER_RANGE = "Sheet1!A1:N1";

function getCredential() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GSC_SERVICE_ACCOUNT_JSON is not configured.");
  const parsed = JSON.parse(raw);
  if (
    parsed?.type !== "service_account" ||
    typeof parsed.client_email !== "string" ||
    typeof parsed.private_key !== "string"
  ) {
    throw new Error("GSC_SERVICE_ACCOUNT_JSON is missing required service-account fields.");
  }
  return parsed;
}

const auth = new google.auth.GoogleAuth({
  credentials: getCredential(),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

const [metadata, header] = await Promise.all([
  sheets.spreadsheets.get({ spreadsheetId: WORKBOOK_ID, includeGridData: false }),
  sheets.spreadsheets.values.get({ spreadsheetId: WORKBOOK_ID, range: HEADER_RANGE }),
]);

const sheet = metadata.data.sheets?.find(entry => entry.properties?.title === "Sheet1");
console.log(JSON.stringify({
  connected: true,
  workbookId: WORKBOOK_ID,
  title: metadata.data.properties?.title ?? null,
  sourceSheet: sheet?.properties?.title ?? null,
  configuredRows: sheet?.properties?.gridProperties?.rowCount ?? null,
  header: header.data.values?.[0] ?? [],
}, null, 2));
