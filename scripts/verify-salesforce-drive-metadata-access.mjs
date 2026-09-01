import { google } from "googleapis";

const WORKBOOK_ID = "1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ";

function credential() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GSC_SERVICE_ACCOUNT_JSON is not configured.");
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error("Service-account credential is incomplete.");
  }
  return parsed;
}

try {
  const auth = new google.auth.GoogleAuth({
    credentials: credential(),
    scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.get({
    fileId: WORKBOOK_ID,
    fields: "id,name,mimeType,modifiedTime,version,trashed",
    supportsAllDrives: true,
  });
  console.log(JSON.stringify({
    accessible: response.data.id === WORKBOOK_ID,
    nameMatches: response.data.name === "Salesforce Data",
    mimeType: response.data.mimeType,
    modifiedTime: response.data.modifiedTime,
    version: response.data.version,
    trashed: response.data.trashed,
  }, null, 2));
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? error.code : "unknown";
  const responseError = error && typeof error === "object" && "response" in error
    ? error.response?.data?.error
    : null;
  console.error(JSON.stringify({
    accessible: false,
    status: String(code),
    googleStatus: typeof responseError?.status === "string" ? responseError.status : "unknown",
    reason: typeof responseError?.errors?.[0]?.reason === "string" ? responseError.errors[0].reason : "unknown",
  }, null, 2));
  process.exitCode = 1;
}
