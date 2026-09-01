export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Salesforce OAuth2 Connected App credentials
  sfClientId: process.env.SF_CLIENT_ID ?? "",
  sfClientSecret: process.env.SF_CLIENT_SECRET ?? "",
  sfLoginUrl: process.env.SF_LOGIN_URL ?? "https://login.salesforce.com",
  sfRedirectUri: process.env.SF_REDIRECT_URI ?? "",
  // Anthropic API for proposal/report generation
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  // Perplexity Sonar API for real-time web research
  sonarApiKey: process.env.SONAR_API_KEY ?? "",
  // Google Search Console read-only service-account credential
  gscServiceAccountJson: process.env.GSC_SERVICE_ACCOUNT_JSON ?? "",
  // Google Business Profile requires a UWS user OAuth refresh token; do not use the GSC service account.
  gbpOAuthClientId: process.env.GBP_OAUTH_CLIENT_ID ?? "",
  gbpOAuthClientSecret: process.env.GBP_OAUTH_CLIENT_SECRET ?? "",
  gbpOAuthRefreshToken: process.env.GBP_OAUTH_REFRESH_TOKEN ?? "",
  gbpOAuthRedirectUri: process.env.GBP_OAUTH_REDIRECT_URI ?? "https://skedaddle.manus.space/api/gbp/oauth/callback",
};
