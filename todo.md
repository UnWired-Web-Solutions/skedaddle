# Skedaddle Franchise Portal — TODO

## Repository Updates Review (Aug 18, 2026)
- [x] Inspect and assess newly available repository updates before integration — `codex/meeting-report-priorities` validated (76 passed, 1 skipped); needs one GSC query-scope safeguard before merge
- [x] Publish and verify the merged `codex/meeting-report-priorities` update — safeguard, merge, database migration, TypeScript, and 76 passing tests complete
- [x] Generate and review a live Strategy Report Generator output after the Claude model repair — Hamilton completed all 13 sections with no Claude API error or missing-data placeholder
- [x] Verify the dashboard-header overlap after the portal-layout merge — authenticated Home, Ottawa Location Detail, Strategy Report, and Proposal pages reviewed with no overlap regression
- [x] Refine portal brand treatment: official Skedaddle logo with selective brand-green accents — neutral login surface, charcoal navigation, official colour logo, green reserved for actions and active states
- [x] Verify authorised Google Search Console access and document the portal connection path — `uws@unwiredwebsolutions.com` is a verified owner of `sc-domain:skedaddlewildlife.com`; production API credential setup remains next
- [x] Create, authorise, and verify the least-privilege Google Search Console service-account connection — Search Console API enabled, dedicated service account granted Full property access, JSON key stored securely, and live API property test passed
- [x] Confirm the property model — location entries are URL-prefix properties beneath the parent domain; approved domain-property plus verified path-filter model documented
- [x] Create and save the complete owner-account inventory of authorised Skedaddle domain and URL-prefix properties — 72 owner-visible Skedaddle properties saved in `GSC_OWNER_PROPERTY_INVENTORY_2026-08-19.json`
- [x] Create an explicit Search Console scope-decision registry for all 19 territories — `ready`, `partial`, and `review_required` states prevent unverified imports
- [x] Reuse the existing territory/sub-market mapping with live Search Console page evidence to resolve eligible remaining path scopes — Durham, Ottawa, Milwaukee, Barrie/York Region, Orangeville, and Okanagan are now ready
- [x] Resolve and document canonical Search Console path(s) for territories that remain `partial` or `review_required` — all 7 resolved using live GSC page evidence
- [x] Confirm import boundaries for remaining overlapping or incomplete territories — Hamilton (304 pages), London (51), Denver (72), Coquitlam (206), Atlanta North (172), Baltimore (83), Windsor (21) all imported Jul 2026
- [x] Import and backfill Search Console data for the newly verified ready territories — Durham, Ottawa, Milwaukee, Barrie/York Region, Orangeville, and Okanagan each have April 2025–July 2026 coverage

## Google Analytics 4 Connection (Aug 19, 2026)
- [x] Enable the GA4 Data API in the UWS Google Cloud project
- [x] Diagnose the original GA4 `p394014501` permission error — that identifier was not the intended Data API property; account-level service-account access is now confirmed
- [x] Discover all GA4 properties — found 129 properties under account 39401450; 103 unique sub-location properties are assigned to 19 portal territories, plus one control property
- [x] Build the GA4 client (googleAnalyticsClient.ts) and territory-filtered reporting endpoint
- [x] Create GA4 territory property mapping (shared/ga4TerritoryProperties.ts)
- [x] Add the service account as Administrator on the Skedaddle Wildlife GA4 account — done via Analytics Admin API (accounts/39401450/accessBindings)
- [x] Live GA4 Data API connection verified — Ottawa 1,887 sessions, Minneapolis 1,004 sessions (Jan-Jul 2026)
- [x] Rewrote GA4 client to aggregate explicitly assigned territory sub-location properties (103 unique properties → 19 territories) with bounded concurrency and visible coverage
- [x] Added live GA4 territory procedures: getGA4TerritoryMonthly, getGA4TerritoryTopPages, getGA4TerritoryTopCities, getGA4TerritoryChannelBreakdown, getGA4ReadyTerritories
- [x] Added live GA4 panels to Analytics page: Top Pages table, Top Cities list, Channel Breakdown bars
- [x] Build durable GA4 monthly/page importer, audit trail, registered migration, mapping validation, and coverage-aware dashboard refresh
- [ ] Apply migrations `0004` and `0005`, then backfill completed GA4 months for all 19 territories before treating YoY coverage as complete

