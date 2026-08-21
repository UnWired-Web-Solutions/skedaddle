# Google Analytics 4 Access Status

## Date: Aug 21, 2026
## Status: CONNECTED; DURABLE IMPORT READY FOR MIGRATION/BACKFILL

## Account: uws@unwiredwebsolutions.com

### Access Summary

- **GA4 Account:** Skedaddle Wildlife (39401450)
- **Account properties discovered:** 129
- **Portal territory assignment:** 103 unique sub-location properties assigned to 19 canonical franchise territories
- **Control property:** 1 corporate/network property (`308369125`)
- **Outside the current portal map:** 25 properties; these are not claimed as territory coverage
- **Duplicate territory assignments:** 0
- **Service Account:** skedaddle-search-console-reade@uws-gbp-analytics.iam.gserviceaccount.com
- **Service Account Role:** Administrator at account level
- **APIs Enabled:** GA4 Data API and Analytics Admin API

The auditable mapping lives in `shared/ga4TerritoryProperties.ts`. The `getGA4MappingSummary()` result must remain internally consistent before imports are run.

### How Access Was Granted

1. The GA4 web UI rejected the service-account email as a normal Google user.
2. The Analytics Admin API was enabled in the `uws-gbp-analytics` Google Cloud project.
3. An account-level access binding was created through `accounts/39401450/accessBindings`.
4. The binding grants the service account access to properties under the account.
5. The service-account email ends in `reade`, not `reader`, because of the Google Cloud name-length limit.

### Live Data Previously Verified

- Ottawa: 1,887 sessions (Jan–Jul 2026)
- Minneapolis: 1,004 sessions (Jan–Jul 2026)
- Pickering: 614 sessions from the US and 212 from Canada (Jul 2025)

These checks confirmed access. They are not a substitute for a persisted, coverage-checked reporting import.

### Durable Import and Reporting

- `server/googleAnalyticsClient.ts` aggregates only explicitly assigned properties with bounded concurrency and returns expected/succeeded/failed property coverage.
- `server/googleAnalyticsImporter.ts` imports one completed territory/month into canonical monthly, page-level, and audit tables.
- `drizzle/0005_ga4_territory_imports.sql` creates the GA4 reporting tables.
- `server/analyticsRouter.ts` uses persisted GA4 page data for the species/location trend, YoY comparison, KPI cards, and insights when a direct import exists; the older spreadsheet table remains a fallback during backfill.
- Strategy reports and proposals use persisted GA4/GSC evidence when available and explicitly disclose when it is unavailable or partial.
- Suburb-page validation checks imported GA4/GSC page evidence before relying on research or curated status.

Run a single completed month from the Analytics UI, or use:

```bash
pnpm ingest:ga4 -- --territory hamilton --year 2026 --month 7
pnpm ingest:ga4 -- --all --year 2026 --month 7
```

Apply the registered `0004` and `0005` migrations before the first import. Backfill at least the reporting comparison window before treating GA4 YoY charts as complete.

### Dashboard Procedures

- `getGA4ConnectionStatus`
- `getGA4MappingStatus`
- `getGA4TerritoryMonthly`
- `getGA4TerritoryTopPages`
- `getGA4TerritoryTopCities`
- `getGA4TerritoryChannelBreakdown`
- `getGA4ReadyTerritories`
- `syncGA4TerritoryMonth`
- `getGA4ImportStatus`

Live panels display property coverage. Persisted import status records `complete`, `partial`, or `failed` and retains failed-property details for review.
