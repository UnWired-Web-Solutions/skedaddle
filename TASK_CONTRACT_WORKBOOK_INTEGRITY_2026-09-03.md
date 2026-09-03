# Task Contract — Workbook Reporting Integrity

## Requested outcome

- **Outcome:** Repair the audited Salesforce Drive workbook integration, authentication boundary, migration chain, reporting-period consistency, report data source, CI fixture, and project-contract drift.
- **Definition of done:** Anonymous API access is denied except for health and login; local login creates a signed server session; franchise access is territory-scoped; generators are administrator-only; migrations install cleanly; workbook dashboards use one explicit completed-month window; strategy reports prefer the matched-window workbook aggregates; deterministic tests, TypeScript, the full suite, and the production build pass.
- **Explicitly excluded scope:** Repository visibility changes, production migration or deployment, data backfill, GitHub settings changes, closing pull requests, pushing, merging, and outbound communication.

## Authority

| Action | Authorized? | Evidence or owner |
|---|---:|---|
| Investigation | Yes | User asked for review and repair |
| Code or configuration change | Yes | “besides that fix the other things” |
| Database migration or backfill | No | Code-only repair; no production write authorization |
| External API mutation | No | Not required for this repair |
| Checkpoint and deployment | No | Not explicitly authorized |
| GitHub push or merge | Push authorized; merge not authorized | Ay explicitly instructed “push it” after reviewing the local handoff |
| Outbound communication | No | Not requested |

## Impact surface and invariants

- **Users and territories affected:** Portal administrators and all franchise accounts across the 19 mapped territories.
- **Source and coverage rules:** The UWS-owned Google Drive workbook remains the active Salesforce-derived source. A single explicit period applies to totals, species, cities, and rankings. Current/future months and rows rejected by the importer never enter completed-period claims.
- **Authentication and authorization boundary:** The server—not browser storage—establishes identity and role. Anonymous access is limited to login and health. Franchise users can read only their assigned territory. Paid generation, network commercial summaries, imports, and review actions require administrator access.
- **Data, currency, privacy, and audit invariants:** No raw customer rows are returned; CAD and USD stay separate; zero is never substituted for missing; workbook work orders and recorded pre-tax invoice values are not called inspections, closed jobs, revenue, leads, or conversions; report drafts remain exact and auditable.
- **Failure and rollback behavior:** Invalid or expired sessions fail closed. An unavailable workbook may use the existing historical report snapshot only when visibly labelled as historical. No production database or deployment is changed in this task.

## Evidence plan

| Evidence | Required check | Status |
|---|---|---|
| Focused behavior | Session, authorization, period-window, workbook-report, and migration-integrity tests | Passed; included in the full 181-test run |
| Regression and full suite | Serialized Vitest suite | Passed: 181 tests; 9 credential-dependent tests intentionally skipped |
| Type check and production build | TypeScript, Vite client build, and esbuild server bundle | Passed |
| Migration or reconciliation | Static clean-chain test; no production migration authorized | Passed statically; production execution not authorized |
| Local rendered workflow | Authenticated route and report-source UI review if the local server can be run | Not run: the isolated worktree has no authorized runtime database/session configuration |
| Production runtime verification | Not authorized because this task does not deploy | Not run |

## Known unknowns and owner actions

- UWS still owns the production secret rotation, migration execution, rollout, branch protection, and pull-request policy.
- Conversion and close-rate definitions remain unavailable until UWS approves one status taxonomy.
- Live GBP access remains gated by Google approval and explicit UWS operator authorization.
