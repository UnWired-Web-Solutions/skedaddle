# Engineering Handoff — Workbook Reporting Integrity

## Summary

The audited Salesforce-derived Google Drive workbook integration and its adjacent trust boundaries were repaired on local branch `codex/workbook-integrity-fixes`, based on UWS `main` at `dc737e6`.

The implementation replaces browser-trusted local identity with signed server sessions, enforces administrator and franchise-territory authorization on the server and client routes, repairs the clean migration chain, aligns workbook dashboards to one latest-12-completed-month window, and makes strategy reports/proposals prefer exact July 2025–June 2026 workbook aggregates. Workbook terminology now describes work orders and recorded pre-tax invoice values without inventing inspection, closed-job, lead, conversion, or recognized-revenue meaning.

This work is **implemented, tested, committed, and pushed**. It is not merged, migrated, deployed, or runtime verified.

## Evidence

| Area | Status | Evidence |
|---|---|---|
| Repository and branch | Pushed | `codex/workbook-integrity-fixes`, based on `dc737e6`; no source-file deletions |
| Code/configuration | Implemented | Signed local session, procedure tiers, territory route guard, completed-period workbook queries, workbook-backed report/proposal context, repaired migration SQL, CI fixture |
| Tests and checks | Tested | TypeScript passed; 181 tests passed; 9 credential-dependent tests skipped; Vite and server production bundles passed |
| Migration/backfill | Not run | Static migration-chain regression passed; no production migration or backfill was authorized |
| Checkpoint | Committed | GitHub commit `5badbe16d2d28186b558a1643d07cea32d93716b` |
| Canonical GitHub push | Pushed | Remote branch and local branch are synchronized |
| Deployment | Not deployed | No deployment authority was granted |
| Runtime verification | Not run | Requires an approved deployment, production session secret, and authenticated administrator/franchise checks |

## Source and safety notes

- The UWS-owned Google Drive workbook remains read-only and aggregate-only in portal/report surfaces.
- Dashboard workbook totals, species, cities, and rankings use the same latest 12 completed UTC months; current and future months are excluded.
- Strategy reports and proposals use the explicit July 1, 2025–June 30, 2026 period. If matching workbook aggregates are unavailable, the existing snapshot is retained only with a visible historical label.
- CAD and USD are queried and displayed separately. No cross-currency total or ranking is introduced.
- A valid zero remains distinct from unavailable data; rejected workbook rows and partial-source state remain visible.
- Anonymous access is limited to login, session discovery/logout, and health. Franchise sessions are restricted to their configured territory. Imports, network commercial summaries, report/proposal/suburb generation, and GBP image/review operations require an administrator.
- GA4, Search Console, GBP, report-draft, and PDF-integrity work remains present.

## Remaining risk and owner actions

- Open and review a pull request before any merge; merge was not authorized by this task.
- Configure a dedicated production `LOCAL_AUTH_SESSION_SECRET` of at least 32 characters before deployment.
- Verify the migration chain on a disposable empty database before relying on a clean installer. Do not rerun already-applied historical migrations against production.
- After an approved deployment, runtime-verify administrator login, franchise own-territory access, cross-territory rejection, logout/expiry, active workbook source labels, and one saved report/proposal export.
- Keep inspection, closed-job, lead, conversion, and close-rate measures unavailable until UWS approves a source status taxonomy.
