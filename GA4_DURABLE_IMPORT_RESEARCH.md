# GA4 Durable Import Research

## Official Data API constraints

Google’s `properties.runReport` endpoint accepts an `offset` for paging and a positive `limit`. The service returns at most **250,000 rows per request**, even when a higher limit is requested. A complete page-level importer must therefore use deterministic pagination rather than assume one response is exhaustive. [1]

Core Reporting requests consume property and project-per-property token quotas. Google states that token cost depends on requested row count, dimensions, metrics, filters, date range, cardinality, and event volume. Standard properties permit 10 concurrent core requests per property, while the project-per-property quota is 14,000 core tokens per hour; responses can include `returnPropertyQuota` to expose the remaining quota state. A conservative, bounded worker pool and quota-aware audit are therefore required for the historical backfill. [2]

The GA4 Admin API `properties.get` endpoint returns a property resource containing its output-only RFC 3339 `createTime`; Google documents that the read-only Analytics scope is sufficient for this call. The durable importer can therefore determine whether a mapped property existed in a reporting month without guessing from an empty Data API response. [3]

## Implication for this portal

The historical import must use only explicitly mapped GA4 properties, completed calendar months, deterministic page pagination, and visible per-territory coverage. It must never treat missing rows as zero traffic or claim full coverage when one or more assigned properties fail. No user-level, demographic, or interest dimensions are required or permitted for this workflow.

## Implemented Durable-Import Controls

The implementation now persists read-only property creation and deletion metadata for all mapped properties before it imports historical months. Each reporting month queries only properties that were alive during that month. A month with no eligible property remains **unavailable** and is not represented by a zero-valued durable snapshot.

The page-path reader requests deterministic 25,000-row windows, advancing its offset until the API’s declared row count or final short page is reached. A later partial property fetch produces a partial audit run but retains any prior complete current snapshot; the audit field `snapshotApplied = 0` distinguishes the non-applied attempt. The UI reports the reporting-period latest attempt and active durable snapshot separately.

The verified historical range is July 2023 through August 2026. Details of the aggregate result, safety checks, and public read-contract check are recorded in `GA4_DURABLE_IMPORT_VALIDATION_LOG.md`.

## Page-Performance Metric Scope (September 1, 2026)

The GA4 Data API supports page reporting and standard engagement metrics, including sessions, active users, engaged sessions, engagement rate, and user engagement duration. A read-only completed-August 2026 compatibility check succeeded for every mapped property in both Hamilton (5/5) and Durham Region (10/10). This confirms those standard metrics may be requested alongside `pagePath` for the current direct reporting view; it does not retroactively make historical monthly snapshots engagement-complete.

Key events remain a separate governance question. Google defines a key event as a significant property action, and its definition includes an event name, custom/default status, and a counting method that can be once per event or once per session.[4] The Admin API inventory completed for all 19 territories: 17 have consistent key-event definition sets across their mapped properties, while 2 do not. Every territory has one or more configured definition, but a raw `keyEvents` total would still aggregate potentially different configured actions. The portal must therefore display key events as **unavailable pending network-wide approved event-definition governance**, not as leads, conversions, or a comparable territory KPI.

The key-event inventory used only the read-only `properties.keyEvents.list` endpoint and redacted property identifiers and event names from operator output. Google documents that this list endpoint supports the `analytics.readonly` scope and pages its definitions with `nextPageToken`.[5]

## References

[1]: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport "Google Analytics Data API: properties.runReport"
[2]: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas "Google Analytics Data API limits and quotas"
[3]: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/get "Google Analytics Admin API: properties.get"
[4]: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents "Google Analytics Admin API: KeyEvent resource"
[5]: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents/list "Google Analytics Admin API: properties.keyEvents.list"
