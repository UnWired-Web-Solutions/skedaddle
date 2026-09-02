# GA4 Durable Import Validation Log

## 2026-09-01 — Historical Backfill Execution

The direct GA4 historical backfill was run through the controlled sequential operator from **July 2023 through August 2026**, the earliest full month through the latest completed UTC month supported by the verified mapped-property lifecycle metadata. All 19 canonical territories were considered for every month.

| Check | Verified outcome |
|---|---:|
| Mapped GA4 properties with lifecycle metadata | 103 |
| Durable direct territory-month snapshots | 599 |
| Direct-data territories represented | 19 |
| Backfill import attempts recorded as complete | 619 |
| Durable partial coverage rows | 0 |
| Durable month rows with negative metric values | 0 |
| Stored page rows with negative metrics | 0 |
| Explicit unavailable territory-months | 123 |

The 123 unavailable territory-months were not persisted as zero traffic. They occurred where no mapped GA4 property had yet been created for the reporting month. The importer therefore did not call the Data API for those periods and did not present them as complete coverage.

The durable snapshot contains 70 rows for 2023, 167 for 2024, 213 for 2025, and 149 for January–August 2026. All persisted direct rows had at least one expected property and complete expected-versus-succeeded coverage. The audit records contain no partial or failed fetch runs for this backfill. The 619 audit-run count includes the initial Hamilton August 2026 pilot and its subsequent idempotent all-territory execution; the durable snapshot table correctly contains one current row per territory and month.

## 2026-09-01 — Published Read-Contract Check

The published Hamilton GA4 trend contract was read for 2023–2026 without returning page paths or metric values. It returned 106 chart rows: 81 direct persisted-data rows, each marked complete, and 25 legacy-spreadsheet rows for periods not covered by a direct snapshot. For the August 2026 versus August 2025 comparison, the current period returned 5 expected and 5 succeeded properties; the prior period returned 4 expected and 4 succeeded properties. This confirms that the matching-month comparison exposes source coverage rather than assuming uniform property populations over time.

## Safety Controls Validated

The importer now pages high-cardinality `pagePath` reports deterministically at 25,000 rows per request. A later partial property fetch cannot overwrite an already complete durable month; it is audited with `snapshotApplied = 0` while the existing complete snapshot remains active. The GA4 property creation-time lookup is read-only and must complete for every mapped property before it refreshes the metadata table. These controls follow the official API pagination, quota, and property-lifecycle documentation recorded in `GA4_DURABLE_IMPORT_RESEARCH.md`.

## 2026-09-01 — First Post-Checkpoint UI Check

Checkpoint `cdcf3082` was created after local validation. The first production Analytics check completed its data requests, but the rendered GA4 status panel still said `Latest persisted import: December 2024 · 4/4 properties · complete`. This is the pre-fix wording and period, not the expected active August 2026 snapshot. The chart itself rendered the new backfilled 2025–2026 points. Production API/version investigation remains required before the release can be described as fully verified.

A cache-bypassed production call to `analytics.getGA4ImportStatus` returned the old flat response shape (`year`, `month`, and `status`) and no `activeSnapshot` or `latestAttempt` keys. It returned 2024-12, matching the stale UI label. The configured static version path did not expose a deployment version marker and instead fell through to the application HTML shell. This confirms that the issue is deployment propagation or routing, rather than a browser-only render defect in the checkpointed local implementation.

The alternate configured production domain was checked after its data requests settled and showed the same old flat GA4 response/UI label. Both configured domains therefore remained behind checkpoint `cdcf3082`; no published-interface verification is claimed yet.

## 2026-09-01 — Successful Published UI Verification

The follow-up deployment checkpoint `efb8a190` completed successfully. The authenticated primary production Analytics page then rendered **Active persisted import: August 2026 · 5/5 properties · complete** for Hamilton. Its GA4 2025–2026 chart rendered normally and no client-side status-contract failure appeared. This confirms the published frontend consumes the deployed `activeSnapshot` contract rather than the stale import-time ordering.

The retained-complete-snapshot notice is intentionally conditional: it appears only if an audited latest attempt differs from the active snapshot. No synthetic partial production fetch was created merely to force that state. Importer regression coverage verifies the retention decision, while the successful complete snapshot remains the active production case.

## 2026-09-02 — Durable Page Engagement Backfill

Two nullable page-snapshot fields were added for direct GA4 `engagedSessions` and recorded engagement duration. Existing historical rows were deliberately left nullable until they were read again from the source; no historic engagement value was inferred or zero-filled. Migration `0016_ambiguous_midnight.sql` adds only those nullable fields.

The controlled sequential backfill then reimported every property-supported territory-month from July 2023 through August 2026. Each cohort completed with zero partial and zero failed imports. Across the resulting complete snapshots, 544 snapshots with returned page rows have populated direct engagement values; 55 complete snapshots had no returned page rows and remain unavailable through the read contract rather than being represented as zero-engagement pages. The aggregate reconciliation found zero complete snapshots with missing engagement values among returned page rows and zero negative engagement values.

Hamilton August 2026 was verified through the public local contract and authenticated local Analytics view: the persisted source is labelled `persisted_completed_month_ga4_engagement`, property coverage is 5/5 complete, and key-event counts remain `unavailable_pending_network_key_event_definition`. A September 2026 query correctly returned unavailable because there is no persisted completed-month snapshot. The interface separates this completed-month evidence from the existing direct year-to-date query.

## 2026-09-02 — Regression Runner Determinism

The first full suite after the engagement change exposed three 15-second strategy-report timeouts only when the default multi-worker run competed for shared database capacity. The Milwaukee report test passed alone in approximately five seconds, and the full strategy-report file passed in isolation. Running all tests with one worker passed 179 tests with 11 intentional skips, confirming resource contention rather than a report-data defect. The standard `pnpm test` command now explicitly uses one minimum and maximum worker so release verification remains deterministic.

## 2026-09-02 — Initial Published Contract Check

Checkpoint `eb850998` was created after local contract and authenticated local UI verification. The first production Analytics review selected Hamilton August 2026 and displayed the previously deployed direct GA4 table but no persisted completed-month engagement section. A redacted production call to `analytics.getGA4DurablePageEngagement` returned HTTP 404. The issue is therefore a delayed/stale production server artifact, not a rendered-table-only defect. No source data, mapping, migration, schedule, or backfill result was changed while recording this rollout evidence.

## 2026-09-02 — Successful Published Engagement Verification

The rollout-evidence checkpoint `dd030acd` propagated the updated client and server artifacts. The authenticated production Hamilton Analytics view for August 2026 rendered the separate **Persisted GA4: Completed-Month Engagement** table, stated that it is displayed only when every mapped property is covered, and showed the explicit key-event governance limitation. The rendered coverage is 5/5 properties.

A redacted production contract check returned HTTP 200, `available: true`, source `persisted_completed_month_ga4_engagement`, and 25 bounded page rows; no page paths or engagement values were included in the check. The production verification is complete. The retained-snapshot notice remains deliberately unobserved until a genuine later partial source attempt occurs.
