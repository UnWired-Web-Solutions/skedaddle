# GBP OAuth Setup Log

**Status:** In progress; no OAuth client or user authorization exists yet.

## Verified Google Cloud state

- Project: `uws-gbp-analytics` (displayed as UWS-GBP-ANalytics in Google Cloud Console).
- The UWS account is signed in to Google Cloud Console.
- The Credentials page displayed **no OAuth 2.0 clients** before configuration started.
- Google Auth Platform was not configured. Consent-screen setup was opened for the intended internal application, **UWS Skedaddle GBP Analytics**.
- Browser navigation reset the in-progress consent-screen form before it could be submitted. The project remains without a configured consent screen and without an OAuth client.
- A hard refresh reliably restored the signed-in UWS Cloud Console credentials page and again confirmed that no OAuth clients exist. The consent-screen wizard still requires completion through a stable browser interaction.
- The App Information step was submitted through the Google page controls using the approved internal app name and the signed-in UWS support email. The next required verification is the audience step; this record does not claim the full consent configuration is complete.
- The Audience step exposes both internal and external application types. The internal option is available and will restrict the application to users in the UWS organization, which is the approved configuration for this internal portal.
- The internal audience selection was accepted. The UWS contact email was added as the required Google notification contact. The Finish step has not yet been submitted, so no consent configuration or OAuth client is claimed as created.
- The App Information, Audience, and Contact Information steps now display as complete. Google’s final step requires acknowledgment of its API services user-data policy before it will create the consent configuration; the user explicitly approved this OAuth-client configuration workflow.
- Google now marks all four consent-screen steps complete. The final Create action will establish the internal consent configuration only; it will not authorize Business Profile access, grant a refresh token, change listings, or retrieve data.
- Google confirmed that the internal OAuth consent configuration was created. The OAuth overview still reports zero configured OAuth clients, so a separate web client with the approved production callback remains the next required step.
- The Google Cloud **Create OAuth client** action was opened. The client-creation route is still loading, and no OAuth client has been submitted or created at this point.
- The client-creation form is now available. Google offers a **Web application** client type, which is the required choice for the portal’s HTTPS callback. No client type has been submitted yet.
- The **Web application** type was selected. The form separates JavaScript origins from redirect URIs; the server-side portal flow requires only the production redirect URI, so no browser JavaScript origin will be added.
- The web-client form now contains the descriptive production client name and exactly one redirect URI: `https://skedaddle.manus.space/api/gbp/oauth/callback`. No JavaScript origin was entered. The client-creation form has not been submitted yet.
- Visual verification confirms the selected type is **Web application**, the client is named **Skedaddle GBP Importer - Production**, no JavaScript origin is present, and the sole authorized redirect URI is `https://skedaddle.manus.space/api/gbp/oauth/callback`.
- OAuth web-client creation was submitted after the final visual check. Google was still displaying its **Creating** state at the next inspection, so client creation and any generated secret remain unconfirmed.
- Google confirmed that the production Web application OAuth client was created. Its access is restricted to users within the UWS organization because the consent configuration is internal. No client identifier, client secret, refresh token, or Business Profile data is stored in this log or repository.
- Google Cloud confirms that the client record exists and displays its client identifier. The existing client secret is masked, and this interface offers no download or reveal control for it. Google’s client-secret guidance indicates that a new secret must be created when a one-time secret was not retained.
- A new client secret was created after explicit confirmation. The OAuth client identifier and new one-time secret were stored directly in the protected project-secret store, and a targeted validation made a deliberately invalid refresh-token grant to Google. Google accepted the client credentials (`invalid_grant`, not `invalid_client`); the check did not obtain a token or access Business Profile data. The refresh authorization remains intentionally absent.
- The production callback path is now registered in the portal but returns a deliberate `503 disabled_pending_google_approval` response for both start and callback requests. It does not read, log, or exchange any code. Signed short-lived state primitives have been unit tested, but they are not used to initiate OAuth until Google approves Performance API access and a UWS operator explicitly authorizes activation.
- **September 1, 2026 quota check:** Google Cloud’s Business Profile Performance API quota still shows **Requests per minute: 0**. The API remains enabled, but the allowlist approval has not yet taken effect. No authorization, inventory sync, metric request, or import was attempted.

## Guardrails retained

- No Business Profile location was edited, appealed, reverified, or otherwise changed.
- No OAuth token was requested or stored.
- No Business Profile Performance API request was made.
- The sole intended redirect URI remains `https://skedaddle.manus.space/api/gbp/oauth/callback`.

## Next actions

1. Complete the consent-screen configuration as an internal UWS application.
2. Create a Web application OAuth client with the approved production redirect URI.
3. Store client values through project secrets only.
4. Do not start an authorization or data-import flow until the Google allowlist decision is verified.
