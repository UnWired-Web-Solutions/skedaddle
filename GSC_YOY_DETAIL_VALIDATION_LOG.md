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
