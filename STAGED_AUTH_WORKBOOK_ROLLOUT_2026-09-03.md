# Staged Server-Session and Workbook Reporting Rollout

## Purpose and Release Boundary

This branch stages the approved replacement of browser-trusted local login with server-enforced local sessions, and connects Strategy Reports and Proposals to the active Drive-workbook aggregate source. It is **not approved for merge or deployment**. The production portal remains on the existing `main` release until the signing-secret and smoke-test prerequisites below are approved.

| Area | Staged behavior | Production action | Status |
|---|---|---|---|
| Local session | Successful public login issues a signed, HTTP-only cookie. The server resolves the account against the managed registry on each request. | Add a dedicated server-only `LOCAL_AUTH_SESSION_SECRET` with 32 or more high-entropy characters. | Pending approval |
| Authorization | Sensitive operations require a validated portal session; territory reads enforce franchise `locationId`; commercial, import, generation, and review routes require admin. | Execute the administrator and franchise smoke matrix below. | Pending approval |
| Workbook reporting | Strategy Reports and Proposals use active Drive-workbook aggregates for the exact July 2025–June 2026 window when available; historical snapshot use is explicitly labelled fallback-only. | Review one safe draft from each generator before release. | Pending approval |
| Migration integrity | Ordered static migration validation passes after removal of an invalid `0010` index drop. Declared schema has no change. | Run full historical chain against an approved disposable MySQL/TiDB database. | Blocked by database privileges |

## Security Design

The staged local-session cookie carries only an opaque signed username and expiration. It is `HttpOnly`, `Secure`, and `SameSite=Lax`; trusted role and territory assignment are not stored in browser `sessionStorage`. Each request rechecks the username in the managed account registry, so removal or reassignment invalidates the session immediately.

Public access is limited to login, local-session discovery, local logout, and no-sensitive-data health behavior. The server then applies the following authorization matrix.

| Operation | Anonymous | Franchise account | Administrator |
|---|---:|---:|---:|
| Session discovery and logout | Allowed | Allowed | Allowed |
| Own territory workbook and analytics read | Denied | Allowed only for matching `locationId` | Allowed |
| Other territory or network-commercial read | Denied | Denied | Allowed |
| Imports, Strategy Reports, Proposals, Suburb review, GBP images, review mutations | Denied | Denied | Allowed |

## Workbook Source Contract

The shared loader reads only the active Drive-workbook aggregate run. It accepts a territory, exact currency, and explicit July 1, 2025 through June 30, 2026 reporting window. It returns same-currency territory totals, work-order counts, invoice-value row coverage, recorded pre-tax invoice values, species and city category breakdowns, same-currency network benchmark totals, source status, rejected-row count, and exact period label.

The loader never reads raw workbook rows, combines CAD and USD, interprets a work order as a closed job, or treats recorded pre-tax invoice value as recognized or closed revenue. It returns unavailable when the active run or the requested territory/currency/window has no matching aggregate rows. Strategy Reports keep the historical snapshot only as a clearly labelled fallback; Proposals present unavailable source context rather than static dashboard revenue or ranking fallbacks.

## Validation Evidence

The following local checks passed on the staged branch. They do not claim production approval.

| Check | Result |
|---|---|
| Signed-cookie, tamper/expiry, account-removal, logout, role, territory, and active-router authorization regressions | Passed: 14 focused tests |
| Workbook currency-separation, proposal source-safety, Strategy Report workbook-source, and ordered migration regression | Passed: 21 focused tests in total |
| TypeScript check | Passed |
| Declared schema comparison | `drizzle-kit generate` reported no schema changes |
| Ordered migration integrity test | Passed after removing the invalid `0010` drop statement |
| Full empty-database migration execution | Not run: the managed database account correctly denied `CREATE DATABASE`; no production schema or data was touched |

## Required Approval Before Merge or Deployment

The project owner must approve the following prerequisites before this branch is merged, checkpointed as a production release, or deployed.

1. Add `LOCAL_AUTH_SESSION_SECRET` to managed server configuration. It must be a dedicated random secret with at least 32 characters and must not be committed, logged, or shared in ordinary chat.
2. Provide an isolated disposable MySQL/TiDB schema or database credential that permits create, run, and drop operations for migration validation. The production database must not be used for this test.
3. Execute and record the production smoke matrix below with an administrator and a franchise account assigned to a known territory.
4. Review one Strategy Report draft/PDF and one Proposal draft/PDF generated from the exact saved draft, confirming source labels, period, currency, partial/unavailable state, and no unsupported terminology.

| Smoke test | Expected result |
|---|---|
| Anonymous read or admin mutation request | Rejected by the server |
| Administrator sign-in and session refresh | Session remains valid and admin operation is allowed |
| Franchise sign-in and own-territory dashboard read | Allowed |
| Franchise request for different territory or network summary | Rejected by the server |
| Franchise attempt at import/report/proposal/suburb/GBP operation | Rejected by the server |
| Logout | Cookie clears and protected requests are rejected |
| Account removal or territory reassignment | Existing session loses access on next request |

## Intentionally Not Performed

No production deployment, production database migration, production secret update, real report/proposal generation, or GitHub merge is included in this staging handoff. These actions require the approvals above.
