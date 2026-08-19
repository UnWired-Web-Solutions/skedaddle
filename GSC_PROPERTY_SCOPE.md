# Google Search Console Property Scope

## Verified access model

On August 19, 2026, the authorised UWS Search Console account showed a large set of Skedaddle URL-prefix properties. These include individual paths such as:

- `https://www.skedaddlewildlife.com/location/hamilton/`
- `https://www.skedaddlewildlife.com/location/milwaukee/`
- `https://www.skedaddlewildlife.com/location/ottawa/`
- `https://www.skedaddlewildlife.com/location/denver/`

It also includes the parent domain property: `sc-domain:skedaddlewildlife.com`.

The individual location entries are **separately registered URL-prefix properties**, not separate websites. They all sit beneath the same Skedaddle Wildlife domain.

## Approved dashboard import model

The portal service account has access to the parent domain property only:

> `sc-domain:skedaddlewildlife.com`

This is the correct source for the dashboard. Each territory import must query the parent property with a verified page-path filter. For example, a Hamilton import must use the exact Hamilton location path as its page filter for both page and query data.

| Data type | Required scope rule |
|---|---|
| Top pages | Store only rows that match the territory's approved URL path. |
| Top queries | Run the query report with the same page-path filter used for the top-pages report. |
| Territory totals | Derive totals only from those filtered rows. Never label whole-domain totals as a territory result. |
| Location properties | Treat as an audit/reference view only; do not build separate credentials for each location. |

## Import prerequisite

Before enabling a territory refresh, record and review its exact canonical URL prefix. A territory can have multiple operating cities, so the page-path map must be explicit rather than inferred from the territory name.

The owner account contains **72 Skedaddle-related properties**: three domain properties and 69 Skedaddle Wildlife domain or URL-prefix entries. The complete raw owner-account inventory is retained in `GSC_OWNER_PROPERTY_INVENTORY_2026-08-19.json`. The full territory import registry is maintained in `shared/gscTerritoryPaths.ts`. It marks each territory as `ready`, `partial`, or `review_required` rather than assuming missing city paths belong to a franchise.

## Current service-account access

The service account `skedaddle-search-console-reade@uws-gbp-analytics.iam.gserviceaccount.com` has Full access to the parent domain property. The server-side credential test confirms it can list that property.