## DashThis Replacement — GSC Enhancements (Aug 19, 2026)
- [x] Add getSearchConsoleYTD procedure — YTD clicks/impressions with same-period-last-year comparison
- [x] Add getSearchConsoleMonthlyTrend procedure — monthly clicks/impressions line chart data
- [x] Add getSearchConsoleReadyTerritories procedure — lists which territories have live GSC data
- [x] Add GSC YTD KPI cards to Analytics page (organic clicks, impressions, avg CTR with YoY delta)
- [x] Add GSC monthly trend line chart to Analytics page (clicks + impressions over time)
- [ ] Add GSC YoY comparison to the existing YoY detail table
- [x] Build GA4 client code (ready for when access is granted) — googleAnalyticsClient.ts with verifyGA4Access, fetchGA4SessionsByPage, fetchGA4TopCities, fetchGA4ChannelBreakdown
- [x] Add GA4 connection status procedure to analytics router (getGA4ConnectionStatus)
- [x] Enable guarded live Search Console imports for verified ready territories only — July 2026 data imported for Minneapolis, Montreal, Madison, Maryland Central, Columbus, and Pittsburgh; dashboard refresh control blocks ambiguous territories and incomplete months
- [x] Backfill all available Search Console metrics for ready territories through July 2026 — each ready territory has April 2025–July 2026 coverage (16 months)
- [x] Determine whether verified Search Console data exists before April 2025; label Jan–Mar reporting as unavailable rather than estimating it — all ready territory paths returned zero rows before April 2025

## Core Portal
- [x] Portal home page with franchise location cards
- [x] Sidebar navigation (PortalLayout)
- [x] Login / auth flow
- [x] Location detail pages
- [x] Dashboard pages with charts (Milwaukee, Madison, Hamilton, Durham)
- [x] Network map page
- [x] Tools page
- [x] Resources page (admin only)
- [x] Print report pages
- [x] Trigger report pages

## Data
- [x] dashboardData.ts with Milwaukee, Madison, Hamilton, Durham data
- [x] franchises.ts with all 19 territory definitions

## GBP Image Generator
- [x] Backend router (gbpImageRouter.ts) with GPT Image 2 integration (upgraded from fal.ai Flux Pro)
- [x] GPT-5.6 structured prompt builder grounded in post title/body, species, action, scene, season, territory, and suburb
- [x] Sharp brand overlay (semi-transparent Skedaddle bar, service label, city, and verified official logo on a neutral plate)
- [x] storagePut integration for image hosting
- [x] getTerritories procedure
- [x] getSuburbs procedure
- [x] generateSingle procedure
- [x] generateBulk procedure (up to 50 images, concurrency-limited, duplicate-safe, persistent progress/results)
- [x] GbpImageGenerator.tsx frontend page
- [x] Single Post input method
- [x] Bulk Manual input method (add/remove rows)
- [x] RFC 4180-aware CSV Upload input method with validation, row errors, scheduling, and template download
- [x] Progress bar during generation
- [x] Image gallery with individual download
- [x] Download All as ZIP
- [x] GBP Images nav item in PortalLayout sidebar
- [x] Route /gbp-images wired in App.tsx
- [x] Automated tests for router prompt rules, GPT Image 2 configuration, exact output sizing, QA fail-closed behavior, and CSV parsing
- [x] Vision QA for species, humane handling, anatomy, realism, setting, and professional quality with up to two retries
- [x] Persistent draft/in-review/approved/rejected asset workflow with a human review queue
- [x] Approval guard: QA must pass and the official logo must be present
- [x] GBP-post-only compliance warning; AI images must never be used as documentary job photos or in the consumer-facing GBP gallery
- [x] DB tables: gbp_image_assets and gbp_image_jobs for persistent workflow

## Lightbox Enhancements
- [x] Lightbox: add prev/next arrow navigation through all generated images
- [x] Lightbox: display the exact AI prompt used to generate the image
- [x] Lightbox: add Regenerate button to re-generate a single image from inside the lightbox

## Pending
- [x] Remaining 15 territory strategy reports (Minneapolis, Coquitlam, Baltimore, etc.)
- [ ] Logo overlay once Skedaddle logo PNG is provided

