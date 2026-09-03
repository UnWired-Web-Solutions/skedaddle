# Portal Local-Authentication Access

The portal’s local login registry is stored exclusively in the managed server secret named `LOCAL_AUTH_ACCOUNTS_JSON`. It contains the authorized account names, roles, territory assignments, and passwords. No password value belongs in source code, GitHub, the project’s session memory, build logs, screenshots, or ordinary chat history.

The administrator username is `admin`. If an authorized administrator cannot sign in, update the managed secret through the portal’s secure settings rather than adding or changing credentials in code. The replacement value must be valid JSON, preserve authorized account role and territory metadata, and be verified through the login procedure without printing a credential value.

Successful login creates a signed, HTTP-only, 12-hour cookie. Set a UWS-owned `LOCAL_AUTH_SESSION_SECRET` with at least 32 characters; `JWT_SECRET` is accepted only as the current deployment-compatible fallback. The browser never stores trusted identity or role data. Anonymous requests cannot read portal data, franchise sessions are restricted to their configured `locationId`, and administrator-only mutations are checked by the server.

After a credential or signing-secret change, run the focused local-auth and territory-authorization regressions, checkpoint the release, and verify authorized sign-in, rejected sign-in, logout, anonymous rejection, one allowed franchise-territory read, and one denied cross-territory read in production. Do not use account details from historical documents as an authentication source because they may be stale or intentionally redacted.
