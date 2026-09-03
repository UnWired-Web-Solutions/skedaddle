# Learning Record — Workbook Integration Boundary Drift

## Failure mechanism

- **Observed behavior:** A useful workbook importer and dashboard were added, but nearby API procedures remained public, local identity was trusted from browser storage, workbook surfaces used inconsistent periods, reports continued to prefer a static sales snapshot, and later generated migrations repeated columns/index operations from earlier files.
- **Expected behavior:** New source integrations must preserve the portal trust boundary, use one explicit reporting period, carry the approved source into downstream outputs, and extend a migration chain that installs cleanly from zero.
- **Technical mechanism:** Feature-level tests validated individual outputs without enforcing the cross-cutting authorization, source-period, downstream-consumer, and full-migration-chain invariants. Some authentication tests normalized public procedures as compatibility fixes instead of repairing the session context.

## Control gap and safeguard

- **Why existing controls did not prevent it:** The repo documented many data-quality rules, but it had no executable clean-chain migration test, no signed local-session contract, and no test proving that a franchise could read only its own territory while report generators remained administrator-only.
- **Generalized failure class:** A locally correct feature bypasses or fails to propagate system-wide contracts at integration boundaries.
- **Strongest practical safeguard:** Make trust and source rules executable: signed server sessions, procedure tiers, territory-isolation tests, explicit period helpers, report-source tests, and a migration-chain regression that rejects duplicate or out-of-order schema operations.
- **Validation evidence:** TypeScript passed; the serialized full suite passed 181 tests with 9 intentional credential skips; the production client/server build passed; source scans confirmed only deliberate session/login/health procedures remain public.

## Propagation

- **Project test, constraint, or documentation updated:** `AGENTS.md`, `PROJECT_ENGINEERING_CONTEXT.md`, `docs/PRODUCT_REQUIREMENTS.md`, `todo.md`, authentication documentation, task contract, CI fixture, session tests, authorization compatibility tests, period-window tests, strategy/proposal source tests, and `server/migrationIntegrity.test.ts`.
- **Residual risk or owner action:** The code is committed and pushed but is not merged, deployed, migrated, or runtime verified. UWS must set the production session secret, validate a disposable clean migration, and perform authenticated administrator/franchise checks after an approved deployment.
