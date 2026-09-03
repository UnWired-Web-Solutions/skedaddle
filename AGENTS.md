# Skedaddle agent requirements

Before changing product behavior, read `docs/PRODUCT_REQUIREMENTS.md` completely. It is the repository-native product contract and links to the fuller meeting notes.

For technical implementation, migration, release, incident, or handoff work, also read `PROJECT_ENGINEERING_CONTEXT.md`. Use `TASK_CONTRACT_TEMPLATE.md` for high-risk or multi-stage work and the handoff/learning templates when their stated conditions apply.

Rules for every change:

- Preserve unfamiliar integrations and history. In particular, never remove GA4, Google Search Console, GBP, or Salesforce code because it is not used by the file being changed.
- The initial sales strategy report is the current reporting priority. The quarterly post-sale report remains later scope. The suburb-page workflow is administrator-only, review-only, and must not publish directly unless the product contract is updated first.
- Every reported number must identify its source and period. Do not combine periods under one headline, silently include partial imports, or describe an unaudited fact as confirmed.
- Reports must be generated as persistent, reviewable drafts. PDF export must use the saved draft by ID, not HTML supplied by the browser.
- The portal uses signed, HTTP-only local sessions backed by `LOCAL_AUTH_ACCOUNTS_JSON`; `LOCAL_AUTH_SESSION_SECRET` is preferred and `JWT_SECRET` is the deployment-compatible fallback. Browser storage and UI visibility are never authorization. Keep only login, session discovery/logout, and health public. Use `portalProcedure` for authenticated shared metadata, `territoryProcedure` for territory reads, and `adminProcedure` for network commercial summaries, imports, report/proposal/suburb generation, GBP image generation, and review mutations.
- Franchise accounts may read only their configured `locationId`. Do not add a territory endpoint without a server-side territory check, and do not make an endpoint public to work around an authentication test.
- When Dave or Ay changes a requirement, update `docs/PRODUCT_REQUIREMENTS.md` in the same commit as the implementation.
- Before committing, verify the critical analytics files still exist, run the available focused tests/checks, and inspect the exact staged diff. Stage explicit paths only.
