# GA4 Page-Performance Validation Log

## September 1, 2026 — Direct engagement scope

The page-performance expansion is deliberately limited to standard **direct** GA4 Data API metrics. It does not change durable historical monthly or page snapshots, and it does not infer a conversion, lead, or sales outcome from a GA4 event.

| Check | Verified finding |
|---|---|
| Sessions, users, engaged sessions, engagement rate, and engagement duration with `pagePath` | Read-only Data API compatibility passed for Hamilton (5/5 mapped properties) and Durham Region (10/10 mapped properties) for August 2026. |
| Key-event definition governance | All 19 mapped territories were read successfully; 17 have internally consistent property definition sets and 2 do not. No aggregated key-event value is shown. |
| Engagement-duration interpretation | Hamilton had positive aggregate and page duration in 1/5 properties; Durham had positive duration in 0/10. A zero cell is therefore presented as **No duration recorded**, a direct GA4 result, not as unavailable or estimated data. |
| Query coverage | Local Hamilton direct top-page contract returned the engagement fields and `5/5` property coverage without returning an error. |
| Interface | The local Analytics table displayed Sessions, Users, Engaged, Engagement Rate, and Recorded Engagement Time, plus an explicit key-event-definition limitation. |
| Regression and build | Strict TypeScript, the focused GA4 importer regression, the full suite (167 passed; 11 intentional skips), and the clean production build passed. |

The direct top-pages query remains paginated at 25,000 rows per property. The durable backfill does not yet persist engagement metrics, so historical trend and YoY data remains sessions-only and source-labelled. Key events remain unavailable until UWS approves a single network-wide event-definition policy and counting basis.
