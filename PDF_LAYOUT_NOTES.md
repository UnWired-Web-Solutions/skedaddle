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
