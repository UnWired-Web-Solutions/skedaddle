# Salesforce Drive Workbook Validation Log

## 2026-09-01 — Uncheckpointed legacy close-rate retirement

The authenticated development build of `/dashboard/hamilton` was rendered after a clean server restart. Its workbook query returned an active **partial** snapshot from the approved Google Drive workbook. The dashboard displayed workbook-backed work-order, invoice, species, and city aggregates with the partial-state disclosure and **48,477 explicit exclusions**. It displayed inspection, closed-job, close-rate, and network-conversion measures as unavailable and did not render the retired legacy conversion panel.

The development workbook status contract reported a configured source, an active partial run, and a successful fast unchanged-source scheduled check. The territory-performance contract returned `source = salesforce_drive_workbook`, 39 monthly aggregates, 20 species aggregates, 20 city aggregates, and `conversionMetric = unavailable_pending_status_definition`. No row-level source data, credentials, or customer information was displayed or recorded here.

The production domain still showed the prior dashboard version during this validation because the uncheckpointed code has not yet been published. Production verification must be repeated after a successful checkpoint and rollout.

## 2026-09-01 — Ottawa exact-draft PDF visual review (pages 1-10 of 14)

The exact Ottawa draft exported successfully to a 14-page Letter PDF. Pages 1 through 10 rendered without cut-off text, broken charts, or missing table structure.

Pages 1 through 2 remained readable and structurally sound. The cover page still labels the historical sales figures with legacy wording such as "Territory Revenue" and "Closed Jobs," which is a presentational issue to correct before delivery, but no conversion-rate claim was shown. The executive summary stayed within page bounds.

Pages 3 through 5 correctly relabelled the core sales sections as **Historical Sales Snapshot** and included the new disclosure that historical revenue, jobs, species, and city values are not current Google Drive workbook values. Those pages also explicitly stated that the current work-order feed is partial and that inspection, closed-job, and close-rate measures remain unavailable pending an approved status definition.

Pages 6 through 10 preserved the new **Work-Order Data Status** block, disclosed the approved workbook title and partial status, documented the 48,477 explicit exclusions, and omitted the retired inspection-to-sale table and network close-rate headings. Pagination remained stable across the digital-performance, Search Console, gap-analysis, and proposed-program sections.

Pages 11 through 14 also rendered cleanly. The recommendation section now correctly tells the operator to use verified work-order and invoice aggregates with matched-month digital evidence, and it does not reintroduce inspection or close-rate claims.

One issue remains before this report can be treated as complete: the opening summary pages still use legacy historical-sales labels such as "Territory Revenue" and "Closed Jobs" on the cover-style KPI treatment. Those labels are visually stable but semantically outdated relative to the approved workbook retirement. They should be revised and the PDF regenerated before the final checkpoint.

## 2026-09-01 — Ottawa exact-draft PDF visual review after cover-label correction (pages 1-5 of 14)

The regenerated Ottawa PDF corrected the cover metadata. Page 1 now reads **Historical Revenue Snapshot** and **Historical Jobs Snapshot**, and the data-source line now distinguishes the legacy historical sales snapshot from the current Google Drive workbook partial feed rather than naming Salesforce CRM.

Pages 2 through 5 remained visually stable after the wording correction. The executive summary stayed within the page boundary. Pages 3 and 4 still contain the intended historical-sales disclosure block, and the section headers now clearly label these as **Historical Sales Snapshot** pages. One remaining wording refinement is visible on page 4: the city table headers still use `Closed Revenue` and `Jobs`, which should be updated to historical wording for complete consistency.

## 2026-09-01 — Ottawa exact-draft PDF visual review after final label correction (pages 1-5 of 14)

The final regenerated Ottawa PDF now resolves the remaining city-table wording issue. Page 4 uses **Historical Revenue** and **Historical Jobs** in the table header, matching the section title and disclosure note.

Pages 1 through 5 of the final PDF are visually stable. The cover page correctly distinguishes the historical snapshot from the current Google Drive workbook partial feed, the executive summary fits on one page, and the historical species and city sections contain the approved disclosure that conversion metrics remain unavailable pending an approved status definition.

Pages 6 through 10 of the final PDF also reviewed cleanly. The **Work-Order Data Status** block correctly identifies the source as the approved Google Drive workbook, marks the active import as partial, and documents that **221,635** rows were included while **48,477** were explicitly excluded from canonical territory aggregates. No inspection-to-sale table or network close-rate heading appears.

Pagination and readability remained acceptable across the matched-month YoY section, the Search Console tables, the gap analysis, and the proposed-program narrative. The report continues to state that no complete-month GA4 page import is available for Ottawa, so GA4 page claims are intentionally omitted rather than estimated.

