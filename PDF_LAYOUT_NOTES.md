# PDF Layout Review — Ottawa Strategy Report (Aug 21, 2026)

## Pages 1-5 Review

### Page 1 (Cover)
- Clean cover page with Skedaddle branding, title, territory info
- Green left border accent
- Looks good

### Page 2 (Executive Summary + Current Campaign start)
- Executive Summary: 3 solid paragraphs — GOOD
- Section 02 starts at the bottom of the page with heading + table beginning
- The table gets CUT at the page break — rows continue on page 3
- ISSUE: Table split across pages

### Page 3 (Current Campaign table end + Species Analysis)
- Top of page continues the table from page 2 (no header row repeated)
- ISSUE: Table header not repeated on continuation page
- Section 03 starts mid-page with species revenue table
- Section 04 heading "Revenue by City — Top Markets" appears at VERY BOTTOM of page
- ISSUE: Section heading orphaned at bottom with no content following it

### Page 4 (Revenue by City table)
- Full revenue-by-city table — looks good
- Section 05 "Google Business Profile Performance" heading at bottom
- GBP table starts — again gets cut at page break

### Page 5 (GBP table continuation + Content Gap start)
- GBP table continues from page 4
- ISSUE: Table split across pages without header repeat
- Section 06 "Content Architecture Gap" starts mid-page — OK
- Content flows naturally here

## Issues to Fix
1. Tables split across page breaks without header row repetition
2. Section headings orphaned at bottom of pages (heading alone, content on next page)
3. Need `page-break-inside: avoid` on smaller tables
4. Need `page-break-after: avoid` on section headings
5. Need `thead { display: table-header-group }` for header repetition on multi-page tables

## Post-Fix Verification — Regenerated Ottawa Report (`ottawa_v3.pdf`)

### Pages 2-6 Review

| Page | Result |
|---|---|
| 2 | Executive Summary sits cleanly on its own page with no overflow issues. |
| 3 | Current Campaign table now fits on one page; no split. |
| 4 | Species Analysis and Revenue by City headings are no longer orphaned; Section 04 starts properly at top of page. |
| 5 | GBP Performance table fits fully on one page; no table continuation issue. |
| 6 | Following narrative section begins cleanly after the GBP table. |

### Verified Outcome

The specific pagination issues seen in the earlier version were resolved in the regenerated PDF:

1. No orphaned section headings in pages 2-6.
2. No split tables in pages 2-6.
3. Cleaner section starts with better page-level spacing.

Further review may still be needed for later pages, but the exact layout problems previously identified on pages 2-5 are fixed.

## Post-Codex Audit Workflow Verification — `ottawa_audited_update.pdf`

The report was generated through `strategyReport.preview`, saved as draft `bd11728b-ab78-4bb8-bf37-5528e451e1dc`, and exported through `strategyReport.exportPdf`. Pages 1–5 were visually inspected after the report-integrity merge and custom-auth repair.

| Page | Verified result |
|---|---|
| 1 | Cover displays the fixed initial-sales window `2025-07-01 through 2026-06-30` and separately identifies the available data sources. |
| 2 | Executive Summary is populated with four paragraphs; the prior blank-section failure is absent. |
| 3 | Current Campaign section and table fit cleanly on one page. |
| 4 | Sales & Species Analysis table and narrative fit cleanly on one page. |
| 5 | Revenue by City table and narrative fit cleanly on one page. |

No orphaned headings, split tables, or blank sections were observed in pages 1–5. The remaining pages must still be inspected before the complete PDF is declared visually verified.

## Mid-report visual review — `ottawa_audited_update.pdf` pages 6–10

| Page | Verified result |
|---|---|
| 6 | GBP / Search Console / GA4 evidence section renders cleanly; the table remains intact on one page and explicitly states GA4 is unavailable for the matched initial-sales window. |
| 7 | Top 25 Search Console Pages continues on a dedicated page without header/orphan issues. |
| 8 | Search Console Pages completes cleanly and Top 25 Search Terms begins cleanly on the same page. |
| 9 | Search Terms table finishes cleanly and Section 06 begins with full narrative content; no broken pagination observed. |
| 10 | Section 07 Proposed Program renders as a full narrative page with no truncation or overlap. |

The verified pages 6–10 remain content-complete and visually stable. One content nuance to remember: the report honestly marks GA4 as unavailable for the initial-sales matched window, which is correct because persisted GA4 coverage does not yet fill that historical period.

## Late-middle visual review — `ottawa_audited_update.pdf` pages 11–15

| Page | Verified result |
|---|---|
| 11 | Scale Comparison table renders clearly and does not split, though it leaves substantial white space because the section is intentionally short. |
| 12 | Website Content Architecture starts cleanly with no orphaned heading or overlap. |
| 13 | Content Architecture continues over a full text page with stable line spacing and no clipped text. |
| 14 | Content Architecture finishes cleanly and does not cut off at the page boundary. |
| 15 | Google Business Profile Strategy starts on a fresh page with intact paragraph flow and no overflow. |

Pages 11–15 remain visually stable. The main remaining check is the report tail (90-day plan, risks, recommendations, and final pagination) on the last four pages.

## Final visual review — `ottawa_audited_update.pdf` pages 16–19

| Page | Verified result |
|---|---|
| 16 | GBP Strategy narrative continues cleanly to the page end with no cut-off text, overlap, or widowed heading. |
| 17 | 90-Day Action Plan begins on a fresh page and the month-by-month bullets remain readable with intact spacing. |
| 18 | Delivery Dependencies and Mitigations table renders on one page with a repeated header row and no row splitting. |
| 19 | Summary of Recommendations closes the report cleanly on a single page with footer intact and no pagination defects. |

Full audited-report verification is complete. Across pages 1–19, no blank sections, orphaned headings, cut-off paragraphs, or split tables were observed in the regenerated draft-export workflow output.
