# Skedaddle Product Contract

Last updated: 2026-09-03

## Product purpose and users

Skedaddle Franchise Intelligence replaces the manual DashThis-style reporting process with trustworthy territory-level sales and digital-performance evidence. Ay operates the system; Dave reviews the results and uses the initial sales report to decide what each franchise territory should do next.

The source meeting notes are maintained in [Chat About The Week Ahead](https://docs.google.com/document/d/1g9wSor6HDvkD4HgmH45TD73PyVDoAmNfrc0s0VIweYk/edit). This file is the implementation contract. When the notes and this file differ, pause and resolve the decision here before coding.

## Current priority

The initial sales strategy report is the first deliverable. It must combine:

- source-qualified work-order counts and recorded pre-tax invoice values from the approved UWS Drive workbook;
- an explicit statement that inspections, closed jobs, leads, conversions, territory close rate, and network close-rate benchmarks are unavailable until UWS approves a status definition;
- an explicit year-over-year comparison over matched months;
- matched-period recorded invoice values and work orders by species and city; city results inform an audit but do not prove a suburb-page opportunity;
- Google Business Profile performance and territory-specific monthly post recommendations;
- GA4 sessions and priority-page sessions imported from the territory property map;
- Search Console clicks, impressions, top 25 pages, and top 25 search terms from the main domain property filtered to approved territory paths;
- a phased deployment recommendation: suburb hubs first, then species-by-suburb pages only when approved.

The quarterly post-sale performance report is later scope. Suburb-page generation is an administrator-only, review-only workflow; publishing and direct WordPress mutation remain outside the approved scope.

## Reporting truth rules

The UWS-owned Google Drive workbook is the active Salesforce-derived source. It is read-only at source, imported daily, aggregate-only in portal responses, currency-separated, and may be partial. Accepted rows are never silently combined with rejected rows, and workbook values are never called live Salesforce API data.

The initial strategy report and proposal use 2025-07-01 through 2026-06-30 across workbook, GA4, Search Console, and GBP evidence. They prefer active workbook aggregates for that exact window. The legacy sales snapshot is allowed only as a visibly labelled fallback when matched-period workbook aggregates are unavailable. Every report displays the period, source status, and generated timestamp.

Territory dashboards and network rankings use one common rolling window: the latest 12 completed UTC calendar months. Totals, species, cities, and every territory in a network ranking use that identical window. Current and future months are excluded. Network ranks restart by currency; CAD and USD are never compared.

Only complete GA4 import months belong in headline totals, top-page rankings, comparisons, or AI context. Partial months must be shown separately with the expected/succeeded property counts. Missing data is “unavailable,” never zero.

Google Business Profile raw rows retain Google's metric enums, while reporting maps them to the portal's established metric keys. A live period replaces its equivalent legacy metric only after that canonical mapping. A location with an empty response is not counted as successfully covered, and a store code alone can never authorize a territory assignment because Google guarantees store-code uniqueness only within an account.

Year-over-year values use only months present in both the current and previous-year periods. The report must state the matched months. If there are no comparable months, it must say that YoY is unavailable.

A dedicated suburb hub is confirmed only by a dedicated location-page URL whose final path segment matches the suburb. Blog posts and species-by-suburb URLs do not prove that a hub exists. Curated audit results may override measured evidence when their source is documented.

Claims such as schema coverage, listing optimization, citation tracking, rank tracking, or an “active” campaign require a confirmed input or audit. Otherwise the report says “not audited” or “not provided.”

## Output and review contract

There are three distinct outputs:

1. Initial Sales Strategy Report — the current priority and complete decision document.
2. Monthly Trigger Brief — a short internal action prompt based on the latest territory-specific common analytics period; it is not the quarterly performance report.
3. Commercial Proposal — approved pricing and explicitly entered scope only. Recommendations must not be presented as purchased deliverables.

Previewing a strategy report or proposal creates a persistent draft containing the configuration, source period, data snapshot, generated sections, exact HTML, creator, and timestamps. Export accepts a draft ID and renders that saved HTML. It never trusts browser-submitted HTML or silently regenerates AI copy.

Generation must remain useful when an AI provider is unavailable: each narrative section has a deterministic, data-grounded fallback. Placeholder copy blocks preview and export. AI text is HTML-escaped before insertion.

## Acceptance checks

- Report cover and evidence sections show 2025-07-01 through 2026-06-30 and identify the Salesforce-derived Google Drive workbook, GA4, Search Console, and GBP sources separately.
- Headline GA4 totals exclude partial imports and show a visible coverage warning when partial data exists.
- The report includes matched-month digital YoY, the top 25 pages, and the top 25 queries when those sources are available. Close rate remains explicitly unavailable pending an approved status definition.
- No fallback contains “please regenerate” or “will be populated.”
- Proposal scope matches the operator’s explicit scope notes; pricing tiers are non-zero and non-decreasing.
- `/report/:id` does not display the obsolete hard-coded July 2026 static report.
- Successful local login creates a signed, HTTP-only server session. Browser `sessionStorage` cannot establish identity or role. Anonymous callers cannot read portal analytics or trigger generators; franchise sessions can read only their configured territory; network commercial summaries, imports, reports, proposals, suburb content, GBP image generation, and review mutations require an administrator session.
- A clean migration-chain check rejects duplicate column additions and indexes dropped before creation.
- The exact reviewed draft is the artifact exported to PDF.
