# Local Authentication Security Remediation

## Change summary

The portal’s required custom local authentication has been moved from a browser-delivered credential registry to a server-side public authentication procedure. Existing usernames, admin/franchise roles, and franchise `locationId` assignments are retained. Passwords are now held only in the managed server configuration variable `LOCAL_AUTH_ACCOUNTS_JSON` and are neither committed to source control nor returned by the login procedure.

> The portal uses `publicProcedure` for this login contract to remain compatible with the project’s custom local-auth model. It does not introduce Manus OAuth, protected procedures, or an incompatible authorization context.

## Implemented safeguards

| Control | Implementation |
|---|---|
| Credential location | Managed server-side secret only; frontend credential registry removed. |
| Account validation | Schema requires unique, normalized usernames; franchise accounts require a `locationId`; admin accounts cannot carry one. |
| Password comparison | Server validation uses a constant-time equality comparison after a username match. |
| Browser response | Login returns only success/failure and authorized user context; no password field is returned. |
| Source check | A repository scan confirmed neither the previous registry symbol nor the replacement managed password appears in client or server source. |
| Regression coverage | Tests cover managed-secret validation through the public procedure, valid role context, invalid credentials, duplicate usernames, and malformed franchise accounts. |

## Boundary and follow-up

At the user’s direction, the current registry uses a temporary shared credential for the retained accounts. Because this is a shared credential, it must be replaced with per-account strong credentials before the portal is extended beyond its current internal UWS/Dave/Ay use. Password values are deliberately omitted from this document and all source-controlled files.

The client retains the minimal, non-secret user context in session storage to preserve the portal’s existing local navigation behavior. The current portal’s data procedures remain public by project requirement; this remediation prevents password disclosure in the browser bundle but does not transform the broader local-auth model into server-enforced per-route authorization.
