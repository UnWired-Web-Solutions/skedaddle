# Skedaddle Franchise Portal — GPT Collaboration Brief

> **Purpose:** This document brings a collaborating GPT agent up to speed on the Skedaddle Franchise Portal. Read it before proposing code, changing data, generating client-facing content, or modifying the live project.

## 1. Mission and Operating Context

The portal is an internal, login-protected operating system for **Skedaddle Humane Wildlife Control**. It is being built by Unwired Web Solutions (UWS) for Dave Henderson and the Skedaddle team. The immediate business objective is to help Dave sell, deliver, and operationalize territory-level digital marketing programs across the franchise network.

The portal currently supports territory dashboards, data-backed strategy materials, proposals, GBP image creation, suburb-page generation, and the beginning of a Salesforce integration. It is not a public consumer website. The primary working users are Dave and Ay Bello, with future review involvement expected from Rachel, Sarah, and Tristan.

| Item | Current state |
|---|---|
| Live domains | `skedaddle.manus.space` and `skedash-5fbc2yka.manus.space` |
| Project directory | `/home/ubuntu/skedaddle-dashboards` |
| GitHub remote | `user_github` → `aybello/skedaddle` |
| Deployment model | Every successful checkpoint auto-publishes to production |
| Main branch at handoff | `main` at checkpoint `e9aaf937` |
| Current GPT branch | None active — `agent/gbp-image-workflow-repair` was merged selectively on Aug 20 |
| Latest checkpoint | `7c312f9a` (Aug 20, 2026) |

## 2. Non-Negotiable Data Rules

### Never fabricate, estimate, or silently infer business data

This is the most important project rule. Missing data must be displayed as **Pending**, **Unknown**, **Not provided**, or **Needs confirmation**. Do not convert engagement volume into an estimated publishing volume. Do not invent page existence, location facts, review counts, jobs, revenue, GA4 traffic, GSC performance, GBP performance, service areas, or competitor claims.

Kira’s verified Salesforce exports corrected several past report errors, including material revenue errors for London, Hamilton, Durham, Ottawa, Denver, and Atlanta North. Those corrections established the following hierarchy:

| Priority | Data source | Appropriate use |
|---|---|---|
| 1 | Kira’s verified Salesforce exports | Revenue, completed jobs, property assessments, territory and species performance |
| 2 | Direct Salesforce API once authorized | Live operational data, close-rate analysis, inspection counts, trust chips |
| 3 | Direct GSC and GA4 APIs once access is granted | Page validation, search performance, page-level traffic, YoY analysis |
| 4 | Verified Google Business Profile data/API | GBP locations, NAP, hours, posts, reviews, calls, clicks, discovery metrics |
| 5 | Perplexity Sonar research | Web-grounded research suggestions with source URLs; requires content-team review before publishing |
| 6 | Historic Looker Studio exports | Reference only; do not use as a substitute for verified Salesforce data where they conflict |

> **Do not represent Sonar output as a confirmed business fact solely because it has citations.** It is valuable research, but local facts, regulations, competitors, and page status still require appropriate review before publication.

### Currency and comparison discipline

The network contains Canadian and United States territories. Do not compare average job value, revenue, or similar financial metrics across CAD and USD without an explicit exchange-rate snapshot and stated methodology. Avoid territory-level close-rate claims unless territory-level property assessment/appointment denominators are available.

## 3. Current Product Surface

The React app routes are in `client/src/App.tsx`; tRPC modules are wired in `server/routers.ts`.

| Module | Route / server router | Current purpose |
|---|---|---|
| Territory overview | `/` | Territory cards and portal entry point |
| Territory dashboard | `/dashboard/:id` | Salesforce, GSC, GBP, and chart-based performance views where data exists |
| Network view | `/network` | Network-level territory context |
| Analytics | `/analytics` / `analyticsRouter` | DashThis-replacement direction, including page-performance reporting |
| GBP Image Generator | `/gbp-images` / `gbpImageRouter` | Creates GBP post images using GPT Image 2 and a review process |
| Salesforce | `/salesforce` / `salesforceRouter` | OAuth connection status, schema exploration, SOQL console; waiting for Connected App credentials |
| Proposals | `/proposals` / `proposalRouter` | Territory-specific branded three-page proposal preview and PDF export |
| Strategy Reports | `/strategy-report` / `strategyReportRouter` | Multi-section, per-territory strategy report preview and PDF generator |
| Suburb Pages | `/suburb-pages` / `suburbPageRouter` | Draft → review → approve → export SEO suburb-page content and JSON-LD |

