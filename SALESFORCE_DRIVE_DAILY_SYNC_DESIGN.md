# Salesforce Drive Workbook Daily Sync Design

**Approved direction:** Use the UWS-owned Google Drive workbook as the Salesforce-derived portal source. Do not use a Salesforce Connected App, Salesforce OAuth, SOQL, or `jsforce`.

## Verified source

| Field | Verified value |
|---|---|
| Workbook | [Salesforce Data](https://docs.google.com/spreadsheets/d/1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ/edit) |
| Owner | UWS Google Workspace account |
| MIME type | Google Sheets workbook |
| Source sheet/range | `Sheet1!A:N` |
| Drive version at review | 125 |
| Drive modified time at review | `2026-09-01T15:11:50.582Z` |
| Actual populated rows | 270,070 data rows plus one header row |
| Work-order ID check | No blank IDs and no duplicate ID values |
| Server access | Existing read-only Google service identity verified through the Sheets API |

The Google Sheets API was enabled in `uws-gbp-analytics` with explicit user approval. The service identity then returned the exact workbook title, source sheet, and header contract. This access is read-only and does not modify the workbook.

The Google Drive API was also enabled in `uws-gbp-analytics` with explicit user approval after the service identity’s metadata preflight returned Google reason `accessNotConfigured`. It will be used only to read the workbook’s ID, title, MIME type, version, modified time, and trashed state before deciding whether the larger Sheets download is required. It does not change the workbook, its sharing, or its data.

## Current 14-field contract

`Id`, `Status`, `SchedStartTime`, `LastModifiedDate`, `CreatedDate`, `Street`, `City`, `PostalCode`, `Work_Type__c`, `Reporting_Primary_Territory__c`, `Contact.Account.Lead_Source__c`, `salesperson_new__c`, `Species__c`, and `Invoice_pre_tax_amount__c`.

The daily importer must reject a changed or incomplete header contract before writing aggregates. Street addresses and salesperson names are sensitive operational data. They are used only when an explicitly approved aggregate requires them; raw customer/staff values must not appear in portal responses, reports, logs, or import-error messages.

The first full service-identity validation returned 270,112 source rows. It processed 221,635 mapped and periodized rows and explicitly rejected 48,477 rows: 46,167 blank-territory rows, 2,016 review-required Victoria rows, one excluded Birmingham row, and 293 otherwise eligible rows with no scheduled period. The source had zero blank IDs, zero duplicate IDs, no unknown status values, and a maximum source `LastModifiedDate` of `2026-09-01T15:52:46.000Z`. A successful activation with any rejected rows is recorded as `partial`, not `complete`.

## Verified source labels

The current workbook contains 20 distinct nonblank primary-territory labels. Nineteen labels correspond to current operating labels in the source; `Birmingham` appears once and is outside the active portal mapping. `Victoria` has 2,016 rows but is not automatically assigned to Okanagan by the Salesforce importer merely because another analytics source groups it there. `Barrie / York Region` has no directly named source label in the current workbook. Both cases remain review-required until UWS approves an explicit Salesforce-workbook mapping.

The source contains 16 exact status values. `Completed` is unambiguous. `Compl.DoJobsche.duringPA`, `Compl.DoJobsche.afterPA`, and `Completed - Do Job scheduled after PA date` remain business-definition pending and cannot be counted as completed/closed work until confirmed. The importer may preserve and count exact statuses, but must not convert them into a close rate or closed-job total by inference.

The workbook contains Canadian and United States territories but has no currency column. The importer must preserve revenue by explicitly mapped territory/country currency. It must never sum CAD and USD into a single network revenue figure. Unknown and review-required territory rows may be counted in an import audit but must not enter a canonical territory aggregate.

## Daily deterministic execution

The approved daily refresh is a server job, not an AI task. The enabled project-owned Heartbeat `Z6dZYQPbtPVyjCJxhFrwQ3` runs at `0 0 19 * * *` UTC, which is **3:00 PM Eastern** during daylight saving time. It POSTs to `/api/scheduled/salesforce-workbook-refresh`; the handler authenticates the schedule identity, finds the workbook configuration by its persisted task UID, acquires an import lock, and returns a 2xx skipped result for an unchanged source or an already-running job.

Before reading the large sheet, the handler uses the read-only Drive API to validate workbook ID, title, MIME type, version, modification time, and non-trashed state. An unchanged verified revision skips the full source download. Changed revisions are read as bounded 50,000-row `Sheet1!A:N` ranges and fed directly to the stateful parser, so the server does not retain the full raw workbook in its heap.

The parser validates the header, every required ID, duplicate IDs, dates, numeric invoice values, exact territory labels, and exact status values while building aggregates. It does not persist raw addresses, work-order IDs, postal codes, lead source, or salesperson names.

Each run records source workbook identity and Drive revision, source sheet/range, source row count, maximum source `LastModifiedDate`, deterministic content fingerprint, expected/processed/rejected row counts, duplicate and blank-ID counts, unknown territory/status counts, run state, start/completion timestamps, and a redacted error message if the run fails.

The import uses staged records and a single database transaction. A failed validation, read, or write leaves the previously successful portal dataset active. A new successful dataset becomes active only after all ranges are processed and reconciliation checks pass. A stale lock older than fifteen minutes is recovered by marking its prior unfinished audit row failed with a redacted execution-window message before a new run proceeds.

## Initial output policy

Until UWS confirms the ambiguous completed-like status definitions, the first daily release can safely publish descriptive aggregates such as record counts, exact status counts, invoice-row/revenue measures by mapped territory and source period, and species/city summaries. It must not publish a territory close rate, inspection-to-sale rate, or derived completed-job total from unconfirmed status semantics.

The selected 3:00 PM Eastern refresh follows the observed source update window and will be reviewed after further workbook revisions are observed. The current visible Drive revision was timestamped `2026-09-01T15:57:16.897Z` (11:57 AM Eastern), giving the selected run more than three hours for that observed update to settle. Drive retained only the current revision in this view, so this is a cautious operational window rather than a claimed historical export cadence. The final authenticated production schedule test completed on September 1, 2026 in **1.557 seconds** as an `unchanged_revision` skip against Drive version 133. It did not download or replace the active aggregate snapshot.

## Activation gates

1. New workbook source, import-run, and aggregate tables are created through a reviewed non-destructive migration.
2. Parser and aggregate tests cover header changes, duplicate IDs, malformed amounts/dates, unknown territories/statuses, mixed currency, future periods, and failed range reads.
3. A manual full read reconciles row count, unique IDs, exact status counts, exact territory counts, and source maximum modification time before scheduling.
4. Portal status and reports identify the data as a Google Drive Salesforce-derived workbook snapshot with source and import times.
5. A deployed schedule callback passes authentication, idempotency, lock, failure, and unchanged-source checks.
6. The first scheduled run is inspected before the workflow is considered active. **Completed:** the production job returned HTTP 200 with the redacted `unchanged_revision` result in 1.557 seconds and the next run remains scheduled for 19:00 UTC.

## Pending production UI verification

The authenticated Analytics page was opened on production after checkpoint `b553888b`. An initial cached page load showed the prior source description, but a cache-bypassed status endpoint returned the active-run contract and a clean subsequent production load rendered the workbook provenance card correctly. The card identified `Salesforce Data · Sheet1`, labelled the active snapshot `partial`, showed **221,635** included and **48,477** explicitly excluded rows, and confirmed daily read-only refresh. It did not expose raw work-order IDs, addresses, postal codes, salesperson names, or lead-source fields. The browser console showed no runtime errors.

## Dashboard and strategy-report provenance retirement — local verification

The active territory dashboard now reads only the public, read-only `salesforceWorkbook.getTerritoryPerformance` contract for Salesforce-derived operational aggregates. The response identifies `salesforce_drive_workbook`, exposes the active partial-run metadata and bounded monthly, species, and city aggregates, and returns `unavailable_pending_status_definition` for conversion. The dashboard presents work orders, recorded pre-tax invoice-value context, species, and city aggregates with source labels; it displays inspection definition, closed-job definition, close rate, and network conversion as unavailable. Aggregate rows are formatted with their own verified currency code, so a row cannot inherit another currency’s label.

The historical `salesforcePerformanceSnapshots` table remains as retained history but is no longer queried by the active analytics router, dashboard, or strategy-report conversion path. The former `analytics.getTerritoryCloseRate` procedure was removed. Existing historical revenue, job, species, and city material in strategy reports remains explicitly labelled **Historical Sales Snapshot** and cannot be described as current Google Drive workbook data.

An exact fresh Ottawa strategy-report draft was generated and exported without regenerating content during PDF export. The final 14-page Letter PDF was visually reviewed page by page. It distinguishes the legacy historical snapshot from the current Drive workbook partial feed, includes the `Work-Order Data Status` disclosure with **221,635** included and **48,477** explicitly excluded rows, and omits the retired inspection-to-sale and network close-rate tables. A parser defect that incorrectly split a 90-day-plan task at an ordinary `GBP` mention was reproduced in the export, fixed with line-start category parsing, and protected by a regression test before the final PDF review.

Local release verification after the final parser correction passed TypeScript, **164** Vitest tests with **11** intentional skips, the production build, `git diff --check`, direct active-run and Hamilton territory-performance endpoint checks, authenticated Hamilton dashboard review, fresh Ottawa draft generation, and exact-PDF visual inspection. The uncheckpointed release still requires post-checkpoint production endpoint and authenticated UI verification.

Post-checkpoint production verification completed after checkpoint `e08d9b68` rolled out. The authenticated Hamilton dashboard rendered the workbook-backed partial interface rather than the retired inspection-to-sale panel. The production territory-performance response returned `source = salesforce_drive_workbook`, status `partial`, 39 monthly, 20 species, and 20 city aggregates, and `unavailable_pending_status_definition`; the retired `analytics.getTerritoryCloseRate` route returned HTTP 404. The authenticated Analytics page rendered the workbook provenance card with its partial coverage disclosure and no raw source fields. Canonical GitHub `main` was normally pushed and its full hash matched `e08d9b68bcdd35ab9d07fc4327e43a20345bd0d2`.

## Changed-revision production-import verification

The low-memory changed-revision branch is now verified in production without modifying the source workbook for test purposes. A natural Drive revision triggered scheduled import run `930004` at 19:19:40 UTC on September 1, 2026. The callback completed successfully in 26.745 seconds, below the two-minute execution limit, and atomically activated a `partial` snapshot at 19:20:01 UTC. It audited 270,272 source rows, processed 221,748 canonical-territory rows, and explicitly rejected 48,524 rows. The run contained no reported error, blank ID, or duplicate ID.

The active source row subsequently showed no import lock, no last error, `lastSuccessfulRunId = 930004`, and the expected daily 19:00 UTC schedule remained enabled. Later Drive metadata revisions were safely preflighted and recorded as skipped when no new active snapshot was warranted. No schedule was created, modified, paused, or duplicated during this verification.

Aggregate safety was checked only at the privacy-conscious aggregate layer. At the canonical `__ALL__` status/species/city grain, the aggregate work-order count reconciled exactly to the run’s 221,748 processed rows and no aggregate had a negative count. CAD and USD were stored and queried separately. The parser deliberately stores four independent roll-up projections (overall, status, species, and city), so summing *all* aggregate rows would correctly overcount the underlying work orders and must not be used as a reconciliation method. Signed invoice pre-tax amounts remain preserved as source values, including any source credit adjustments; they are not treated as negative work-order counts or inferred business statuses.

## References

[1]: https://docs.google.com/spreadsheets/d/1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ/edit "UWS Salesforce Data workbook"
[2]: https://drive.google.com/drive/folders/13JTaiAtXGY8q6bGzzEMdYwYnQw3LorIa "UWS Salesforce Data Sync folder"
