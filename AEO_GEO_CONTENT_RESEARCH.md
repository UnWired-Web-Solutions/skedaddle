# AEO/GEO Content Guidance Research

## Scope

This record supports a source-safe update to the suburb-content workflow. It does not authorize new location claims, service claims, schema properties, production URLs, or automatic publishing. Every recommendation remains subject to the portal’s existing evidence and approval gates.

## Authoritative findings

| Principle | Evidence-led implementation implication | Source |
|---|---|---|
| Use structured data only for visible, accurate page content | Generate schema only from approved, page-visible facts; do not emit placeholder NAP, ratings, locations, hours, or service claims. | [1] [2] |
| Rich results and AI citations are not guaranteed outcomes | Treat schema and answer-focused formatting as eligibility and clarity work, not a promise of ranking, rich-result, citation, traffic, or conversion outcomes. | [1] [2] [3] |
| LocalBusiness markup needs page-specific business information | Require reviewer-approved local business facts before schema; represent unknown local details as pending rather than inferred. | [1] |
| Clear, crawlable, focused content supports traditional and AI experiences | Put the direct homeowner answer early; use one clear page intent, logical headings, readable answer blocks, crawlable internal links, and canonical URL discipline. | [3] |
| Facts must stand on their own and remain current | Prefer source-backed claims, distinguish territory signals from suburb evidence, and require review for research suggestions, seasonal guidance, local regulations, and availability statements. | [2] [3] |
| Avoid manipulative AI-content tactics | Retain human approval, reject keyword stuffing, duplicate location templates, hidden/irrelevant markup, invented facts, and prompts intended to manipulate AI systems. | [2] [3] |

## Proposed content-generation rules

The generator should produce a short, direct answer immediately below the H1 that reflects only approved visible facts. It should then expand through homeowner-useful service explanation, verified local context, species guidance explicitly bounded to territory-level evidence where applicable, and an approval-required action path.

All schema facts must be both **visible on the page** and **approved in the workflow**. The approval checklist should require verification of business identity, contact information, service-area wording, internal links, page-status evidence, local facts, and any time-sensitive guidance. No rubric may claim that schema, AEO, GEO, indexing, grounding, or citations are guaranteed.

## Implementation record — September 2, 2026

The internal generator now uses a review-only contract. It retires legacy static territory revenue, job, suburb, species-weighting, seasonal, and location-performance inputs. It requires an active complete or partial Drive-workbook aggregate before drafting, labels species as territory-level work-order context only, and blocks a draft when that aggregate is unavailable. The workflow accepts a reviewer-entered community name rather than presenting a static suburb-ranking list.

JSON-LD now uses only visible draft content plus reviewer-confirmed business facts. It intentionally omits non-visible coordinates, physical addresses, hours, offers, prices, availability, ratings, reviews, parent-company claims, service radii, and HowTo claims. Approval requires an attestation and concise review notes; export remains separate from approval and automatic publishing is not implemented.

Local validation completed with TypeScript, focused suburb-content regression coverage, the serialized full suite, a clean production build, and public procedure checks that confirmed no static performance fields or raw workbook/currency/customer fields in the suburb contracts. Authenticated production review then confirmed the review-only interface, manual community entry, no static performance selector, absent Claude wording, disabled draft action while facts are missing, and partial-workbook disclosure for Ottawa. No real suburb draft was generated because no reviewer-approved publishing facts were supplied.

## References

[1] [Google Search Central — LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)

[2] [Google Search Central — General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

[3] [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