### Technology stack

The portal uses React 19, TypeScript, Vite, Tailwind 4, Express 4, tRPC 11, Drizzle ORM, MySQL/TiDB, S3 storage helpers, Puppeteer, Vitest, and a custom local authentication layer. Generated files such as PDFs are stored in S3; do not store file bytes in database columns.

The portal does **not** use the default Manus OAuth user records for its primary login. The UI uses a custom `AuthContext` username/password system. Existing server-side procedure choices must be tested in this environment; do not assume default Manus `adminProcedure`/`protectedProcedure` behavior will match the custom login state without verification.

## 4. What Is Already Built

### Territory dashboards and historic reports

The portal contains 18 active territories with verified Salesforce-derived territory data where available. Earlier static HTML reports were regenerated after the Jul. 24 verified Salesforce exports. Barrie North remains pending because the verified export did not include it. Do not recreate missing values for Barrie North.

Dashboard data is primarily located in:

```text
client/src/data/dashboardData.ts
client/src/data/franchises.ts
shared/territoryMapping.ts
client/src/data/actionPlans.ts
```

### Proposal Generator

The proposal generator creates a territory-specific, branded short proposal. It uses a direct Anthropic integration, renders a reviewed HTML document through Puppeteer, and stores the PDF in S3. The production Dockerfile includes Chromium specifically for this pipeline.

### Strategy Report Generator

The strategy generator is a per-territory long-form report engine intended to follow Dave’s Ottawa gold-standard strategy document. It assembles deterministic tables from structured data, then generates strategic narrative sections sequentially so they retain context.

The intended sequence is:

1. Executive summary
2. Current campaign baseline
3. Data foundation and species analysis
4. Revenue by suburb and page-coverage status
5. Gap analysis
6. Proposed program and scale comparison
7. Content architecture
8. GBP strategy
9. 90-day action plan
10. Delivery dependencies and mitigations
11. Recommendations

The strategy generator was updated to use `claude-opus-5` for client-facing narrative. Its data integrity must remain deterministic: revenue, jobs, species, suburb names, and tables come from structured inputs, not LLM output.

### Suburb Page Content Generator

The suburb-page generator turns a selected territory and suburb into a WordPress-ready content package. It includes metadata, title structure, trust-chip candidates, NAP details, species-weighted content sections, neighbourhood/AEO content, FAQs, a launch checklist, citations, and an eight-block JSON-LD template.

Species content is weighted by verified territory revenue contribution:

| Species tier | Revenue share | Target content depth |
|---|---:|---|
| Tier 1 | 15% or higher | 130–150 words |
| Tier 2 | 5% to <15% | 80–100 words |
| Tier 3 | Below 5% | 40–60 words |

The approval state is `draft → in_review → approved → exported`. Never bypass the review state or describe a generated page as ready to publish unless all external facts, NAP details, local claims, and schema inputs have been checked.

### Perplexity Sonar research layer

`server/suburbPageRouter.ts` now runs three Sonar queries before content generation:

1. **Page validation:** Searches `site:skedaddlewildlife.com` to assess whether a dedicated suburb page appears to exist.
2. **Local facts:** Looks for neighbourhoods, county/regional municipality, and relevant local wildlife information.
3. **Competitor landscape:** Finds potential competitors and publicly available review/rating context.

Sonar provides research candidates and source URLs. It should enhance a content brief, not silently create verified facts. The UI should eventually display a clear **“Researching with Sonar…”** progress state.

### GBP Image Generator

The GBP Image Generator is production-capable for **GBP posts**. It uses GPT Image 2, structured prompt preparation, species-aware scenes, vision QA retries, resizing, and Skedaddle overlay treatment. AI-generated images must **never** be uploaded into the consumer-facing GBP photo/gallery area. They are permissible for GBP posts, subject to approval.

## 5. AI and API Standards

### Model-selection policy

Cost is not a limiting factor. Always select the current best model for the job. Do not default to mini, Haiku, or legacy versions just because they are cheaper.

| Task | Preferred model/provider |
|---|---|
| Client-facing reports, strategy narratives, proposals, suburb-page body copy | Direct Anthropic `claude-opus-5` |
| Structured extraction, classification, compact formatting | Direct Anthropic `claude-sonnet-5` |
| Image generation | GPT Image 2 through the built-in Forge image service |
| Fresh web-grounded research | Perplexity `sonar-pro` |
| Vision / generation QA | Best available vision-capable model at time of implementation |
| Deep structured reasoning or alternate quality check | Latest direct GPT or Gemini model when it is better suited; inspect the available model catalog first |

