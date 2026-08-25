# Codex Update Review — August 25, 2026

## Authenticated browser QA setup

- The browser initially redirected every protected page to the local portal login, confirming the client-side gate remains active.
- The authenticated QA session was then seeded using the portal's real `skedaddle_portal_user` session-storage contract with the local admin role.
- This allows the Home, Location Detail, Analytics, Strategy Report, and Proposal pages changed by the update to be visually inspected without introducing a Manus OAuth session.

## Overview activity-trend QA

The first authenticated render exposed a presentation defect introduced by the activity-trend update: directional symbols appeared twice because the card rendered both a trend icon and an arrow-prefixed text label. The Home-page label was corrected to show only the percentage or `Stable`, leaving direction to the icon. A second authenticated render confirmed the duplicated arrows were removed while the measured metric and comparison period remained visible on each card.

## Ottawa Location Detail QA

The authenticated Ottawa detail page renders successfully with the updated measured activity block. It shows `GBP interactions`, the verified `18%` decline indicator, and `Jun 2026 vs Jun 2025 · YoY` together without overlap. The action plan remains visible and now uses cautious, source-aware language such as reviewing actual comparisons, confirming approved GBP volume, and validating page coverage before creating pages.

## Strategy Report Generator QA

The authenticated Strategy Report Generator loads without permission errors and clearly presents the initial-sales use case. Its workflow copy accurately explains that Salesforce, GBP, GSC, and confirmed campaign inputs remain distinct, that deterministic tables and narrative sections are assembled separately, and that users review a saved HTML draft before exporting that exact draft without regeneration. Territory discovery returned all available reporting locations through the custom local-auth session.

## Proposal Generator QA

The authenticated Proposal Generator loads without the former `10002` permission failure and retrieves the full territory list. Its interface now makes the review contract explicit: users preview first, commercial terms come only from confirmed inputs, and the PDF is rendered from the exact reviewed draft rather than regenerating narrative copy at export time.

## Actual dashboard-route QA

The authenticated `/dashboard/ottawa` route was inspected directly, not inferred from the Location Detail page. The top KPI row, Revenue by Species pie chart, Inspection-to-Sale panel, Revenue by Suburb table, and GBP chart align below the sidebar without any header overlap. The dashboard correctly keeps territory inspection and close-rate fields marked `Pending` while showing the verified network benchmark as context.
