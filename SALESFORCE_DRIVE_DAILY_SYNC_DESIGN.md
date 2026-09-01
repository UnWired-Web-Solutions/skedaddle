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

The approved daily refresh is a server job, not an AI task. A project-owned scheduled trigger will POST to `/api/scheduled/salesforce-workbook-refresh`. The handler must authenticate the schedule identity, locate the configured workbook source by the persisted schedule task UID, acquire an import lock, and return a 2xx skipped result for an unchanged source or already-running job.

The handler will read `Sheet1!A:N` in bounded row ranges through the read-only Sheets API. It will validate the header, every required ID, duplicate IDs, dates, numeric invoice values, exact territory labels, and exact status values while building aggregate records. It will not persist raw addresses or salesperson names.

Each run records source workbook ID, source sheet/range, source row count, maximum source `LastModifiedDate`, deterministic content fingerprint, expected/processed/rejected row counts, duplicate and blank-ID counts, unknown territory/status counts, run state, start/completion timestamps, and a redacted error message if the run fails.

The import uses staged records and a single database transaction. A failed validation or read leaves the previously successful portal dataset active. A new successful dataset becomes active only after all ranges are processed and reconciliation checks pass.

## Initial output policy

Until UWS confirms the ambiguous completed-like status definitions, the first daily release can safely publish descriptive aggregates such as record counts, exact status counts, invoice-row/revenue measures by mapped territory and source period, and species/city summaries. It must not publish a territory close rate, inspection-to-sale rate, or derived completed-job total from unconfirmed status semantics.

The daily run time should occur after the workbook's upstream refresh is normally complete. One observed modification time is not enough to establish that pattern, so the production schedule time remains pending until UWS confirms the expected source refresh window or several modification timestamps have been observed.

## Activation gates

1. New workbook source, import-run, and aggregate tables are created through a reviewed non-destructive migration.
2. Parser and aggregate tests cover header changes, duplicate IDs, malformed amounts/dates, unknown territories/statuses, mixed currency, future periods, and failed range reads.
3. A manual full read reconciles row count, unique IDs, exact status counts, exact territory counts, and source maximum modification time before scheduling.
4. Portal status and reports identify the data as a Google Drive Salesforce-derived workbook snapshot with source and import times.
5. A deployed schedule callback passes authentication, idempotency, lock, failure, and unchanged-source checks.
6. The first scheduled run is inspected before the workflow is considered active.

## References

[1]: https://docs.google.com/spreadsheets/d/1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ/edit "UWS Salesforce Data workbook"
[2]: https://drive.google.com/drive/folders/13JTaiAtXGY8q6bGzzEMdYwYnQw3LorIa "UWS Salesforce Data Sync folder"