Pages 11 through 14 are also visually stable overall, and the recommendation section preserves the approved wording about verified work-order and invoice aggregates while keeping conversion metrics unavailable. However, page 12 exposed one remaining text defect in the 90-day plan: the first Month 1 bullet begins with a leading comma and missing role text (`", and Salesforce coverage — produce an approved baseline"`). This must be corrected before the report can be treated as fully verified.

## 2026-09-01 — Ottawa exact-draft PDF visual review after 90-day-plan parser correction (pages 1-5 of 14)

The parser-corrected final Ottawa PDF preserves the previously verified first-half layout. The cover page still correctly distinguishes the historical sales snapshot from the current Google Drive workbook partial feed, and pages 2 through 5 remain readable with the updated historical headings and explicit conversion-unavailability disclosure.

Pages 6 through 10 of the parser-corrected final PDF remain stable. The **Work-Order Data Status** panel still shows the approved workbook provenance, partial status, 221,635 included rows, and 48,477 explicit exclusions. The matched-month YoY section remains bounded to Apr–Jun, the Search Console tables are intact, and no retired close-rate or inspection-to-sale table reappears.

Pages 11 through 14 of the parser-corrected final PDF complete the review successfully. The Month 1 action-plan bullet now reads in full, including `Analytics owner — verify GA4, Search Console, GBP, and Salesforce coverage — produce an approved baseline`, so the parsing defect is resolved. The mitigation table is readable, and recommendation 8 preserves the approved rule to use verified work-order and invoice aggregates while keeping conversion metrics unavailable until lead and job status definitions are approved.

Conclusion for the final exact Ottawa PDF: all 14 pages were visually reviewed after the parser correction, and no pagination overflow, retired close-rate tables, or false conversion claims remain.

## 2026-09-01 — Post-checkpoint production rollout check

Checkpoint `e08d9b68` was saved with auto-publish enabled. The immediate production check at `/dashboard/hamilton`, including a cache-busting query parameter, still served the prior dashboard artifact with the retired **Inspection-to-Sale Performance** panel and network close-rate values. A direct cache-busting production request to the retired `analytics.getTerritoryCloseRate` route also returned HTTP 200. This is a rollout/stale-artifact observation, not a successful production verification. Production must continue to be checked until the published route returns the new workbook contract and the dashboard/UI reflect it.

After a further 30-second wait, the custom production domain continued to return the same prior artifact. The alternate configured production domain also authenticated successfully but served the same prior home-page artifact. Production runtime logs were unavailable because the platform reported that no Cloud Run service exists. The release remains checkpointed locally but must not be described as live until the deployed artifact changes.

The platform subsequently confirmed deployment success. A fresh authenticated, cache-bypassed production render of `/dashboard/hamilton` then showed the Google Drive workbook-backed interface with an active **partial** snapshot, **48,477** explicit exclusions, source-labelled invoice/work-order/species/city aggregates, and explicit inspection/closed-job/close-rate/network-benchmark unavailability.

A direct production endpoint check returned `source = salesforce_drive_workbook`, active status `partial`, 39 monthly aggregates, 20 species aggregates, 20 city aggregates, and `conversionMetric = unavailable_pending_status_definition`. The retired `analytics.getTerritoryCloseRate` route returned HTTP **404**, confirming the old active route is no longer present in production.

The authenticated production Analytics page also rendered its workbook provenance card after the rollout. It identified `Salesforce Data · Sheet1`, marked the active snapshot partial, showed 221,635 included and 48,477 explicitly excluded source rows, and stated that unchanged revisions are checked by a daily read-only refresh. It remained separate from the retained GBP, GA4, and Search Console disclosures and did not expose raw work-order, address, postal-code, salesperson, or lead-source data.

## 2026-09-01 — Natural changed-revision production import

The pending changed-revision test was satisfied without editing the approved workbook. The existing enabled daily job `Z6dZYQPbtPVyjCJxhFrwQ3` recorded a successful scheduled callback at 19:19:40 UTC. Its low-memory bounded-range path completed in **26.745 seconds**, activated partial import run `930004`, and recorded 270,272 source rows, 221,748 processed rows, and 48,524 explicit rejections. The audit record had no blank IDs, duplicate IDs, or error message.

The source is now unlocked and has no last-error state. Its active run is `930004`; current Drive revision metadata checks continue to skip safely when the active content is unchanged. A canonical aggregate reconciliation confirmed 221,748 work orders at the `__ALL__` status/species/city rollup, equal to the processed-row count, with zero negative count rows. The separate CAD and USD aggregate groups remain intact. No source rows, customer information, credentials, or additional schedule were used or created.
