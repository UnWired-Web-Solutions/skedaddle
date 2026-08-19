# Skedaddle Franchise Portal — TODO

## Repository Updates Review (Aug 18, 2026)
- [x] Inspect and assess newly available repository updates before integration — `codex/meeting-report-priorities` validated (76 passed, 1 skipped); needs one GSC query-scope safeguard before merge
- [ ] Publish and verify the merged `codex/meeting-report-priorities` update — safeguard, merge, database migration, TypeScript, and 76 passing tests complete

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
- [x] Backend router (gbpImageRouter.ts) with fal.ai Flux Pro integration
- [x] LLM prompt builder from post title/body
- [x] Sharp brand overlay (Skedaddle green bar, service label, city, Skedaddle name)
- [x] storagePut integration for image hosting
- [x] getTerritories procedure
- [x] getSuburbs procedure
- [x] generateSingle procedure
- [x] generateBulk procedure (up to 50 images)
- [x] GbpImageGenerator.tsx frontend page
- [x] Single Post input method
- [x] Bulk Manual input method (add/remove rows)
- [x] CSV Upload input method with template download
- [x] Progress bar during generation
- [x] Image gallery with individual download
- [x] Download All as ZIP
- [x] GBP Images nav item in PortalLayout sidebar
- [x] Route /gbp-images wired in App.tsx
- [x] Vitest tests for router and FAL_KEY

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
- [ ] Fix page validation — use GSC/GA to confirm pages exist before saying "no page found"
- [ ] Add network close ratio by species as benchmark comparison in reports
- [ ] Clarify USD vs CAD in revenue rankings (top 15 markets)
- [ ] Get Ottawa GA4 data connected
- [ ] Apply Skedaddle branding (logo + colors) to reports and dashboard
- [ ] Stop framing total sessions as the KPI — focus on species-specific and suburb/hub page sessions
- [ ] Acknowledge Hamilton covers multiple sub-markets (Kitchener, Guelph, Cambridge, Niagara, Oakville)

## PRIORITY 2 — Content Generation from Analysis
- [ ] Take analysis output → generate suburb page content (SEO-optimized)
- [ ] Build content into a checklist/approval workflow
- [ ] Content assigned to dev for WordPress page build
- [ ] Integrate AEO/GDO optimization research into content generation instructions
- [ ] Content plan specifies which GBP posts link back to which suburb/species pages

## PRIORITY 3 — Replicate DashThis Analytics in Dashboard
- [ ] Google Analytics page performance (sessions, engagement, key events)
- [ ] Google Search Console data (clicks, impressions, avg position, top queries)
- [ ] Google Business Profile data (website clicks, phone calls by month)
- [ ] Month/year filter + year-over-year comparison (last June vs this June)
- [ ] Territory switching (view any location from one interface)
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
- [ ] Salesforce direct API connection (replace Looker Studio exports)
- [ ] AI video generation for GBP/social (Seedance2 or similar)
- [ ] Sell platform to other franchises ($50K–$100K implementation)

## DATA ACCESS BLOCKERS
- [ ] Get Salesforce raw CSV from Kira (email her directly — Dave approved)
- [ ] Long-term: get Salesforce API license from Barry/Ryan
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
- [ ] Fix page validation in reports: use GA4 data to confirm pages exist
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
- [ ] Future: Investigate Salesforce MCP/API for direct data access
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
- [ ] Filter sessions to species-specific and suburb pages only (not total sessions) — requires GA4 page-level data not yet ingested

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