The project has direct access to Anthropic, OpenAI, Perplexity, and built-in Forge services. Credentials must remain server-side. Never write an API key, token, password, or real user credential into source code, documentation, test fixtures, logs, or client-side variables.

### Direct integrations already available

| Integration | Status | Constraint |
|---|---|---|
| Anthropic API | Active | Use direct API for Claude content generation |
| Perplexity Sonar API | Active | Treat outputs as cited research requiring review |
| OpenAI API | Active | Use latest appropriate direct model when needed |
| Forge image service | Active | GPT Image 2 used for GBP images |
| Salesforce OAuth | Code complete; not connected | Requires Connected App credentials and Barry’s authorization |
| GA4 | Active | 129 account properties discovered; 103 unique sub-location properties assigned to 19 portal territories, plus one control property |
| GSC API | Active | 19/19 territory scopes ready with Apr 2025–Jul 2026 imported coverage |
| GBP API | Not configured | Required for post automation and verified GBP records |
| WordPress REST API | Not configured | Required before any auto-publishing workflow |

## 6. Required Accuracy and Content Rules

1. Do not claim a dedicated suburb page is missing unless the page status is verified. Use **Unknown** or **Needs audit** otherwise.
2. Do not infer GBP post volume from calls, clicks, impressions, or engagement. Ask for a confirmed campaign input.
3. Do not infer a local number of inspections from territory-wide jobs. If a suburb-specific count is unavailable, show pending or ask for the Salesforce query.
4. Do not generate fictional user reviews, ratings, or testimonials in any code, content, fixtures, or reports.
5. Do not use current total sessions as the central report KPI when species-page and location-page performance is the actual business question.
6. Clearly label estimated, historic, verified, pending, and research-suggested data.
7. Generated prose should be natural, specific, and professional. Avoid generic AI phrasing and do not pad reports with filler.
8. A model may draft narrative; it must not become the source of business facts.

## 7. Important Reference Material

The following sources are authoritative context. They may be outside the repository but are available in the broader project environment.

| Source | Purpose |
|---|---|
| `/home/ubuntu/projects/uws-work-2c9ba727/session_memory.md` | Running project history and session log; read before work begins |
| `/home/ubuntu/upload/Ottawa_Franchise_Digital_Marketing_Sales_Strategy.pdf` | Dave’s 55-page gold-standard strategy document |
| `/home/ubuntu/ottawa_strategy_full_structure.md` | Extracted target structure and notes for the Ottawa report |
| `/home/ubuntu/upload/MN_Franchise_Marketing_Strategy_Spring2026.txt` | Second example of how the strategy structure adapts by territory |
| `/home/ubuntu/dave_report_feedback_notes.md` | Dave’s specific report-quality feedback |
| `/home/ubuntu/dave_openclaw_prompt_analysis.md` | Quarterly-performance-report thinking and structure |
| `server/templates/suburbPageSchema.ts` | Validated Prior Lake-derived JSON-LD pattern |
| `server/suburbPageRouter.ts` | Content, research, citations, and approval-flow implementation |
| `server/strategyReportRouter.ts` | Long-form strategy-report implementation |

## 8. Current Priorities and Dependencies

The work should proceed in this order unless Dave or Ay changes it.

| Priority | Workstream | Current next action |
|---:|---|---|
| 1 | Report reliability | Apply and backfill the coverage-aware GA4 import, then test one real territory report against persisted GA4/GSC evidence and confirmed campaign inputs |
| 2 | Suburb page delivery | End-to-end test a real page, beginning with a known territory/suburb; review research, local facts, schema, citations, and export |
| 3 | Search and analytics data | Apply the registered GA4 migrations and backfill completed months so coverage-aware GA4 page evidence can replace the legacy spreadsheet fallback |
| 4 | GBP automation | Build a review-first content calendar and approval queue; do not auto-post until GBP API OAuth and safeguards are complete |
| 5 | Salesforce direct data | Complete Barry’s Connected App authorization, then inspect schema and build only verified extraction queries |
| 6 | WordPress publishing | Add only after an approved review state and confirmed WordPress REST API scope/permissions |

### Work explicitly waiting on people or access

* **Barry:** Salesforce Connected App credentials and authorization.
* **Dave / Ryan:** Google Business Profile API direction and WordPress API details.
* **Kira:** Any further verified Salesforce exports, including missing Barrie North data.

## 9. Active GPT Branch: Analytics and Report Integration

The active repair branch is `agent/analytics-report-integration`, created from current `origin/main`. It preserves the Search Console, GA4, and GBP image workflow files already on main.

