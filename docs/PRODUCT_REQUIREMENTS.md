# Skedaddle Product Contract

Last updated: 2026-08-21

## Product purpose and users

Skedaddle Franchise Intelligence replaces the manual DashThis-style reporting process with trustworthy territory-level sales and digital-performance evidence. Ay operates the system; Dave reviews the results and uses the initial sales report to decide what each franchise territory should do next.

The source meeting notes are maintained in [Chat About The Week Ahead](https://docs.google.com/document/d/1g9wSor6HDvkD4HgmH45TD73PyVDoAmNfrc0s0VIweYk/edit). This file is the implementation contract. When the notes and this file differ, pause and resolve the decision here before coding.

## Current priority

The initial sales strategy report is the first deliverable. It must combine:

- Salesforce revenue, jobs, inspections, closed jobs, territory close rate, and network close-rate benchmark;
- an explicit year-over-year comparison over matched months;
- revenue by species and by target suburb;
- Google Business Profile performance and territory-specific monthly post recommendations;
- GA4 sessions and priority-page sessions imported from the territory property map;
- Search Console clicks, impressions, top 25 pages, and top 25 search terms from the main domain property filtered to approved territory paths;
- a phased deployment recommendation: suburb hubs first, then species-by-suburb pages only when approved.

The quarterly post-sale performance report is later scope. Suburb-page generation is paused indefinitely and must not be expanded through reporting work.

## Reporting truth rules

The current Salesforce snapshot covers 2025-07-01 through 2026-06-30. Until Salesforce data becomes selectable and durable, digital totals shown beside it must use that same window. Every report must display the period and an as-of/generated timestamp.

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

- Report cover and evidence sections show 2025-07-01 through 2026-06-30 and identify Salesforce, GA4, Search Console, and GBP sources separately.
- Headline GA4 totals exclude partial imports and show a visible coverage warning when partial data exists.
- The report includes matched-month YoY, close rate, the top 25 pages, and the top 25 queries when those sources are available.
- No fallback contains “please regenerate” or “will be populated.”
- Proposal scope matches the operator’s explicit scope notes; pricing tiers are non-zero and non-decreasing.
- `/report/:id` does not display the obsolete hard-coded July 2026 static report.
- Report and proposal procedures remain compatible with the portal's custom local admin gate. They use `publicProcedure` until server-backed local authentication replaces `AuthContext`; using Manus OAuth procedures causes the verified `10001`/`10002` failures.
- The exact reviewed draft is the artifact exported to PDF.
