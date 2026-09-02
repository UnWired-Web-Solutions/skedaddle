# Suburb Content Source Contract

## Purpose

This contract governs the internal suburb-content generator. It produces **drafts for review**, not published pages, local-business listings, performance claims, or automatic launch approvals.

## Approved inputs

| Content input | Allowed source | Required treatment |
|---|---|---|
| Territory identity and geography | Approved territory mapping | May identify territory, state/province, and country; does not establish ownership classification or customer coverage. |
| Territory-priority species | Active Drive-workbook aggregate, based on work-order counts | Label as territory-level context. Never describe it as suburb observation, suburb revenue, or local demand proof. |
| Suburb page evidence | Imported GSC/GA4 page evidence or a reviewer-provided verified URL | Use only to distinguish a measured existing page from a research suggestion; it does not prove service coverage. |
| Phone, GBP URL, founded/serving year, coordinates, county, neighbourhoods | Reviewer-provided publishing facts | Required before draft generation and marked for reviewer confirmation. |
| Local research | Cited external research | Present as a research suggestion until a reviewer verifies it. |

## Prohibited inputs and claims

The generator must not import `DASHBOARD_DATA` or other static performance fixtures. It must not use static revenue, job totals, suburb rankings, species revenue weights, trends, conversion rates, ownership classifications, placeholders, synthetic reviews, or guessed contact/location details.

The generator must fail closed when no active complete or partial Drive-workbook aggregate exists for the selected territory. A partial workbook may support a draft only when its partial status is disclosed in the draft citations and launch checklist. It must never be presented as complete coverage.

## AEO/GEO publishing guidance

Answer-focused content should place a concise, evidence-supported homeowner answer near the top of the page, use a clear single-page intent and logical heading structure, and keep key facts visible in the HTML. Structured data must mirror visible approved content and is an eligibility mechanism, not a ranking, rich-result, grounding, or citation guarantee. These rules implement the authoritative guidance recorded in `AEO_GEO_CONTENT_RESEARCH.md`.[1] [2] [3]

The launch checklist must require: an approved business identity and contact method, evidence for any local claims, page-status review, visible-to-markup parity, internal-link verification, schema validation, editorial review, and final publishing approval. No generated draft may bypass those gates.

## Implemented controls

The active workflow implements this contract through `server/suburbContentSources.ts`, `server/territoryCatalog.ts`, `server/suburbPageRouter.ts`, and `server/templates/suburbPageSchema.ts`. The client accepts a reviewer-entered community name, shows only active-workbook source state, and requires two explicit reviewer confirmations before it enables generation. The public territory contract contains identity/geography only; it does not return static suburb lists, revenue, jobs, rankings, or species weights.

Approval is blocked for legacy or incomplete drafts that lack the source context, requires reviewer attestation and notes, and does not publish. Schema copying and Markdown export are available only after approval. Draft generation was deliberately not exercised with invented local facts during this implementation.

## References

[1] [Google Search Central — LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)

[2] [Google Search Central — General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

[3] [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
