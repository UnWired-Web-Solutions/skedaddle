import { google } from "googleapis";
import { ENV } from "./_core/env";

export const SKEDADDLE_SEARCH_CONSOLE_PROPERTY = "sc-domain:skedaddlewildlife.com";

type ServiceAccountCredential = {
  client_email: string;
  private_key: string;
  project_id: string;
  type: "service_account";
};

function getCredential(): ServiceAccountCredential {
  if (!ENV.gscServiceAccountJson) {
    throw new Error("GSC_SERVICE_ACCOUNT_JSON is not configured.");
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

export function getSearchConsoleClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredential(),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  return google.searchconsole({ version: "v1", auth });
}

export async function verifySearchConsoleAccess() {
  const client = getSearchConsoleClient();
  const response = await client.sites.list();
  const property = (response.data.siteEntry ?? []).find(
    entry => entry.siteUrl === SKEDADDLE_SEARCH_CONSOLE_PROPERTY,
  );

  if (!property) {
    throw new Error(
      `The service account cannot access ${SKEDADDLE_SEARCH_CONSOLE_PROPERTY}.`,
    );
  }

  return {
    connected: true as const,
    property: property.siteUrl,
    permissionLevel: property.permissionLevel ?? "unknown",
  };
}