## Branding Update: Official Skedaddle Uniform (July 20)
- [x] Replace all 'teal polo shirt' technician descriptions with official Skedaddle uniform (bright lime-green polo, raccoon-in-circle logo on chest, black cap with logo, black work pants, black gloves)
- [x] Update brand overlay bar from teal to Skedaddle green (#7AC143)
- [x] Remove all fal.ai references (already done in model switch)

## Production Readiness (Review Brief — July 2026)
- [x] #1 Bulk generation job/poll pattern (fal queue API + p-limit concurrency + idempotency)
- [x] #2 Filename collision fix (content hash suffix)
- [x] #3 Vision-QA retry loop (vision model checks small-animal presence, retries once if missing)
- [x] #4 Structured-intermediate prompt builder (LLM extracts fields → deterministic template assembles prompt)
- [x] #5 Model upgrade (Claude 3.5 Haiku → best available Haiku on built-in API)
- [x] #6 Interim prompt rewrite (no negatives, balanced composition, depth-of-field, small-animal foreground)
- [x] #7 Logo overlay prep + minor code fixes (stray space, GBP sizing, flux-pro version check)

## Image Quality Fixes (July 2026)
- [x] Fix brand overlay text rendering — switched from SVG text to sharp Pango text() method (font-independent, works on any server)
- [x] Fix animal species accuracy — 2-retry QA loop with increasingly specific prompts + species descriptions in initial prompt
- [x] Fix technician-animal interaction — technician should NEVER be shown touching/handling animals directly (use exclusion devices, one-way doors, observation from distance)
- [x] Fix image dimensions — enforce 1200x900 via sharp resize after download + explicit size in API call

## Prompt Realism Overhaul (July 16)
- [x] Rewrite prompt strategy to produce realistic single-subject photos (not staged composites)
- [x] Create 10-post test CSV for bulk generation testing

## Model Switch: Flux Pro → GPT Image 2 (July 16)
- [x] Replace fal.ai Flux Pro calls with GPT Image 2 via built-in forge API
- [x] Update QA retry loop to use GPT Image 2 for retries
- [x] Remove fal.ai client import dependency from gbpImageRouter
- [x] Update tests to reflect new model (remove FAL_KEY checks)
- [x] Verify end-to-end generation works with new model

## ═══════════════════════════════════════════════════════
## PRIORITIES FROM DAVE'S RECORDINGS (July 2026)
## ═══════════════════════════════════════════════════════

## PRIORITY 1 — Territory Reports (IMMEDIATE — Dave booking calls NOW)
- [x] Finish remaining 15 territory strategy reports
- [ ] Email Kira for raw Salesforce CSV exports (not through Looker Studio)
- [x] Fix page validation — imported GSC/GA4 page evidence is checked before saying a suburb page exists or is missing
- [x] Add network close ratio by species as benchmark comparison in reports
- [x] Clarify USD vs CAD in revenue rankings (top 15 markets)
- [x] Get Ottawa GA4 access connected; durable historical backfill remains pending
- [x] Apply Skedaddle branding (logo + colors) to reports and dashboard
- [x] Stop framing total sessions as the KPI — focus on species-specific and suburb/hub page sessions
- [x] Acknowledge Hamilton covers multiple sub-markets (Kitchener, Guelph, Cambridge, Niagara, Oakville)

## PRIORITY 2 — Content Generation from Analysis
- [x] Take analysis output → generate suburb page content (SEO-optimized)
- [x] Build content into a checklist/approval workflow
- [ ] Content assigned to dev for WordPress page build
- [ ] Integrate AEO/GDO optimization research into content generation instructions
- [ ] Content plan specifies which GBP posts link back to which suburb/species pages

## PRIORITY 3 — Replicate DashThis Analytics in Dashboard
- [ ] Google Analytics page performance (sessions, engagement, key events)
- [x] Google Search Console data (clicks, impressions, avg position, top queries)
- [x] Google Business Profile data (website clicks, phone calls by month; currently manual/static imports)
- [x] Month/year filter + year-over-year comparison (last June vs this June)
- [x] Territory switching (view any location from one interface)
- [ ] Google Ads overview (spend, top cities, Local Service Ads) — future
- [ ] Meta/Facebook Ads performance — future

## PRIORITY 4 — Full GBP Post Automation Pipeline
- [ ] Content calendar per franchise location
- [ ] Auto-generate GBP post topics from content plan
- [ ] Auto-write GBP post text from topic + blog content
- [ ] Auto-generate image prompt from post text (already built)
- [ ] Auto-generate image from prompt (already built)
- [ ] Approval queue — Rachel/Sarah/Tristan review + check off
- [ ] Auto-post to GBP via API after approval
- [ ] One post at a time (not batches) to avoid context issues
- [ ] Notification system for approval queue
- [ ] GBP API OAuth integration per franchise location
- [ ] Schedule: ~20 posts/day across all territories

## PRIORITY 5 — Future Expansion
- [ ] Expand auto-posting to Instagram
- [ ] Expand auto-posting to LinkedIn
- [ ] Auto-respond to Google reviews (monitor → suggest response → client approves via text → posts)
- [x] Salesforce direct API connection (replace Looker Studio exports) — superseded September 1, 2026 by the approved UWS-owned Drive workbook source
- [ ] AI video generation for GBP/social (Seedance2 or similar)
- [ ] Sell platform to other franchises ($50K–$100K implementation)

## DATA ACCESS BLOCKERS
- [x] Get Salesforce raw CSV from Kira (email her directly — Dave approved) — superseded by the accessible fresh UWS Drive workbook
- [x] Long-term: get Salesforce API license from Barry/Ryan — removed from the active roadmap; Drive workbook is the approved source
- [ ] East Coast (Halifax/Fredericton/Moncton/St. John) — separate from main dashboard, no Salesforce data

## GBP COMPLIANCE RULES (from Dave)
- AI images OK for GBP POSTS (telling the story)
- NEVER upload AI images to GBP photos/images section (consumer-facing gallery)
- This distinction must be documented in the tool and communicated to team

## NOTES
- Dave booking Marcus call next week (Thursday 2:30 ET / 1:30 CT)
- Pennsylvania and Ohio territories next after Marcus
- Milwaukee going from $3K → $6K/month billing
- Dave willing to spend $3K tokens per client in first month
- DashThis costs $500/month — dashboard will replace it
- Dave wants platform sellable to other franchises in 7-10 months

## DashThis Replacement — Analytics Dashboard (July 23)
- [x] Database schema for GA4 sessions data (territory, page_type, year, month, sessions)
- [x] Database schema for GBP metrics (territory, metric_type, year, month, value, business_url)
- [x] Ingest page_breakdown.csv into GA4 sessions table
- [x] Ingest gbp_data.csv into GBP metrics table
- [x] tRPC procedures: getAnalyticsTerritories, getGA4Sessions, getGBPMetrics
- [x] tRPC procedures: getYoYComparison (sessions + GBP)
- [x] Analytics dashboard page with territory switcher dropdown
- [x] Month/year filter controls
- [x] KPI cards (total sessions, calls, website clicks, directions — with YoY delta)
- [x] GA4 sessions line chart (monthly trend by page type)
- [x] GBP metrics bar chart (calls, clicks, directions monthly)
- [x] YoY comparison view (this month vs same month last year)
- [x] Route /analytics wired in App.tsx + sidebar nav
- [x] Vitest tests for analytics procedures

## Analytics Dashboard Enhancements (July 23)
- [x] Automated insights panel at top of dashboard highlighting data anomalies (e.g., Milwaukee -40% sessions drop)
- [x] CSV export button for YoY detail table and filtered chart data
- [x] Detailed hover tooltips on charts showing exact numbers and dates for each data point

## Territory Grouping (July 23)
- [x] Define 19 parent territory → sub-location mapping (shared constant)
- [x] Update analytics backend to aggregate sub-locations under parent territories
- [x] Update frontend dropdowns to show 19 parent territories instead of raw sub-locations
- [ ] Allow drill-down into sub-locations within a selected territory (future enhancement)

## Insights Panel Enhancement (July 23)
- [x] Make insights panel dynamically update to show territory-specific insights for the selected parent territory

## Dave Loom Feedback Fixes (July 23)
- [x] Fix Skedaddle branding: use actual Skedaddle logo + brand colors in portal header and reports
- [x] Fix currency labels: clarify USD vs CAD on all revenue displays
- [x] Fix top 15 markets ranking: stable, consistent, with currency flags (Network page)
- [x] Add network close rate benchmark by species to analytics dashboard (Dashboard.tsx close rate table)
- [x] Fix sessions display: focus on species-specific + suburb/city pages only (Analytics.tsx)
- [x] Fix page validation in reports: use imported GA4 and GSC data to confirm page evidence
- [ ] Fix Ottawa missing from GA4 session rankings
- [ ] Fix Denver (Colorado) missing from session rankings
- [x] Flag GBP data as incomplete for multi-GBP territories (GBP disclaimer note added to Analytics.tsx)
- [ ] Fix GBP post volume: 20-25 posts/month per sub-location for large territories
- [ ] Add corporate vs franchise distinction to territory data

## Dave's Email Feedback — Strategy Template Fixes (Jul 23, 2026)
- [x] Fix report template: use combined GBP (calls + website clicks) not just calls
- [x] Fix report template: use last 12 months data (not YTD) for all sections except exec summary
- [x] Fix report template: show strengths & opportunities, never frame underperformance negatively
- [x] Fix report template: don't turn positives into negatives (e.g., concentration risk)
- [x] Fix report template: GBP post volume should be 30-40/month per territory (not 14)
- [x] Fix report template: longest possible time range for GSC (16 months or 12 + YoY)
- [x] Fix report template: don't auto-slot numbers into proposed program
- [x] Fix report template: network close rate by species benchmark comparison
- [x] Fix report template: identify anomalies (e.g., species pages linking to corporate)
- [x] Fix report template: validate all data / flag potential hallucinations
- [ ] Investigate: why Ottawa missing from session volume rankings
- [ ] Investigate: why Hamilton shows above Milwaukee in sessions (data accuracy)
- [ ] Investigate: how Denver/Colorado compares in sessions
- [ ] Include Waukesha in Wisconsin territory data
- [x] Generate corrected reports for all 15 remaining territories
- [x] Update Home page to show all 19 territories (change filter from full-data to dashboard-ready)
- [x] Update admin note text since all territories now have dashboards

## Report Review Fixes (Jul 23, 2026)
- [x] Remove per-species avg ticket column (all identical, misleading)
- [x] Merge duplicate suburb entries (e.g., Lasalle/LaSalle in Windsor)
- [x] Fix section numbering (sequential 01-10)
- [x] Add note for newly activated GBP profiles (many zero months)
- [x] Fix grammar: singular/plural suburb names in opportunity callouts
- [x] Re-upload all 15 corrected reports

## Revenue Data Validation (Jul 28, 2026 — Dave Loom Feedback)
- [x] CRITICAL: Investigate revenue doubling — London shows $2.64M vs actual $1.08M (Barry says double)
- [x] CRITICAL: Investigate Denver suburb revenue rankings — Aurora shows highest but Salesforce says Denver > Littleton > Aurora
- [x] Validate all territory revenue numbers against CSV source data
- [x] Fix root cause of revenue discrepancy (Looker CSV double-counting + AI-fabricated data for missing territories)
- [x] Regenerate all 18 territory reports with corrected revenue data from Kira's verified Salesforce exports
- [ ] Send validation summary to Dave/Ryan/Barry
- [x] Future: Investigate Salesforce MCP/API for direct data access — superseded by the approved Drive workbook workflow
- [ ] Use Basecamp for communication going forward (Dave's request)

## Salesforce Integration (Aug 4, 2026)
- [x] Install jsforce package
- [x] Add Salesforce OAuth env vars to server env config (SF_CLIENT_ID, SF_CLIENT_SECRET, SF_LOGIN_URL)
- [x] Create salesforce_connections DB table (stores refresh_token, access_token, instance_url per org)
- [x] Create server/salesforceClient.ts (jsforce connection helper with token refresh)
- [x] Create server/salesforceRouter.ts (tRPC procedures: connect status, initiate OAuth, schema discovery, data queries)
- [x] Add Salesforce OAuth callback route to server/_core/oauth.ts
- [x] Create client/src/pages/SalesforceConnect.tsx (admin-only page with connect button + status)
- [x] Wire /salesforce route in App.tsx + sidebar nav (admin only)
- [x] Write vitest tests for Salesforce router
- [x] Prepare Monday meeting guide for Barry

## Proposal Generator (Aug 4, 2026)
- [x] Create server/proposalRouter.ts (tRPC procedures: generate proposal, list territories)
- [x] Integrate Claude Opus 5 for territory-specific narrative generation
- [x] Build PDF generation using the Ottawa/Minneapolis proposal template structure
- [x] Create client/src/pages/ProposalGenerator.tsx (territory selector + generate button + preview)
- [x] Wire /proposals route in App.tsx + sidebar nav
- [x] Auto-populate suburb names, revenue, seasonal timing from existing data
- [x] 3-tier pricing table (Essential $1,750 / Growth $2,000 / Accelerator $2,350)
- [x] Current vs. New comparison table
- [x] PDF download functionality
- [x] Write vitest tests for proposal router

## Strategy Report Generator (Aug 5, 2026)
- [x] Create server/strategyReportRouter.ts — multi-section generation engine
- [x] Build territory data object assembler (single source of truth per territory)
- [x] Build deterministic template sections (tables, comparisons — no AI needed)
- [x] Build AI narrative sections with sequential context passing (Claude Sonnet 4)
- [x] Section order matches Dave's gold standard: Exec Summary → Current Campaign → Species → Suburbs → GBP Performance → Gap Analysis → Proposed Program → Scale Comparison → Content Architecture → GBP Strategy → 90-Day Plan → Risks → Recommendations
- [x] HTML assembly with consistent styling, page breaks, headers
- [x] PDF generation via Puppeteer (same pipeline as proposal generator)
- [x] Store generated reports in S3 with download URL
- [x] Create client/src/pages/StrategyReportGenerator.tsx — territory selector + progress + preview + download
- [x] Wire /strategy-report route in App.tsx + sidebar nav
- [x] Write vitest tests for strategy report router
- [x] Save checkpoint and deploy

## Strategy Report Accuracy Fixes (Aug 5, 2026)
- [x] Calculate real network avg job value by species from all 19 territories (replaced hardcoded 57% close rate with $2,203 avg job value benchmark)
- [x] Add network benchmark column to species table ("vs. Network" comparison)
- [x] Validate suburb pages via curated action plan data (Hamilton, Durham, Milwaukee, Madison — based on known page builds from action plans, not GSC URL data)
- [x] Show "Unknown" instead of "None" for unaudited territory suburb pages
- [x] Fix gap analysis AI prompt to be honest about unknown vs confirmed page status
- [x] Derive current GBP post volume estimate from GBP engagement data (labeled as estimate — actual post counts not available in ingested data)
- [x] Fix scale comparison table to use estimated current values (labeled appropriately where data unavailable)
- [ ] Future: Ingest actual GBP post counts for true post volume tracking
- [ ] Future: Crawl skedaddlewildlife.com to validate actual suburb page existence via URL matching
- [x] Add sub-market context from territoryMapping.ts (Hamilton covers 7 sub-locations, etc.)
- [x] Show sub-market list and GBP listing count in Current Campaign section
- [x] Update tests to reflect new data structure (60/60 passing)
- [x] Filter sessions to species-specific and suburb pages only (not total sessions) when direct GA4 page imports are present; migration/backfill still required

## Suburb Page Content Generator (Aug 5, 2026)
- [x] Save Prior Lake template as schema reference in project
- [x] Create server/suburbPageRouter.ts — content generation engine (Claude Opus 5)
- [x] Build parameterized JSON-LD schema template (8 blocks from Prior Lake pattern)
- [x] Build species-weighted body copy generator (Tier 1: 130-150 words, Tier 2: 80-100, Tier 3: 40-60)
- [x] Build meta title/description generator
- [x] Build neighbourhood/AEO direct-answer section generator
- [x] Build FAQ generator with verified data references
- [x] Build source citation system (GBP, Salesforce, website, municipal, "confirm with franchisor")
- [x] Create DB table: suburb_pages (id, territory_id, suburb, status, content_json, schema_json, meta, reviewer notes)
- [x] Create client/src/pages/SuburbPageGenerator.tsx — territory/suburb selector + generate + preview
- [x] Build approval workflow UI (draft → in_review → approved → exported)
- [x] Build rendered preview with source citations highlighted
- [x] Build export function (structured markdown/HTML for WordPress)
- [x] Wire /suburb-pages route in App.tsx + sidebar nav
- [x] Write vitest tests
- [x] Save checkpoint and deploy

## Sonar Research Integration (Aug 6, 2026)
- [x] Verify SONAR_API_KEY is available in server env
- [x] Build callSonar() helper function (sonar-pro model)
- [x] Build researchSuburb() — 3 parallel queries: page validation, local facts, competitor landscape
- [x] Parse Sonar responses into structured SuburbResearch object
- [x] Inject Sonar research into Claude Opus 5 prompts (intro, neighbourhood sections)
- [x] Update citation system to include Sonar source URLs (page status, county, neighbourhoods, competitors)
- [x] Add research status indicator to frontend UI (shows "Researching with Sonar..." during generation, including its research steps and reviewer guidance)
- [x] Add SONAR_API_KEY to env.ts and verified in environment
- [x] Write tests for Sonar integration (73/73 passing)
- [x] Deploy

## Repository Review (Aug 6, 2026)
- [x] Inspect and review GPT's recent repository additions — branch `codex/product-coherence-reporting` found; requires a small JSX fix before it can be merged
- [x] Fix, validate, and merge the approved `codex/product-coherence-reporting` branch — repaired the GBP chart JSX, TypeScript clean, 73/73 tests passing
- [x] Create and commit a comprehensive GPT collaboration brief for the Skedaddle portal
- [x] Remove duplicate species bar chart from Dashboard — Dave prefers pie chart only (per Aug 17 meeting)
- [ ] Build GBP YoY line overlay chart — two years on same chart for visual comparison (Dave's Aug 17 request)
- [x] Build GBP YoY line overlay chart — two years on same chart for visual comparison (Dave's Aug 17 request)
- [x] Fix empty Executive Summary in strategy reports — added retry logic + data-driven fallback
- [x] Implement dual-path LLM: Opus 5 direct API primary → forge API (claude-opus-4-7) fallback for reliability
- [x] Fix PDF pagination: prevent table splits, orphaned headings, add header row repetition on multi-page tables

## Codex Update Review — Aug 24, 2026
- [x] Fetch and identify the newly available Codex/GPT branch or pull request — reviewed the two new `agent/analytics-report-integration` commits beyond the previously integrated base
- [x] Verify the branch base and compare its actual commits against current main — branch based on the latest reviewed report-integration work, not stale history
- [x] Review data accuracy safeguards, authentication compatibility, migrations, and preservation of GSC/GA4/report functionality — fixed the introduced Manus OAuth regression and retained report-period/data-availability safeguards
- [x] Run TypeScript, full Vitest suite, production build, targeted endpoint tests, and visual checks before approval — 99 passed, 10 skipped; build passed; real preview/export and 19-page PDF verified
- [x] Merge and publish only if verification passes; document findings and update session memory — published as checkpoint `8de308da`

## GitHub Ownership Transfer — Aug 26, 2026
- [x] Confirm the current `aybello/skedaddle` repository ownership and the exact UWS GitHub destination username or organization — authenticated UWS account is `uws-dev`
- [x] Verify the UWS destination can accept the repository name and that Ay has sufficient transfer permissions — Ay is source admin; authenticated `uws-dev` session controls the empty destination; name becomes available after deletion
- [x] Resolve the existing empty `uws-dev/skedaddle` repository name conflict without losing the populated source repository — GitHub confirmed the empty placeholder was deleted; source and mirror backup remain intact
- [x] Create a pre-transfer checkpoint and document branches, pull requests, default branch, and remote URLs — checkpoint `0400ee85`; validated mirror backup created at `/home/ubuntu/backups/skedaddle-pretransfer.git`
- [x] Obtain explicit confirmation for permanently deleting the empty placeholder and transferring repository ownership to `uws-dev`
- [x] Complete the ownership transfer through an authenticated `aybello` browser session because the project GitHub integration returned `403 Resource not accessible by integration` for repository administration — GitHub confirmed the transfer request to `uws-dev`
- [x] Transfer the populated repository from `aybello` to `uws-dev` — canonical repository is now `uws-dev/skedaddle`; all five branches and PRs #1–#3 preserved
- [x] Reconnect the Manus project to the transferred repository — GitHub App re-authorized, remote credential refreshed, and push dry run succeeds against `uws-dev/skedaddle`
- [x] Restore `aybello` from retained write access to Admin access on `uws-dev/skedaddle` — verified from Ay's authenticated account
- [x] Verify checkpoint push, all five branches, PRs #1–#3, auto-publish, and production site health after GitHub App authorization — local and UWS `main` synchronized; production returned HTTP 200
- [x] Update project documentation and session memory with the new canonical GitHub repository URL — `https://github.com/uws-dev/skedaddle`

## Manus GitHub Settings Synchronization — Aug 27, 2026
- [x] Inspect the project’s stored GitHub metadata and determine why Settings still offers “Create repository” for the existing `uws-dev/skedaddle` repository — the panel tracks Manus’s create/export workflow separately from the verified `user_github` remote
- [x] Confirm whether the Management UI supports attaching an existing repository or only creating a new one — this panel only creates a new repository and does not expose an existing-repository attach option
- [x] Resolve the metadata choice without deleting, recreating, or duplicating the repository — user chose to keep the verified existing `uws-dev/skedaddle` setup; the export-only panel will remain untouched
- [x] Verify checkpoint synchronization, repository history, branches, pull requests, and production health after preserving the current setup — push access succeeds, five branches and PRs #1–#3 remain present, Ay is Admin, and production returns HTTP 200
- [x] Update session memory with the final Management UI synchronization status — existing UWS repository preserved; export-only panel intentionally left unchanged

## Salesforce Data Sync Drive Review — Aug 31, 2026
- [x] Inventory the shared Drive folder and confirm access to all files — six files, no subfolders
- [x] Read the five smaller Sheets/Docs and export their complete contents for review
- [x] Read the oversized Salesforce master sheet through the Sheets API in six ranges and validate all 269,890 current rows
- [x] Cross-check exact workbook totals, periods, status values, species, city, and territory structures without estimating missing data
- [x] Document the Salesforce status-mapping, mixed-currency, snapshot-timing, and sensitive-data caveats for future portal integration

## Live Google Business Profile Integration — Aug 31, 2026
- [x] Audit the current static GBP data, database schema, analytics procedures, dashboard charts, and Google credential setup
- [x] Confirm the official GBP APIs, OAuth scopes, UWS account access, and available Skedaddle profile inventory — 32 profiles visible; Performance API enabled but zero approved quota
- [x] Submit the official GBP API allowlist request — Google case `6-1216000040949`, with stated 7–10 business-day review window
- [x] Document the OAuth, mapping, persistence, audit, source-label, and manual-refresh design in `GBP_LIVE_DATA_MODEL.md`
- [x] Create a source-traceable GBP location-to-territory candidate registry with explicit ready, review-required, and excluded states; live API resource reconciliation remains mandatory before import
- [x] Add durable GBP location, raw-daily-metric, territory-monthly, and import-run tables with source periods, import timestamps, coverage counts, and unique safeguards; reviewed migration `0007_dizzy_falcon.sql` applied
- [x] Add a fail-closed GBP OAuth client contract and pure coverage safeguards; live API requests remain disabled until project secrets and Google approval are verified
- [x] Correct the Analytics GBP disclosure to identify current values as legacy spreadsheet data rather than a live connection
- [x] Add a public, read-only GBP readiness endpoint and dashboard status that exposes the pending case, OAuth readiness, and safe mapping counts without querying GBP or enabling refresh
- [x] Create and configure the UWS Google OAuth web client with the approved production GBP callback; protected client credentials were validated with Google without requesting GBP data
- [x] Add signed, short-lived GBP OAuth-state safeguards and disabled production start/callback routes; no authorization code can be read, logged, or exchanged before approval
- [ ] Enable the prebuilt GBP OAuth flow only after Google approves access and a UWS operator explicitly authorizes the connection
- [ ] Obtain and securely store a UWS `business.manage` refresh authorization only after Google approves Performance API access; do not request GBP data before approval
- [x] Add non-network GBP persistence helpers that atomically record raw daily values, month rollups, and import-run coverage only from an explicitly validated plan; inventory persistence remains pending authoritative API access
- [ ] Build the authenticated GBP client and territory-safe historical importer
- [x] Add complete-live-first, partial-visible, unavailable-before-legacy GBP query precedence and like-for-like YoY eligibility; validated against the running Minneapolis legacy endpoint without changing its values
- [x] Refine the GBP monthly schema to preserve an explicit unavailable metric state with a nullable value, rather than falling back to legacy data after a failed or empty live metric response; reviewed migration `0008_quick_human_torch.sql` applied
- [ ] Replace static GBP dashboard snapshots with persisted live metrics and visible coverage states
- [ ] Add manual refresh controls for verified territories; do not schedule recurring imports until the live flow is validated
- [ ] Add Vitest coverage for authenticated inventory sync, raw-metric persistence, and end-to-end manual import behavior after Google credentials are approved
- [ ] Verify the live API end to end, inspect the authenticated dashboard visually, run TypeScript/tests/build, and publish
- [ ] Update the data-source documentation and session memory with the verified live GBP connection
- [x] Send Dave a concise, verified GBP preparation and approval-blocker update; sent September 1, 2026 to the established UWS address without implying that live GBP data is connected
- [x] Push the verified local GBP preparation and communication checkpoints to canonical GitHub `main` and verify the commit match; reauthorized UWS connection completed the non-force push on September 1, 2026
- [x] Diagnose the canonical GitHub push denial by verifying effective collaborator role, repository rules, and connected-token access without changing repository settings; refreshed UWS Git credential resolved the transport denial
- [x] Create a UWS-controlled, host-independent migration plan covering the Skedaddle codebase, database, secrets, auth, integrations, cutover, and rollback in `UWS_CONTROLLED_MIGRATION_PLAN.md`

## Codex Update Review — Sep 1, 2026
- [x] Identify the newly available Codex branch or pull request and establish its true merge base against current `main` — `codex/gbp-integration-safety-fixes`, commit `de9582e`, based on checkpoint `a2fc281`
- [x] Review changed code, migrations, data-integrity safeguards, and custom local-auth compatibility — documented in `CODEX_GBP_SAFETY_REVIEW_2026-09-01.md`; branch passed TypeScript and 135 tests with 11 intentional skips before integration
- [x] Correct and integrate only the approved update without regressing GSC, GA4, GBP, reports, or portal authentication — cherry-picked `de9582e` as `3b5fea5` and added persistence, parser, report-context, and insight-label safeguards
- [x] Diagnose and fix the production Ottawa strategy-report failure that returned an HTML response where the client expected JSON during fresh post-Codex verification
- [x] Diagnose and fix the production exact-draft PDF export failure: Puppeteer reports a detached `about:blank` execution context after the report preview succeeds
- [x] Run TypeScript, full Vitest, production build, relevant endpoint checks, and visual verification before publishing
- [x] Checkpoint the verified result, push canonical GitHub `main`, and update session memory — checkpoint `41023153`; local and remote `main` matched at `41023153170e60914bed4725b83a980ca059d7ae`

## Drive Workbook Salesforce Data Source — September 2026

- [x] Confirm the exact fresh Google Drive workbook, sheet/range, modification time, columns, and authorized UWS access path — `Salesforce Data` (`1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ`), `Sheet1!A:N`, version 125, modified 2026-09-01T15:11:50.582Z, 270,070 data rows, UWS-owned and readable
- [x] Mark Salesforce Connected App/API work as superseded by the approved Drive workbook workflow; active API router, OAuth callback, setup page, navigation entry, and environment contract retired while historical task records remain
- [x] Define source provenance, explicit territory mapping, status-preservation, currency, duplicate-ID, incomplete-period, sensitive-field, and missing-value safeguards with deterministic parser tests
- [x] Implement an auditable workbook import path that preserves source timestamps and never estimates missing Salesforce values — bounded read-only client, deterministic parser, atomic lock, unchanged-source skip, retained prior successful run, transactional aggregates, and failure audit complete
- [ ] Run the approved Salesforce Drive workbook import automatically once per day with deterministic locking, change detection, failure auditing, and no AI-generated data — authenticated idempotent callback complete; deployed Heartbeat creation pending
- [ ] Keep the daily workbook callback within the platform execution deadline — first post-deployment run completed safely in 32 seconds but Heartbeat timed out at 30 seconds; bounded Sheets ranges increased from 10,000 to 50,000 rows pending production retest
- [x] Verify the deployed read-only Google service identity can access the approved workbook independently of the interactive UWS Drive session — exact workbook title, Sheet1, and 14-field header contract returned successfully
- [x] Enable the Google Sheets API in `uws-gbp-analytics` with explicit approval, then re-run the service-identity workbook access check — enabled and verified read-only on September 1, 2026
- [ ] Select and document the daily Eastern-time execution window after confirming the workbook’s observed update pattern
- [ ] Update portal and report source disclosures to identify the Drive workbook rather than a live Salesforce API
- [ ] Add read-only portal status and territory-period procedures for the active workbook run without exposing raw addresses, IDs, or salesperson fields — procedures implemented; endpoint/UI verification pending
- [ ] Verify database reconciliation, endpoints, authenticated UI, reports, tests, and production build before activation
- [ ] Checkpoint the verified workbook workflow, push canonical GitHub `main`, and update session memory
