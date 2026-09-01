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
