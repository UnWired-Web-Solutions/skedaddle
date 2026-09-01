# GA4 Territory Session-Ranking Reconciliation

## Purpose and boundary

This review resolves the outstanding questions about Ottawa, Denver, Hamilton, and Milwaukee by using only the durable Google Analytics 4 monthly aggregates and the approved territory-to-property mapping. It does not inspect page paths, visitor data, or any customer-level information. It does not change a displayed ranking because **no active session-ranking feature was found** in the current portal source.

> The active Network page is a currency-separated Drive-workbook operational aggregate summary. It is not a GA4 session ranking and must not be interpreted as one.

## Verified January–August 2026 GA4 aggregate inputs

| Territory | Mapped properties | Available durable period | 2026 sessions | 2026 priority-page sessions | Reconciliation conclusion |
|---|---:|---|---:|---:|---|
| Milwaukee | 2 | Jul 2023–Aug 2026 | 32,933 | 33,469 | Highest of the four reviewed territories. |
| Hamilton | 5 | Jul 2023–Aug 2026 | 17,305 | 18,203 | Below Milwaukee; its property count changed as properties became eligible. |
| Ottawa | 3 | Jul 2023–Aug 2026 | 11,830 | 12,982 | Present in current durable data; not missing. |
| Denver | 8 | Jan 2025–Aug 2026 | 2,155 | 2,164 | Present from the first verified eligible month; no pre-2025 value is inferred. |

Each stored territory-month in this review came from the direct GA4 Data API workflow after its eligible mapped-property coverage completed. No current source file calculates or presents a cross-territory session leaderboard. Accordingly, the prior Ottawa/DENVER “missing ranking” tasks were stale backlog statements from a superseded static-dashboard era, not current product defects.

## Coverage interpretation

Hamilton’s expected property count ranges from two to five across its historical window because the durable import uses verified property creation metadata. Denver begins in January 2025 because its mapped properties were not eligible before then; it is correctly **unavailable**, not zero, for earlier months. Comparing a single territory’s 2026 totals without matching the same source window or coverage context would be misleading.

The priority-page-session field can exceed total sessions because it is an intentionally separate page-classification aggregation, not a mutually exclusive partition of the territory total. It must not be added to total sessions or used as a second ranking denominator.

## Outcome

No mapping, importer, historical aggregate, ranking label, or report was changed by this review. The findings close the five duplicated ranking-investigation checklist items. Future territory comparisons must use the selected matched completed period, direct source coverage, and the appropriate metric definition rather than a stale static ranking.
