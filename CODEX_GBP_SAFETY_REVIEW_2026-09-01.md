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

## Preliminary verdict

**Request changes, then approve.** The branch’s architecture is worth retaining. The listed corrections are narrow and can be applied on top of the single Codex commit without discarding its source-safety improvements.
