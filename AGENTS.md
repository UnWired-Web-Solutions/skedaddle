# Skedaddle agent requirements

Before changing product behavior, read `docs/PRODUCT_REQUIREMENTS.md` completely. It is the repository-native product contract and links to the fuller meeting notes.

For technical implementation, migration, release, incident, or handoff work, also read `PROJECT_ENGINEERING_CONTEXT.md`. Use `TASK_CONTRACT_TEMPLATE.md` for high-risk or multi-stage work and the handoff/learning templates when their stated conditions apply.

Rules for every change:

- Preserve unfamiliar integrations and history. In particular, never remove GA4, Google Search Console, GBP, or Salesforce code because it is not used by the file being changed.
- The initial sales strategy report is the current reporting priority. The quarterly post-sale report and suburb-page expansion are not current scope unless the product contract is updated first.
- Every reported number must identify its source and period. Do not combine periods under one headline, silently include partial imports, or describe an unaudited fact as confirmed.
- Reports must be generated as persistent, reviewable drafts. PDF export must use the saved draft by ID, not HTML supplied by the browser.
- This portal currently uses the custom local `AuthContext` admin gate, not Manus OAuth. Until server-backed local authentication is implemented, portal tRPC procedures must use `publicProcedure`; `protectedProcedure` and `adminProcedure` cause the verified `10001`/`10002` failures. Keep admin-only pages behind `PortalLayout` role checks and record local-admin report actions with audit user ID `0`.
- When Dave or Ay changes a requirement, update `docs/PRODUCT_REQUIREMENTS.md` in the same commit as the implementation.
- Before committing, verify the critical analytics files still exist, run the available focused tests/checks, and inspect the exact staged diff. Stage explicit paths only.
