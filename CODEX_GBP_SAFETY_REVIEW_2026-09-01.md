# Codex GBP Safety Update Review

**Reviewed branch:** `codex/gbp-integration-safety-fixes`  
**Reviewed commit:** `de9582e027246a478c82bebcc78cc583b689a7ab`  
**Merge base:** `a2fc281ef67b4531551b24adb170ea2fd870492f`  
**Intent:** Harden Google Business Profile reporting so canonical live metrics can replace equivalent legacy metrics without hiding partial or unavailable API outcomes.

## Overall assessment

The update is directionally strong and should be integrated after targeted corrections. It centralizes GBP source resolution, normalizes Google metric enums to the portal’s reporting keys, carries source-aware GBP data into strategy reports, blocks mixed-source YoY, and introduces exact account/location/shop-code bindings that remain empty until authoritative API reconciliation. The branch preserves `publicProcedure` compatibility and does not enable OAuth, live imports, or listing changes.

The isolated branch passed TypeScript and its complete test suite: **135 tests passed and 11 were intentionally skipped**. No schema migration is included in the update.

## Required corrections before merge

| Priority | Finding | Required correction |
|---|---|---|
| Major | The persistence-plan builder can be called directly with a current/future month even though imports are restricted to completed calendar months. | Enforce the completed-month check inside the persistence boundary as well as the importer planner. |
| Major | The persistence validator accepts internally contradictory coverage snapshots, such as `unavailable` with successful location identities or `partial` where all locations succeeded. | Enforce coverage-state invariants before any transaction: complete means all expected locations with usable rows; partial means some but not all; unavailable means zero usable locations and a null value. |
| Major | Strategy-report AI prompts receive GBP totals without the source label or incomplete-period list. A model could describe a subtotal as full-period performance even though the rendered table later warns about incomplete months. | Add GBP source and incomplete-period context to every AI/fallback path that uses GBP totals, with an explicit instruction not to characterize excluded periods as zero or complete. |
| Major | The report cover labels any multi-source state as “API with historical fallback,” including a possible `partial + unavailable` state with no legacy value. | Classify source state from the actual source set and use a neutral mixed-coverage label that cannot imply a historical fallback that is absent. |
| Minor | GBP insight labels default every non-call/non-click metric to “direction requests,” which can mislabel `searches`. | Use an explicit metric-label map and skip unknown metrics rather than assigning an incorrect label. |
| Minor | The Performance API parser silently drops malformed dated values, reducing audit visibility. | Fail the location request on malformed returned rows so the importer records a failed location/metric rather than quietly omitting data. |

## Positive findings

The source resolver correctly applies precedence per metric-period: complete persisted API data wins; partial and unavailable live attempts remain visible; legacy data is used only when no live attempt exists. The import planner treats an empty location response as unavailable or partial instead of zero, validates non-negative integer daily values, and blocks current/future imports. The registry adds exact approved-binding types and keeps the approved binding list empty, so a shop code alone still cannot authorize import. Report aggregation excludes partial/unavailable GBP metrics from headline values, and the custom-auth regression tests confirm the affected procedures remain callable through the portal’s local-auth architecture.

## Integration corrections applied

The reviewed Codex commit was cherry-picked onto current `main` as `3b5fea5`. Before final verification, the integration was amended to enforce completed-month validation and coverage invariants at the persistence boundary, fail malformed Performance API rows instead of dropping them, give report prompts and fallbacks explicit GBP source/coverage context, use a neutral mixed-source label, and map insight labels explicitly. Focused TypeScript and regression checks passed after these corrections: **36 tests passed and one optional live test was skipped**.

## Verification record

The complete suite passed after integration (**138 tests passed; 11 intentional skips**) and the production build succeeded. Public endpoint checks confirmed that live GBP remains inactive, Google approval remains pending at the recorded zero quota, the protected OAuth client is configured without a refresh authorization, and the authoritative import-eligible binding count remains zero. The Minneapolis GBP trend endpoint returned only explicitly labelled `legacy_spreadsheet` rows. An authenticated production browser review confirmed the Analytics dashboard loads its Search Console and GA4 panels, retains the GBP year-over-year chart, renders unavailable comparison states without substituting zeros, and displays the full pending-approval warning beneath the chart. The reviewed Hamilton June comparison remained visibly labelled legacy data and retained its existing values: calls 262 to 271, website clicks 253 to 205, and directions 69 to 92.

The authenticated Strategy Report generator also loaded its full territory selector and existing 13-section workflow. A fresh report and exact draft-to-PDF export were then required because the Codex update changed report-side GBP aggregation and disclosures.

For the fresh verification run, Ottawa was selected and every campaign-volume field remained at zero, which the application defines as “not provided.” No scope, publishing volume, or page count was invented for the test report.

The production generation workflow advanced through Executive Summary, Current Campaign, Suburb Revenue, GBP Performance, Proposed Program, and Scale Comparison assembly without a browser error; final draft and PDF inspection remained pending at that checkpoint.

The first production verification request ultimately failed after approximately 158 seconds with `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`, consistent with an HTML gateway response replacing the expected tRPC JSON after a long-running request. A deterministic regression demonstrated the latency multiplier: only one of eight independent narrative tasks started while the first remained pending. The orchestration now uses a bounded four-worker pool, preserves the original section order, and supplies every narrative with the same deterministic territory/source context. The regression changed from one started task to four concurrently started tasks. After the fix, TypeScript passed, the complete suite passed (**139 tests; 11 intentional skips**), and the production build succeeded. The original production draft/PDF workflow still required a post-deployment rerun before release approval.

## Preliminary verdict

**Corrections applied; final approval pending full-suite, build, endpoint, and visual verification.** The branch’s architecture was retained without enabling OAuth, live imports, or listing changes.
