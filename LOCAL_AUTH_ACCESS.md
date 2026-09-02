# Portal Local-Authentication Access

The portal’s local login registry is stored exclusively in the managed server secret named `LOCAL_AUTH_ACCOUNTS_JSON`. It contains the authorized account names, roles, territory assignments, and passwords. No password value belongs in source code, GitHub, the project’s session memory, build logs, screenshots, or ordinary chat history.

The administrator username is `admin`. If an authorized administrator cannot sign in, update the managed secret through the portal’s secure settings rather than adding or changing credentials in code. The replacement value must be valid JSON, preserve authorized account role and territory metadata, and be verified through the public local-auth procedure without printing a credential value.

After a credential change, run the focused local-auth regression, checkpoint the release, and verify one authorized sign-in plus one deliberately rejected sign-in in production. Do not use account details from historical documents as an authentication source because they may be stale or intentionally redacted.
