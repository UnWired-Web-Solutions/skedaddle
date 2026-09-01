# Live Google Business Profile Data Model

**Status:** Designed August 31, 2026; implementation activation remains blocked pending Google’s allowlist case `6-1216000040949` and verified OAuth authorization.

## Objective

Replace only the **current static GBP snapshot path** with a source-traceable live-import path. The dashboard must continue to distinguish between historical spreadsheet records and imported Google Business Profile data; it must never silently fill incomplete API periods with zeros or estimates.

## Authentication and access model

Google’s Business Profile APIs require an OAuth 2.0 **user** authorization with the `business.manage` scope. The production importer will use a UWS manager/owner account’s refresh token, stored as a project secret. Service-account credentials are not a substitute for that user authorization.

| Secret | Purpose | Source |
|---|---|---|
| `GBP_OAUTH_CLIENT_ID` | Identifies the UWS OAuth web application | New OAuth client in `uws-gbp-analytics` |
| `GBP_OAUTH_CLIENT_SECRET` | Secures the OAuth web application | New OAuth client in `uws-gbp-analytics` |
| `GBP_OAUTH_REFRESH_TOKEN` | Allows the server to request short-lived GBP access tokens | One-time UWS Google authorization with offline access |

The production redirect URI will be `https://skedaddle.manus.space/api/gbp/oauth/callback`. OAuth state must be signed and short-lived; no token, client secret, or user credential may be committed to the repository.

## Source-of-truth hierarchy

| Data need | Source of truth | Notes |
|---|---|---|
| GBP account and location IDs | Business Profile Account Management and Business Information APIs | Required before a location can be imported |
| Current listing title, store code, address, website, and operational state | Business Information API | Refreshed with each inventory sync |
| Calls, website clicks, direction requests, and other performance metrics | Business Profile Performance API | Persist the metric enum exactly as returned by Google |
| Legacy historical figures | Existing `gbp_metrics` spreadsheet-import table | Retained and explicitly marked as `legacy_spreadsheet` |

## New persistence model

Existing `gbp_metrics` rows remain untouched. The live path adds four tables.

| Table | Grain | Purpose |
|---|---|---|
| `gbp_locations` | One GBP API location | Stores Google resource name, account, title, store code, address, website, listing state, mapped territory, mapping status, and last-seen time |
| `gbp_daily_metrics` | Location × date × Google metric enum | Stores raw, source-date performance values exactly as returned by Google |
| `gbp_territory_monthly` | Territory × year × month × metric | Stores territory rollups built only from fully mapped, successfully imported locations |
| `gbp_import_runs` | One inventory or metric import execution | Stores requested date range, expected/succeeded/skipped locations, status, source metadata, errors, and timestamp |

Each raw and aggregate row must preserve its source period and import timestamp. Aggregate records include expected and successful location counts so the UI can distinguish a complete territory period from a partial one.

## Location-mapping safeguards

The live inventory will be matched using Google’s **account resource name**, **location resource name**, and `storeCode`, not a display-name guess. Google guarantees a store code only within an account, so store code alone is never import authorization. The initial 32-profile Business Profile Manager inventory supplies grounded matching candidates, but no location becomes importable until its account and location resources have been returned and an exact binding has been explicitly approved.

| Mapping state | Meaning | Import behavior |
|---|---|---|
| `ready` | Active/verified API location explicitly matched to one canonical portal territory | Eligible for import |
| `review_required` | Location is active but could map to more than one territory or lacks a definitive identifier | Do not import into a territory total |
| `excluded` | Permanently closed, unverified, suspended, corporate, or outside the current 19-territory scope | Do not import |
| `unmapped` | Location was returned by Google but has no approved mapping | Do not import |

Examples from the verified manager inventory that remain review-required include Peterborough/Lakefield, Brant/Delhi, Mississauga, and unlabelled listings. Permanently closed or unverified profiles remain excluded. The importer must fail safely: it may log unmatched locations, but it must never assign them by proximity, city-name similarity, or revenue level.

## Import contract

The first release provides **manual administrative refreshes only**. A territory refresh will:

1. Exchange the secure refresh token for an access token.
2. Refresh the live account/location inventory.
3. Validate every location’s mapping state and active eligibility.
4. Request daily metrics only for `ready` locations in the requested, completed date range.
5. Persist raw daily values and roll up complete calendar months.
6. Create an import-run audit record with successful, skipped, and failed location counts.
7. Return a coverage state that the dashboard renders directly.

A month is **complete** only when all ready locations expected for that territory return successfully for the full requested period. A period with no Google rows remains `unavailable`, not zero. A partial or unavailable live refresh stays visible as that state; legacy spreadsheet values may appear only when no live result has been attempted for the same territory, month, and metric.

## Dashboard behavior

The Analytics page will continue to show Calls, Website Clicks, and Directions. It will source a period in this order:

1. Complete persisted live GBP territory aggregate (`persisted_business_profile_api`)
2. Partial persisted live attempt, visibly labelled and excluded from YoY (`partial`)
3. Explicit attempted-but-unavailable live state with a null value (`unavailable`)
4. Legacy spreadsheet record only when no live result has been attempted for that metric-period (`legacy_spreadsheet`)

The GBP YoY overlay and comparisons must use only like-for-like sources. It must show a coverage warning instead of calculating a percent change when either comparison period is partial, unavailable, or comes from a different source.

## Activation criteria

Implementation may be activated only when all checks below pass:

- Google increases the Performance API quota above zero for case `6-1216000040949`.
- The OAuth client and UWS refresh token are stored through the project secrets interface.
- The live API returns at least one account and the selected Minneapolis anchor location.
- All returned locations have a documented mapping status.
- One territory refresh persists raw and monthly data; API totals and database totals reconcile exactly.
- The authenticated dashboard displays the live source label and correct coverage state.

Only after those checks are verified should recurring refresh automation be considered.
