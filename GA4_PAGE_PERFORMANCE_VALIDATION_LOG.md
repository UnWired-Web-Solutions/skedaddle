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

## Initial production rollout check — pending client asset

Checkpoint `c7cb8918` published the updated backend state, but the first primary-domain browser check still referenced the prior `index-RTGO-mnp.js` asset and displayed the old `Live GA4: Top Pages by Sessions` heading. The page did not yet contain the new direct-engagement label. This is treated as a static-client rollout delay, not as successful production verification; no metric, source mapping, or data was modified while recording the discrepancy.

The automatic rollout retry in checkpoint `ecceb344` was also checked after propagation time. It continued to reference `index-RTGO-mnp.js` and did not contain the direct-GA4 heading. The updated engagement query must therefore remain locally verified but not production-verified. The next publication attempt will retain the clean `dist` build safeguard; no analytics data or service configuration will be changed.

After additional rollout time, the production `analytics.getGA4TerritoryTopPages` contract returned all three new field names—`engagedSessions`, `engagementRate`, and `userEngagementDurationSeconds`—with no API error. This confirms that the checkpointed server code has reached production. The final refreshed-client visual check remains necessary before the table itself is marked production-verified.

## Successful production interface verification

The refreshed primary production client now renders `Direct GA4: Top Page Performance`, reports complete Hamilton property coverage of 5/5, and displays Engaged, Engagement Rate, and Recorded Engagement Time in the page table. It also renders the direct-zero explanation and the key-event governance limitation. No key-event count, lead claim, conversion claim, or durable-historical engagement claim is present. The source-sensitive interface is therefore production-verified.