Its scope is intentionally narrow:

* Correct the GA4 mapping claim: 129 account properties discovered, 103 uniquely assigned to the 19 portal territories, one control property, and 25 outside the current territory map.
* Remove the duplicate Pasadena property assignment that could double-count a territory aggregate.
* Persist direct GA4 monthly and page-level imports with complete/partial/failed audit records.
* Show property coverage for direct GA4 panels instead of silently presenting partial totals as complete.
* Feed persisted GA4/GSC evidence into analytics, strategy reports, proposals, and suburb-page validation.
* Restore the existing admin-only Suburb Page Generator route and navigation.
* Register the previously unjournaled GBP workflow migration before the GA4 migration.

### Merge status at handoff

Do not merge until TypeScript, Vitest, and build checks pass in an environment with dependencies installed. Apply migrations `0004` and `0005`, then run an explicit GA4 backfill before calling the YoY dashboard complete.

## 10. Collaboration Protocol

1. Read this brief, `session_memory.md`, `todo.md`, and the relevant code before making changes.
2. Begin each feature by writing a clear plan and adding verifiable unchecked tasks to `todo.md`.
3. Keep changes small and coherent. Avoid broad rewrites of working features.
4. When changing database schema, update Drizzle schema first, generate a migration, review it, apply it through the approved database workflow, and test it.
5. Run `npx tsc --noEmit` and `npx vitest run` after changes. Add/update Vitest tests for every changed feature.
6. Visually verify changed portal pages before presenting them as complete.
7. Do not merge, deploy, publish, send email, post content, or execute an external side effect without explicit approval where required.
8. Before a checkpoint, read `todo.md`, mark completed items, and preserve unfinished work as unchecked.
9. Every checkpoint is live production deployment. Treat it as a release.
10. Keep GitHub synchronized. Do not use `git reset --hard`; use the portal checkpoint/rollback workflow if recovery is needed.

## 11. Suggested First Actions for a Collaborating GPT

First, validate the active analytics branch with TypeScript, Vitest, and a production build. Second, apply migrations `0004` and `0005` and backfill a complete GA4 comparison window. Third, generate one real suburb page, proposal, and strategy report with confirmed campaign inputs and compare every analytics claim to the persisted source data before Ay/Dave reviews it.

Do not start GBP auto-posting, WordPress publishing, Salesforce data extraction, or broad live-data claims until the corresponding credentials, authorization, and review safeguards are in place.

## 12. Branch Hygiene — CRITICAL

**Do not delete or modify files you did not create.** When creating a branch from an older `main`, files added after your branch point will appear "missing" in a diff against current `main`. This is expected — it does not mean those files should be removed.

The following files and directories are critical infrastructure that must never be deleted or modified without explicit approval:

| File/Directory | Purpose |
|---|---|
| `server/googleSearchConsoleClient.ts` | Live GSC API client (service account auth) |
| `server/googleSearchConsoleImporter.ts` | Territory-scoped GSC data importer |
| `server/googleAnalyticsClient.ts` | Live GA4 Data API client (103 assigned properties → 19 territories, with coverage reporting) |
| `shared/gscTerritoryPaths.ts` | GSC territory scope registry (all 19 ready) |
| `shared/ga4TerritoryProperties.ts` | GA4 property-to-territory mapping (103 unique assigned properties; 129 account properties discovered) |
| `server/analyticsRouter.ts` | Analytics tRPC router (GSC + GA4 + GBP procedures) |
| `scripts/ingest-search-console.mjs` | Guarded GSC import script |
| `GA4_ACCESS_STATUS.md` | GA4 connection documentation |
| `GSC_PROPERTY_SCOPE.md` | GSC property inventory documentation |

**Before merging any branch:** always rebase onto current `main` first. Never merge a stale branch directly — it will appear to delete files that were added after the branch point.

## 13. Current Data Source Status (Aug 20, 2026)

| Source | Status | Details |
|---|---|---|
| Google Search Console | ✅ LIVE | 19/19 territories ready, Apr 2025–Jul 2026 coverage |
| Google Analytics 4 | ✅ LIVE / BACKFILL PENDING | 129 account properties discovered; 103 uniquely assigned to 19 territories; durable coverage-aware importer implemented |
| Salesforce | ❌ BLOCKED | Awaiting Barry's Connected App credentials (Zoom call requested) |
| GBP Data | ✅ STATIC | Monthly metrics in dashboardData.ts from manual exports |
| Perplexity Sonar | ✅ AVAILABLE | Wired for suburb page research (feature halted per Dave) |
