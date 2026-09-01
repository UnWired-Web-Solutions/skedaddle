# GSC Year-over-Year Detail Validation Log

## Scope

This record covers the Analytics **Year-over-Year Detail** table extension for persisted, territory-scoped Google Search Console metrics. It does not authorize a live source import, change a scope registry entry, or alter the existing Google Business Profile approval gate.

## Local contract checks — September 1, 2026

The new contract reads only rows already persisted in `gsc_page_metrics` for the requested territory and matched calendar month. It returns an explicit `persisted_territory_scoped_search_console` source label and makes the comparison eligible only if the territory has a `ready` scope decision and both years have retained page rows from one source property. It does not fall back to a spreadsheet or convert an absent row to zero.

Two aggregate-only local checks verified both response paths. Hamilton June 2026 correctly returned a non-eligible GSC comparison because no Hamilton June 2025 page rows are stored. Durham June 2026 returned an eligible matched-month comparison, with the source label and verified-scope eligibility present. No page URL, query text, visitor information, credential, or source payload was recorded in this log.

## Automated verification

Strict TypeScript and the focused Analytics, Search Console importer, and territory-scope tests passed: **21 tests** across three files. Full-suite, production-build, browser, and deployment verification remain pending.

## Local interface verification — eligible comparison

The authenticated local Analytics interface was opened for Durham Region with June 2026 compared to June 2025. The Year-over-Year Detail table rendered three new rows: **Organic Search Clicks**, **Organic Search Impressions**, and **Organic Search CTR**. Each row displayed matched-month values, a calculated change, and the status **Search Console — verified territory scope**. Existing GA4 and GBP rows remained intact, and the table’s additional source-status column kept their provenance blank rather than mislabelling them as Search Console data.

The same local interface was then checked for Hamilton, where the stored June 2025 GSC month is absent. It displayed the explicit unavailable notice: `Search Console year-over-year detail is unavailable because one or both matched months lack persisted data from the verified territory scope. No zero value or estimated change is shown.` This confirms that the unmatched-month pathway does not silently zero-fill or calculate a false delta.

## Production rollout review — in progress

Checkpoint `b1dae4e7` was created after the local verification. The authenticated production Analytics page was opened and switched to Durham Region with June 2026 selected for comparison. The initial selection state loaded normally; the final settled-page and endpoint checks remain pending in this record.

The first settled-page production review still displayed only the legacy Calls, Website Clicks, Directions, and Sessions rows. It did not show the new Organic Search rows or the Source status column. The GSC YoY feature is therefore not claimed as deployed yet; the next step is to inspect the deployed API contract and deployment state rather than change source data or infer a browser-only fault.

A cache-bypassed production call to `analytics.getYoYComparison` returned HTTP 200 but no `gsc` object, corroborating the stale interface. Live platform log retrieval reported that no Cloud Run service was found, so it could not distinguish an in-progress rollout from a platform routing issue. The local implementation, tests, and build remain unchanged; a documentation checkpoint will retry the automatic deployment rather than altering the data contract.

Checkpoint `ed01c056` was then saved to record the rollout evidence and retrigger automatic deployment. The platform subsequently reported a successful deployment. Durham Region was reselected on the primary production Analytics page; final settled-page and response-shape checks remain required before this record can mark the feature published.

The post-retry production API check succeeded: `analytics.getYoYComparison` returned HTTP 200 with a `gsc` object, `comparisonEligible = true`, and `source = persisted_territory_scoped_search_console` for Durham June 2026 vs June 2025. This confirms the new source-aware router has reached production. One final visual check of the table remains.

The matching published page still rendered the older four-row table and lacked the Source status column, despite the updated API response. A cache-bypassing browser reload produced the same result. This isolates the remaining verification issue to production client-bundle propagation or routing; it is not a source-data, scope, or backend-contract failure. No GSC data, scope registry, or client logic has been changed while investigating the discrepancy.

The production document continued to load `index-C_MSgjPR.js`; a no-store retrieval of that bundle contained neither `Organic Search Clicks` nor `Source status`. In contrast, the checkpointed local source and its current production build contain both labels and emit `index-Beo_TpRq.js`. The database-backed server route and client bundle are therefore on different deployment artifacts. The validated source is committed at `ed01c056`; the next operation is a documentation-only checkpoint to retrigger asset publication, not a change to the GSC feature.

The clean-build checkpoint `8bafbaab` corrected the static-client propagation. The live document now references `index-RTGO-mnp.js`, and a no-store check verified that this bundle contains both `Organic Search Clicks` and `Source status`. The remaining release gate is the human-visible Durham table review.

After selecting Durham Region, the corrected production bundle settled successfully: its normal GSC overview and trend data rendered, and the page retained the verified June 2026 versus June 2025 context. The lower-page matched-month table is being reviewed separately to confirm all newly added rows and their source labels.

The final production visual review passed. Durham Region’s June 2026 versus June 2025 detail table displayed the Source status column, three new Search Console rows (Organic Search Clicks, Organic Search Impressions, and Organic Search CTR), and the source label `Search Console — verified territory scope`. Each current/prior value and delta matched the eligible persisted comparison contract. The existing GBP rows retained neutral unavailable/not-comparable states where appropriate. No client error or fabricated zero appeared.
