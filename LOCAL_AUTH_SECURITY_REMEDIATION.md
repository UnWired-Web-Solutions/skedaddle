# Local Authentication Security Remediation

## Change summary

The portal’s required custom local authentication has been moved from a browser-trusted identity model to a signed server-session model. Existing usernames, admin/franchise roles, and franchise `locationId` assignments are retained. Passwords remain only in `LOCAL_AUTH_ACCOUNTS_JSON`; successful login creates a signed, HTTP-only, 12-hour cookie using `LOCAL_AUTH_SESSION_SECRET` or the deployment-compatible `JWT_SECRET` fallback.

> Only login, session discovery/logout, and health remain public. Portal metadata requires an authenticated portal session, territory reads enforce `locationId`, and administrator-only procedures protect imports, network commercial summaries, reports, proposals, suburb content, GBP image generation, and review mutations.

## Implemented safeguards

| Control | Implementation |
|---|---|
| Credential location | Managed server-side secret only; frontend credential registry removed. |
| Account validation | Schema requires unique, normalized usernames; franchise accounts require a `locationId`; admin accounts cannot carry one. |
| Password comparison | Server validation hashes and compares fixed-length digests in constant time, including a sentinel path for unknown usernames. |
| Browser response | Login returns only success/failure and authorized user context; no password field is returned. |
| Session | Signed HTTP-only cookie; `SameSite=Lax`; secure on HTTPS; 12-hour expiry; current registry is rechecked on every request. |
| Brute-force control | Five failed attempts per IP/username in 15 minutes trigger a temporary server-side rate limit. |
| Authorization | Anonymous callers are rejected; franchise users are territory-scoped; paid generation and sensitive mutations are administrator-only. |
| Source check | A repository scan confirmed neither the previous registry symbol nor the replacement managed password appears in client or server source. |
| Regression coverage | Tests cover deterministic registry validation, signed/tampered/expired sessions, invalid credentials, rate limiting, logout, anonymous rejection, territory isolation, duplicate usernames, and malformed franchise accounts. |

## Boundary and follow-up

At the user’s direction, the current registry uses a temporary shared credential for the retained accounts. Because this is a shared credential, it must be replaced with per-account strong credentials before the portal is extended beyond its current internal UWS/Dave/Ay use. Password values are deliberately omitted from this document and all source-controlled files.

The client no longer treats `sessionStorage` as identity. It discovers the active session from the server and uses frontend route visibility only for usability; the server remains the authorization boundary.

## Deployment-verification evidence

The redacted verifier was corrected to use the same tRPC batch envelope as the portal client. It passed against the current local server, confirming both the transport shape and managed secret registry. At the time of this record, production still returned HTTP 404 for the new procedure after two rollout waits, which indicates a stale server artifact rather than malformed input or a credential error. A new clean publication attempt is required before published login behavior can be verified.

The clean publication checkpoint `df660789` subsequently propagated successfully. The same redacted verifier passed against production: an authorized managed account was accepted with a password-free user-context response, and the same username with an invalid password received only `invalid_credentials` and no user object. No account identifier or password value was printed or placed into a browser automation action.

## September 3 signed-session extension

The earlier production evidence above verifies the managed credential registry and login procedure; it does **not** verify this newer signed-session and authorization-boundary extension. The extension is implemented and tested locally with signed/tampered/expired-cookie coverage, server-side franchise territory isolation, administrator-only generators/imports, and direct client-route isolation. TypeScript, 181 tests, and the production build pass locally.

This extension is not committed, pushed, deployed, or runtime verified. Before deployment, UWS must configure a dedicated `LOCAL_AUTH_SESSION_SECRET` of at least 32 characters (the existing `JWT_SECRET` fallback is supported for compatibility), publish the code through the approved review path, and verify administrator login, franchise-own-territory access, cross-territory rejection, logout, and expiry in the actual environment.
