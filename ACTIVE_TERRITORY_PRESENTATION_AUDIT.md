# Active Territory Presentation Audit

## Scope

This audit retires residual static performance presentation from the active portal overview, territory-detail card, and 90-day action plans. It does not delete retained historical report artifacts or alter source mappings, imported data, schedules, or account access.

## Implemented presentation boundary

| Surface | Previous active risk | Current behavior |
|---|---|---|
| Home overview | Static T12 revenue, jobs, top species, trend, rank, and dashboard-completeness claims were displayed from local metadata. | Displays non-performance territory context, dashboard links, and a clear source-availability note only. |
| Territory Detail | Static species and digital-trend summary plus an outdated data timestamp were shown beside the dashboard link. | Displays reporting-source guidance, verified franchise-territory context, non-assertion of corporate classification, and an unavailable-not-zero rule. |
| 90-day action plan | Used static T12 demand ranking, species, suburb, and closed-job wording. | Requires verified source coverage and matched-period evidence; it does not infer closed jobs, conversion, locality demand, or priority species. |

The portal’s 19 mapped territory records remain only as naming, geography, and navigation metadata on these active surfaces. Historical sales material remains available only where explicitly labelled as a historical snapshot.

## Verification

The focused source-presentation regression prevents reintroduction of static Home, Location Detail, and action-plan terms. It passed alongside strict TypeScript and the full suite: 173 tests passed with 11 intentional skips. The clean production build passed. Authenticated local visual review confirmed the Home overview and Milwaukee detail page render the source-aware content and the revised action plan.

## Ownership-context limitation

The approved territory mapping identifies 19 franchise reporting territories. It separately identifies certain unmapped network, corporate, or sub-brand records outside active territorial aggregations. It does **not** provide an authoritative legal owner or corporate/franchise classification for every source record. The active portal therefore states `Franchise reporting territory` for the territory context but deliberately does not make a corporate ownership assertion.
