# GA4 Property Discovery — Aug 19–21, 2026

## Final Finding

The Skedaddle Wildlife GA4 account (`39401450`) uses separate properties for many sub-locations. The earlier `p394014501` identifier was not a valid reporting property ID for the intended Data API queries, which caused the original permission diagnosis to be wrong.

The Analytics Admin API discovery found **129 account properties**. That number is an account inventory count, not the number assigned to the portal's 19 reporting territories.

## Audited Portal Scope

| Scope | Count |
|---|---:|
| Account properties discovered | 129 |
| Unique sub-location properties assigned to the 19 portal territories | 103 |
| Corporate/network control property | 1 |
| Properties outside the current territory map | 25 |
| Duplicate territory assignments | 0 |

The canonical, testable mapping is `shared/ga4TerritoryProperties.ts`. `getGA4MappingSummary()` verifies these counts and reports duplicate property ownership.

## Examples

| Property ID | Property | Canonical portal territory |
|---|---|---|
| `386412751` | Pickering | `durham` |
| `475791585` | Pickerington | `oh-columbus` |
| `487034337` | Pittsburgh | `pa-pittsburgh` |
| `426814229` | Prince George's County | `maryland-central` |
| `387167599` | Sudbury | Outside the current 19-territory portal map |
| `475791279` | Sunbury | `oh-columbus` |
| `409157507` | Thornhill | `barrie-north` |

Property `455082263` (Pasadena) is assigned only to `maryland-central`. Its former duplicate assignment to `md-baltimore` was removed to prevent double-counting.

## Reporting Rules

1. Aggregate only properties explicitly assigned to the selected canonical territory.
2. Never describe all 129 account properties as territory-mapped.
3. Return expected, succeeded, and failed property coverage for live queries.
4. Persist completed-month totals and page rows with a complete/partial/failed audit record.
5. Do not treat a partial import as a complete territory result.
6. Apply migrations `0004` and `0005` before the first durable GA4 import.

Implementation details and run commands are documented in `GA4_ACCESS_STATUS.md`.
