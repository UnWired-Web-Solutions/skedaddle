# Codex Handoff — Workbook Integrity Selective Adaptation

## Purpose and Decision

This note records the review of `codex/workbook-integrity-fixes`, specifically commits `5badbe16d2d28186b558a1643d07cea32d93716b` and `9c0710ead7ddb6779ed697d3804b701c05676eb3`. The branch was based directly on the then-current UWS `main` checkpoint `dc737e65c67334b7b1c665b48014a092263d7e13`; its two commits were therefore reviewed as a current, focused change set rather than as a stale-branch merge.

The change set contained valuable data-integrity and authentication hardening ideas. It was **not merged wholesale** because several routing and fallback changes conflict with explicit portal requirements that protect production authentication and source provenance. The compatible changes below were adapted into current `main` rather than cherry-picked. This preserves the useful behavior without importing incompatible framework assumptions.

## Changes Adopted

| Area | Adapted change | Current behavior |
|---|---|---|
| Workbook reporting period | A reusable latest-twelve-completed-month UTC window was added to `shared/reportingPeriod.ts`. | Current workbook territory and network performance queries exclude the in-progress UTC month and expose the exact window label. |
| Workbook presentation | Dashboard and Network source notices now display the reporting window. | Users can see the period that supports aggregate work-order and recorded pre-tax invoice values rather than inferring a period. |
| Authentication hardening | The bounded failed-login tracking pattern was adapted to the existing local-auth router. | The public login procedure limits repeated failed attempts by normalized username and request IP, clears the counter after a successful login, and caps in-memory tracking. |
| Migration clean-install integrity | The static migration-chain regression was added. | The test detects duplicate column creation and attempts to drop a missing index across ordered Drizzle migrations. |
| Historical migration repair | Duplicate statements detected by the new test were removed from migrations `0013`, `0014`, and `0016`. | `pnpm drizzle-kit generate` confirmed that declared schema has not changed, so no new migration or production SQL execution was required. |

> The reporting-window change does not turn workbook data into revenue, conversion, closed-job, inspection, or full-coverage evidence. Existing currency segregation, partial-run visibility, rejected-row disclosure, and conversion-unavailable behavior remain unchanged.

## Changes Intentionally Omitted

| Incoming area | Decision | Reason |
|---|---|---|
| `protectedProcedure`, `portalProcedure`, `territoryProcedure`, and `adminProcedure` | Not adopted. | This portal has an explicit operational requirement that all tRPC endpoints remain `publicProcedure`. Reintroducing procedure tiers would conflict with the existing custom local-auth compatibility path and has previously led to portal authentication failures. |
| Signed local-session module and context rewrite | Not adopted. | It depends on the omitted procedure-tier architecture and on a new session-secret operational boundary. It requires a separate, user-approved authentication design and production verification plan. |
| Client route/role guards tied to the new session model | Not adopted. | They are coupled to the omitted session and procedure implementation. They cannot be safely separated without reworking the current custom authentication contract. |
| Admin-only conversion of workbook, report, proposal, suburb, and GBP routers | Not adopted. | It directly violates the required public-procedure constraint. The current routes retain their existing public procedure contract. |
| Proposal fallback to `DASHBOARD_DATA` revenue, job, species, or suburb values | Not adopted. | A workbook gap must remain an explicit unavailable or historical-source condition. Static dashboard fixtures cannot be presented as current Drive-workbook evidence. |
| Suburb-generator procedure-tier changes | Not adopted. | The active Suburb Page Generator is already review-only and source-gated. Changing it to the branch's tiered model would undo the required public-procedure compatibility and introduce an unnecessary regression risk. |
| Broad report and proposal router rewrite | Not adopted. | Strategy reports already use the verified internal GPT-5.5 path and explicit historical/partial-source disclosures. Any report or proposal source-data redesign requires a dedicated review, exact-output checks, and separate regression coverage. |
| Branch status documentation | Not copied. | Statements that the incoming branch is unmerged, undeployed, or awaiting a session secret describe that branch, not the current portal release. Reusing them would create misleading operational records. |

## Required Invariants for Future Codex Updates

Future contributions to this repository should preserve the following boundaries.

| Invariant | Required implementation behavior |
|---|---|
| Procedure compatibility | Keep active tRPC procedures on `publicProcedure` unless the portal authentication architecture is expressly re-approved and production-tested. |
| Source provenance | Use the approved Google Drive workbook only for active Salesforce-derived aggregates. Do not revive Salesforce API access or present static dashboard fixtures as fresh operational data. |
| Missing data | Return and display unavailable, partial, historical, or review-required states. Do not silently zero-fill or infer conversion, ownership, coverage, ranking, job status, or revenue meaning. |
| Currency | Keep CAD and USD separate in aggregation, ranking, and presentation. |
| Reporting periods | State the precise window used for workbook aggregates and exclude in-progress source months from completed-period reporting. |
| Local content | Keep Suburb Page Generator drafts review-only. No unsupported local claim, automated publish action, placeholder fact, or static local-performance input may be introduced. |
| Credentials | Keep passwords, tokens, raw account registry contents, customer records, and signed URLs out of source, GitHub, tests, handoff notes, and console output. |
| Migrations | Test clean-install migration integrity before changing historical migration files. Do not rerun or mutate previously applied production migrations merely to validate a clean path. |

## Recommended Follow-up Boundaries

The remaining branch ideas should be considered only in separate, scoped work items. Authentication changes need a complete compatibility decision, test matrix, production secret plan, and administrator/franchise session verification. Proposal source cleanup needs its own provenance audit because its current legacy dashboard inputs are broader than this workbook-window adaptation. Report-generator changes need exact draft-to-PDF review in addition to normal unit, type, and build checks.

For this adaptation, please treat the current source tree—not the original branch’s status documents—as the authority on deployed state. New changes should be supplied as focused commits with tests that assert user-visible and source-safety behavior rather than relying only on source-file phrase checks.
