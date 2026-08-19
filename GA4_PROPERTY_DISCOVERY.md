# GA4 Property Discovery — Aug 19, 2026

## Key Finding
The Skedaddle Wildlife GA4 account (39401450) uses SEPARATE properties per territory.
The UWS account HAS full access to this account (not blocked as previously thought).
The wrong property ID (p394014501) was causing the "Missing permissions" error.

## Confirmed Properties (from property picker):
| Property ID | Full Name (from header) | Territory |
|---|---|---|
| 386412751 | Skedaddle Wildlife Pickering - GA4 | Durham (Pickering) |
| 475791585 | Skedaddle Wildlife Pickerington - GA4 | Columbus (Pickerington, OH) |
| 487034337 | TBD | TBD |
| 426814229 | TBD | TBD |
| 386492593 | TBD | TBD |
| (more) | TBD | TBD |

## How to identify remaining properties:
- Open property picker → click each one → check the header name
- Or use GA4 Admin API to list all properties under account 39401450

## Next Steps:
1. Use the GA4 Admin API (analytics admin v1alpha) to list ALL properties under account 39401450
2. Map each property to its territory
3. Add service account as viewer on each property
4. Update googleAnalyticsClient.ts to use per-territory property IDs

## Properties Discovered from Picker (scrolling through):

### First batch (from previous page extract):
- 386412751 — Skedaddle Wildlife Pickering - GA4
- 475791585 — Skedaddle Wildlife Pickerington - GA4
- 487034337 — Skedaddle Wildlife Pittsburgh - GA4
- 426814229 — Skedaddle Wildlife Prince George's County - GA4
- 386492593 — Skedaddle Wildlife R... (truncated — need to scroll more)
- 475753023 — Skedaddle Wildlife ... (truncated)

### Second batch (after scrolling):
- 387167599 — Skedaddle Wildlife Sudbury - GA4
- 475791279 — Skedaddle Wildlife Sunbury - GA4
- 409157507 — Skedaddle Wildlife Thornhill - GA4
- ????????? — Skedaddle Wildlife Thornton - G... (truncated)
- 391929833 — Skedaddle Wildlife ... (truncated)
- 365729... — Skedaddle Wildlife ... (truncated)

### Territory Mapping (confirmed so far):
| Property ID | Property Name | Our Territory ID |
|---|---|---|
| 386412751 | Skedaddle Wildlife Pickering - GA4 | durham |
| 475791585 | Skedaddle Wildlife Pickerington - GA4 | columbus |
| 487034337 | Skedaddle Wildlife Pittsburgh - GA4 | pittsburgh |
| 426814229 | Skedaddle Wildlife Prince George's County - GA4 | maryland-central |
| 387167599 | Skedaddle Wildlife Sudbury - GA4 | (not in our 19 territories) |
| 475791279 | Skedaddle Wildlife Sunbury - GA4 | (not in our 19 territories) |
| 409157507 | Skedaddle Wildlife Thornhill - GA4 | barrie-york-region |

## Strategy:
Rather than manually clicking through 30+ properties, use the GA4 Admin API
(analyticsadmin v1alpha) to programmatically list ALL properties under account 39401450.
This will give us the complete mapping in one API call.
