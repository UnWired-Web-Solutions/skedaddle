# Network Workbook Leaderboard Validation Log

## September 1, 2026 — Local implementation verification

The Network page’s previous static `dashboardData` revenue leaderboard was retired. The page now reads the public `salesforceWorkbook.getNetworkPerformance` contract, which is limited to the active Google Drive workbook run and aggregate-only fields.

| Safety check | Verified result |
|---|---|
| Active source | `salesforce_drive_workbook` active run only; no Salesforce API request or static sales fallback. |
| Returned fields | Canonical territory ID, currency code, work-order count, invoice-value-row count, and recorded pre-tax invoice amount. No work-order IDs, customer addresses, salesperson fields, source territory label, status label, or conversion metric. |
| Currency treatment | Separate CAD and USD ranking groups; no cross-currency comparison. The active canonical rollup contained 9 CAD and 9 USD territories. |
| Coverage disclosure | Active snapshot status is shown. The source is partial, and the page states the explicit excluded-row count without converting it to an assumed zero or complete claim. |
| Label accuracy | “Recorded Invoice Value (Pre-Tax)” replaces “T12 Revenue”; the interface states that it is not a trailing-12-month revenue claim. |
| Local contract | Source/field-presence checks passed for the active Drive source, both currency codes, and absence of conversion or raw-source fields. |
| Regression and build | Strict TypeScript, workbook-router regression, full suite (168 passed; 11 intentional skips), and clean production build passed. |

The remaining non-ranked territory has no accepted active-workbook aggregate and is not substituted with a zero. Production interface verification remains pending checkpoint rollout.

## Initial production rollout check

After checkpoint `70d43482`, the authenticated production Network page still displayed the former static **Market Rankings by Currency — T12 Revenue** table and its Salesforce T12 claim. This is a stale deployment artifact, not a verification pass. The new active-workbook network contract was not yet present in the rendered production page, so no production source, currency, or partial-state claim is made at this stage.

## Retry status

After rollout-evidence checkpoint `66b481f4`, the authenticated production Network page still displayed the same former static table. The corresponding production `salesforceWorkbook.getNetworkPerformance` endpoint returned HTTP 404, confirming that this is not merely a browser-cache issue: the live server is also still serving the prior release. The production-log service was unavailable (`cloudrun service not found`), so it supplied no additional deployment diagnosis. A further publication retry may be used without changing source code or workbook data.

## Successful published leaderboard verification

After allowing the automatic queue additional time, the authenticated production page loaded the new client and then resolved its workbook query. The rendered table was titled **Active Workbook Territory Summary by Currency** and displayed the explicit active `partial` source disclosure with 48,524 excluded source rows. It showed separate USD and CAD ranks, the safe work-order/invoice-row/recorded-pre-tax-invoice-value fields, and the conversion-unavailable note. The former `T12 Revenue`, average-job, top-species, and Salesforce-API wording was absent from the active ranking panel.
