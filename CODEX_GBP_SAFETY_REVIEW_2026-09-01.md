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

Checkpoint `f2c367da` deployed the recovery build. The authenticated production report page reloaded successfully and Ottawa was selected with the same zero/unprovided campaign inputs for the exact post-fix reproduction.

The first request started after the checkpoint was saved but before the platform emitted its deployment-success notification. It later returned the same HTML-for-JSON error, so that run is not evidence about the new code: it overlapped rollout and may have remained pinned to the prior production revision. A clean reproduction must begin only after deployment success is confirmed.

After deployment success was confirmed, the production page was reloaded and Ottawa was selected again with the same zero/unprovided campaign inputs for the definitive clean reproduction.

The definitive clean request began at approximately 06:28:26 EDT on the confirmed production revision and entered the generation state normally.

The clean request progressed through initial territory and Current Campaign assembly without a client or server response-format error; final completion remained pending.

It then advanced through Gap Analysis and Proposed Program generation on the confirmed deployment; final completion remained pending.

The definitive confirmed-deployment run still returned the same HTML-for-JSON error after approximately 129 seconds. This validates the gateway-duration hypothesis and disproves four-worker concurrency as sufficient: two narrative waves can still cross the production request limit. The next correction must place all eight independent narrative calls in one bounded wave and enforce an end-to-end model-call deadline so one stalled upstream request cannot hold the mutation beyond the gateway window.

The concurrency regression was tightened and failed against the four-worker implementation (`4` tasks started versus `8` required). The generator now starts all eight independent narrative calls in one wave, limits direct Anthropic attempts to a shared 65-second budget, and limits the forge fallback to 25 seconds before each section uses its existing deterministic fallback. The tightened regression passed, TypeScript passed, the complete suite passed again (**139 tests; 11 intentional skips**), and the production build succeeded. A second clean production draft/PDF run remained required after deployment.

After the second recovery rollout window, production returned HTTP 200, the authenticated report page loaded normally, and Ottawa was selected again with zero/unprovided campaign scope for the final test.

The definitive Ottawa production preview completed successfully in approximately 94 seconds on the one-wave/deadline release, below the previous failure window. The client received valid tRPC JSON and displayed the auditable report preview with both exact-draft PDF export controls. Exact PDF export and page-by-page visual review remained required before final approval.

The first exact-draft PDF export attempt then failed with Puppeteer/browser context error: `Execution context is not available in detached frame or worker "about:blank"`. The saved HTML preview remained visible, so the failure is isolated to the server-side PDF rendering/export path and remains a release blocker.

A deterministic rendering-boundary regression reproduced that exact detached `about:blank` failure. The PDF renderer now retries once only for that specific transient execution-context error and launches a fresh Chromium browser for the retry; unrelated rendering or storage failures are not retried. The regression failed before the fix and passed afterward. The complete strategy report test file passed, TypeScript passed, the full suite passed (**141 tests; 11 intentional skips**), and the production build passed. Final live export and page-by-page PDF inspection remained required after rollout.

After rollout, the exact-draft export initially returned an HTTP 500 during deployment turnover, then succeeded once the new revision was active. The saved Ottawa draft `7ecf28eb-5bd1-4f5a-ad23-1ca28a05fd93` exported successfully through the production `strategyReport.exportPdf` endpoint, returning a storage-backed PDF URL and a `generatedAt` timestamp.

Initial page-by-page PDF review findings from pages 1–5:

- Cover page rendered successfully with reporting period `2025-07-01 through 2026-06-30` and truthful source disclosure: Salesforce CRM, historical Google Business Profile spreadsheet, and persisted Google Search Console import.
- Executive Summary rendered without blank sections or overflow and preserved the intended no-fabrication wording around GA4 being unavailable for the assessed priority-page context.
- Current Campaign section correctly treated GBP mapping as configuration evidence rather than a live listing audit and preserved `Not provided` / `Unknown` states instead of inventing campaign volume.
- Species Analysis and Top Markets tables rendered legibly with no split rows or missing values in the reviewed pages.

Remaining requirement: inspect pages 6–14 for GBP source labeling, later strategy sections, recommendations, pagination, and any rendering defects before marking the report verification complete.

Additional page-by-page PDF review findings from pages 6–10:

- The GBP Performance section preserved truthful availability rules: Searches remained `Not available`, monthly calls and website clicks stayed historical, Search Console was labelled `persisted search console`, and GA4 was explicitly shown as unavailable rather than coerced into zero.
- The matched-month year-over-year area remained source-aware and constrained to comparable months, with no mixed-source or partial-period claims introduced.
- Top Search Console Pages and Top Search Terms tables rendered across multiple pages without broken header styling, clipped rows, or missing text.
- The Content Architecture Gap narrative preserved the verified page-audit framing and did not convert unaudited page presence into fabricated coverage.
- The Proposed Program narrative remained conditional on missing program inputs and used recommendation language rather than presenting unprovided campaign volume as fact.

Remaining requirement: inspect pages 11–14 for the final strategy sections, footer continuity, recommendations, and any last-page rendering or pagination defects before completing report verification.

Final page-by-page PDF review findings from pages 11–14:

- Scale Comparison, Website Content Architecture, and Google Business Profile Strategy preserved the intended `Not provided`, `Unknown`, and historical-source language instead of converting missing scope into asserted deliverables.
- The 90-Day Action Plan rendered as a structured month-by-month list with no clipped bullets, missing headings, or broken page transitions.
- Delivery Dependencies and Mitigations remained tabular, legible, and fully visible on one page.
- Summary of Recommendations rendered cleanly on the final page with footer continuity intact; no orphan headings, duplicated sections, or truncated bottom content were visible.

Completed end-to-end production verification outcome:

- Ottawa preview mutation completed successfully on the final recovery release.
- Exact-draft PDF export succeeded from the saved preview draft and returned a storage-backed PDF path.
- The downloaded production PDF contained 14 letter-sized pages and passed page-by-page visual review for content continuity, source disclosures, partial/unavailable handling, and pagination.

Conclusion: the Codex GBP safety integration plus the two report-system recoveries are now verified on production.

## Preliminary verdict

**Corrections applied; final approval pending full-suite, build, endpoint, and visual verification.** The branch’s architecture was retained without enabling OAuth, live imports, or listing changes.
