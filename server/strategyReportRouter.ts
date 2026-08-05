import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import puppeteer from "puppeteer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TerritoryDataObject {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  currency: "CAD" | "USD";
  currencySymbol: string;
  totalRevenue: number;
  totalJobs: number;
  avgJobValue: number;
  species: Array<{
    species: string;
    total_revenue: number;
    total_jobs: number;
    pctRevenue: number;
    avgJobValue: number;
  }>;
  suburbs: Array<{
    suburb: string;
    revenue: number;
    jobs: number;
    avgJobValue: number;
    pctRevenue: number;
    hasPage: boolean; // We assume no suburb pages exist unless proven otherwise
  }>;
  gbp: {
    monthly: Array<{ month: string; searches: number; calls: number; website_clicks: number }>;
    totalSearches: number;
    totalCalls: number;
    totalClicks: number;
    peakMonth: string;
    peakCalls: number;
    avgMonthlyCalls: number;
    avgMonthlyClicks: number;
  };
  gsc: {
    monthly: Array<{ month: string; clicks: number; impressions: number; avg_position: number }>;
    totalClicks: number;
    totalImpressions: number;
  };
  seasonalTiming: string;
  topSpeciesNames: string[];
  topSuburbNames: string[];
  networkCloseRate: number; // Network average for benchmarking
}

// ─── Section definitions ─────────────────────────────────────────────────────

export type SectionId =
  | "executive_summary"
  | "current_campaign"
  | "data_foundation"
  | "species_analysis"
  | "suburb_revenue"
  | "gap_analysis"
  | "proposed_program"
  | "scale_comparison"
  | "content_architecture"
  | "gbp_strategy"
  | "local_seo"
  | "ninety_day_plan"
  | "risks"
  | "recommendations";

export interface SectionResult {
  id: SectionId;
  title: string;
  html: string;
  isAiGenerated: boolean;
}

// ─── Seasonal data by state ─────────────────────────────────────────────────

const SEASONAL_DATA: Record<string, string> = {
  ON: "raccoon denning in May and June, bat maternity exclusion window in August, mice entry peak in September and October, squirrel attic activity in spring and fall",
  BC: "spring bat emergence and roosting in April, raccoon denning in May, rat activity year-round with peaks in fall, squirrel attic entry in spring and fall",
  QC: "raccoon denning in May and June, bat maternity colonies forming in June, mice seeking entry in September and October, squirrel activity in spring and fall",
  MN: "spring bat emergence in April, raccoon denning in May, summer squirrel attic activity, fall rodent entry from September through November",
  WI: "spring bat emergence in April, raccoon denning in May, summer squirrel attic activity, fall rodent entry from September through November",
  OH: "spring raccoon denning in April and May, bat maternity colonies in June, fall mice and squirrel entry from September, winter rodent pressure through December",
  CO: "spring raccoon activity in April, bat emergence in May, summer squirrel attic entry, fall mice and rat entry from September through November",
  GA: "year-round raccoon and squirrel activity, bat maternity colonies from April through August, fall rodent entry from October, winter attic denning from December",
  MD: "spring raccoon denning in April and May, bat maternity colonies from May through August, fall squirrel and mice entry from September, winter rodent pressure",
  PA: "spring raccoon denning in April and May, bat maternity exclusion window from June through August, fall rodent entry from September, winter mice and squirrel pressure",
  NS: "spring raccoon denning in April and May, bat emergence in May, mice and rat entry from September through November, squirrel attic activity in spring and fall",
  NB: "spring raccoon denning in April and May, bat emergence in May, mice and rat entry from September through November, squirrel attic activity in spring and fall",
  default: "spring wildlife emergence and denning activity, summer bat maternity season, fall rodent entry pressure, winter attic denning and overwintering",
};

// ─── Build Territory Data Object ─────────────────────────────────────────────

export async function buildTerritoryData(territoryId: string): Promise<TerritoryDataObject> {
  const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
  const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");

  const location = FRANCHISE_LOCATIONS.find((l: any) => l.id === territoryId);
  if (!location) throw new Error(`Territory not found: ${territoryId}`);

  const dashData = DASHBOARD_DATA[territoryId];
  if (!dashData) throw new Error(`No dashboard data for: ${territoryId}`);

  const totalRevenue = dashData.total_revenue;
  const totalJobs = dashData.total_jobs;
  const avgJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0;

  // Enrich species data
  const species = dashData.species
    .filter((s: any) => s.total_revenue > 0)
    .map((s: any) => ({
      species: s.species,
      total_revenue: s.total_revenue,
      total_jobs: s.total_jobs,
      pctRevenue: totalRevenue > 0 ? (s.total_revenue / totalRevenue) * 100 : 0,
      avgJobValue: s.total_jobs > 0 ? s.total_revenue / s.total_jobs : 0,
    }));

  // Enrich suburb data
  const suburbs = dashData.suburbs.map((s: any) => ({
    suburb: s.suburb,
    revenue: s.revenue,
    jobs: s.jobs,
    avgJobValue: s.jobs > 0 ? s.revenue / s.jobs : 0,
    pctRevenue: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
    hasPage: false, // Default assumption: no suburb pages exist
  }));

  // GBP aggregation
  const gbpMonthly = dashData.gbp.monthly || [];
  const totalSearches = gbpMonthly.reduce((sum: number, m: any) => sum + m.searches, 0);
  const totalCalls = gbpMonthly.reduce((sum: number, m: any) => sum + m.calls, 0);
  const totalClicks = gbpMonthly.reduce((sum: number, m: any) => sum + m.website_clicks, 0);
  const peakMonth = gbpMonthly.length > 0
    ? gbpMonthly.reduce((max: any, m: any) => m.calls > max.calls ? m : max, gbpMonthly[0])
    : { month: "N/A", calls: 0 };
  const avgMonthlyCalls = gbpMonthly.length > 0 ? totalCalls / gbpMonthly.length : 0;
  const avgMonthlyClicks = gbpMonthly.length > 0 ? totalClicks / gbpMonthly.length : 0;

  // GSC data
  const gscMonthly = dashData.gsc.monthly || [];
  const totalGscClicks = gscMonthly.reduce((sum: number, m: any) => sum + m.clicks, 0);
  const totalImpressions = gscMonthly.reduce((sum: number, m: any) => sum + m.impressions, 0);

  return {
    id: territoryId,
    name: dashData.name,
    city: location.city,
    state: location.state,
    country: location.country === "CA" ? "Canada" : "United States",
    currency: dashData.currency,
    currencySymbol: dashData.currency === "CAD" ? "CA$" : "$",
    totalRevenue,
    totalJobs,
    avgJobValue,
    species,
    suburbs,
    gbp: {
      monthly: gbpMonthly,
      totalSearches,
      totalCalls,
      totalClicks,
      peakMonth: peakMonth.month,
      peakCalls: peakMonth.calls,
      avgMonthlyCalls,
      avgMonthlyClicks,
    },
    gsc: {
      monthly: gscMonthly,
      totalClicks: totalGscClicks,
      totalImpressions,
    },
    seasonalTiming: SEASONAL_DATA[location.state] || SEASONAL_DATA["default"],
    topSpeciesNames: species.slice(0, 5).map((s: any) => s.species),
    topSuburbNames: suburbs.slice(0, 8).map((s: any) => s.suburb),
    networkCloseRate: 57, // Network average from Dave's Ottawa data
  };
}

// ─── Claude API helper ───────────────────────────────────────────────────────

async function callClaude(prompt: string, model: string = "claude-sonnet-4-20250514", maxTokens: number = 4000): Promise<string> {
  const apiKey = ENV.anthropicApiKey;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`Claude API error (${model}):`, resp.status, errText);
    throw new Error(`Claude API error: ${resp.status}`);
  }

  const result = await resp.json() as { content: Array<{ text: string }> };
  return result.content[0]?.text || "";
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatCurrency(amount: number, symbol: string): string {
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
  return `${symbol}${amount.toFixed(0)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ─── Section Generators ──────────────────────────────────────────────────────

async function generateExecutiveSummary(data: TerritoryDataObject): Promise<string> {
  const prompt = `You are writing the Executive Summary section of a franchise digital marketing strategy document for Skedaddle Humane Wildlife Control — the "${data.name}" territory (${data.city}, ${data.state}, ${data.country}).

TERRITORY DATA:
- Total closed revenue (trailing 12 months): ${formatCurrency(data.totalRevenue, data.currencySymbol)}
- Total closed jobs: ${formatNumber(data.totalJobs)}
- Average job value: ${formatCurrency(data.avgJobValue, data.currencySymbol)}
- Top species by revenue: ${data.topSpeciesNames.join(", ")}
- Top suburbs/cities by revenue: ${data.topSuburbNames.slice(0, 6).join(", ")}
- GBP total calls (available period): ${formatNumber(data.gbp.totalCalls)}
- GBP total website clicks: ${formatNumber(data.gbp.totalClicks)}
- Network average close rate: ${data.networkCloseRate}%
- Seasonal timing: ${data.seasonalTiming}

Write a compelling 3-4 paragraph executive summary that:
1. Opens with the territory name and key revenue/jobs metrics
2. Identifies the top 2-3 species driving revenue and the top suburbs generating demand
3. Notes the GBP performance as a lead source (calls + clicks combined)
4. Ends with a clear 2-sentence recommendation: structured local SEO + hub-and-spoke content model to grow organic visibility

STYLE: Professional, data-backed, direct. Written like a senior digital strategist who has studied this territory's numbers. No fluff, no AI-sounding phrases like "leverage" or "harness." Every claim backed by a number from the data above.

Return ONLY the paragraph text (no headings, no HTML tags, no markdown). Use plain text with line breaks between paragraphs.`;

  const text = await callClaude(prompt, "claude-sonnet-4-20250514", 1500);

  // Convert plain text paragraphs to HTML
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.map(p => `<p class="narrative">${p.trim()}</p>`).join("\n");
}

async function generateGapAnalysis(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const suburbsWithoutPages = data.suburbs.filter(s => !s.hasPage).slice(0, 10);
  const suburbGapList = suburbsWithoutPages
    .map(s => `${s.suburb}: ${formatCurrency(s.revenue, data.currencySymbol)} revenue, ${s.jobs} jobs — NO dedicated page`)
    .join("\n");

  const prompt = `You are writing the "Content Architecture Gap Analysis" section of a franchise digital marketing strategy document for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT (from earlier sections):
${priorContext}

SUBURB DATA (suburbs generating revenue but with NO dedicated website page):
${suburbGapList}

TERRITORY TOTALS:
- Total revenue: ${formatCurrency(data.totalRevenue, data.currencySymbol)}
- Total jobs: ${formatNumber(data.totalJobs)}
- Top species: ${data.topSpeciesNames.join(", ")}

Write 3-4 paragraphs that:
1. State the structural gap clearly: despite these suburbs generating significant revenue, NONE have dedicated primary pages on the website
2. Quantify the opportunity — total revenue from suburbs without pages
3. Explain WHY this matters for SEO: no local page = no organic ranking signal for high-intent searches like "[species] removal [suburb]"
4. Position this as "the primary structural gap and clearest opportunity for organic search growth"

STYLE: Analytical, revenue-backed, persuasive. Each suburb mentioned must include its actual revenue figure. The tone should make it obvious that NOT building these pages is leaving money on the table.

Return ONLY paragraph text (no headings, no HTML, no markdown).`;

  const text = await callClaude(prompt, "claude-sonnet-4-20250514", 1500);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.map(p => `<p class="narrative">${p.trim()}</p>`).join("\n");
}

async function generateProposedProgram(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const prompt = `You are writing the "Proposed Program" section of a franchise digital marketing strategy document for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT (key conclusions from data and gap analysis):
${priorContext}

TERRITORY DATA:
- Top suburbs needing pages: ${data.topSuburbNames.slice(0, 6).join(", ")}
- Top species: ${data.topSpeciesNames.join(", ")}
- Seasonal timing: ${data.seasonalTiming}
- Country: ${data.country}

Write 4-5 paragraphs describing the proposed full program across these four areas:
1. GBP Optimization & Post Program: Scale from current low volume to 30-40 posts/month using a 4-stream model (species-driven, suburb/neighbourhood, proof/trust, seasonal/educational)
2. Website Content Architecture: Build dedicated suburb pages in revenue order, species pages optimized for AEO/GEO, hub-and-spoke model
3. Blog Content Reorientation: Shift from generic educational content to conversion-oriented, species×suburb×season combinations
4. Local SEO Foundation: Schema markup, NAP citation audit, internal linking, rank tracking

For each area, be specific about what changes and why, referencing the territory's actual suburbs and species.

STYLE: Strategic and specific. Reference actual suburb names and species. Written like a recommendation from someone who has spent weeks analyzing this territory's data. No generic marketing language.

Return ONLY paragraph text (no headings, no HTML, no markdown). Separate the 4 areas with double line breaks.`;

  const text = await callClaude(prompt, "claude-sonnet-4-20250514", 2500);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.map(p => `<p class="narrative">${p.trim()}</p>`).join("\n");
}

async function generateContentArchitecture(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const prompt = `You are writing the "Website Content Architecture" section of a franchise digital marketing strategy for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT:
${priorContext}

TERRITORY DATA:
- Top suburbs by revenue: ${data.suburbs.slice(0, 8).map(s => `${s.suburb} (${formatCurrency(s.revenue, data.currencySymbol)})`).join(", ")}
- Top species: ${data.species.slice(0, 5).map(s => `${s.species} (${formatPct(s.pctRevenue)} of revenue)`).join(", ")}
- Total suburbs with revenue: ${data.suburbs.length}

Write a detailed content architecture section covering:
1. The Hub-and-Spoke Model explanation (hub page = main territory page, spokes = suburb pages + species pages)
2. Content types and word count guidance: Hub pages 1500-2200 words, Species pages 1000-1500 words, Suburb pages 900-1400 words, Species×Location pages 700-1000 words
3. Page build priority order (based on revenue ranking) — name the specific suburbs in order
4. Species page priority weighting (Tier 1, Tier 2, Tier 3 based on revenue/job volume)
5. Blog reorientation strategy: from generic educational → conversion-oriented, suburb-specific, species×suburb×season combinations

STYLE: Detailed and prescriptive. This section should read like a content strategist's build plan — specific enough that a developer could start building pages from it. Reference actual suburb names and revenue figures.

Return ONLY paragraph text (no headings, no HTML, no markdown). Use double line breaks between subsections.`;

  const text = await callClaude(prompt, "claude-sonnet-4-20250514", 3000);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.map(p => `<p class="narrative">${p.trim()}</p>`).join("\n");
}

async function generateGbpStrategy(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const prompt = `You are writing the "Google Business Profile Strategy" section of a franchise digital marketing strategy for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT:
${priorContext}

GBP DATA:
- Total calls (available period): ${formatNumber(data.gbp.totalCalls)}
- Total website clicks: ${formatNumber(data.gbp.totalClicks)}
- Peak month: ${data.gbp.peakMonth} (${data.gbp.peakCalls} calls)
- Average monthly calls: ${Math.round(data.gbp.avgMonthlyCalls)}
- Average monthly clicks: ${Math.round(data.gbp.avgMonthlyClicks)}
- Months of data: ${data.gbp.monthly.length}

TERRITORY CONTEXT:
- Top species: ${data.topSpeciesNames.join(", ")}
- Top suburbs: ${data.topSuburbNames.slice(0, 6).join(", ")}
- Seasonal timing: ${data.seasonalTiming}

Write a detailed GBP strategy section covering:
1. Current GBP performance baseline (use the actual numbers above)
2. The four-stream post framework: species-driven posts (14-16/month), suburb/neighbourhood posts (12-14/month), proof/trust posts (5-6/month), seasonal/educational posts (4-5/month) = 35-40 total posts/month
3. Species focus by month calendar (which species to emphasize in which months based on the seasonal timing)
4. Suburb rotation schedule (rotate through top suburbs in posts to build local relevance)
5. GBP and website alignment: posts should link to corresponding suburb/species pages once built

STYLE: Tactical and specific. This should read like a monthly playbook a marketing coordinator could execute from. Reference actual species names, suburb names, and seasonal timing for this territory.

Return ONLY paragraph text (no headings, no HTML, no markdown). Use double line breaks between subsections.`;

  const text = await callClaude(prompt, "claude-sonnet-4-20250514", 3000);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.map(p => `<p class="narrative">${p.trim()}</p>`).join("\n");
}

async function generateNinetyDayPlan(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const prompt = `You are writing the "90-Day Action Plan" section of a franchise digital marketing strategy for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT:
${priorContext}

TERRITORY DATA:
- Top suburbs (build order): ${data.topSuburbNames.slice(0, 8).join(", ")}
- Top species: ${data.topSpeciesNames.join(", ")}
- Seasonal timing: ${data.seasonalTiming}
- Country: ${data.country}

Write a detailed month-by-month 90-day plan with specific tasks organized by category. Each month should have 4 categories: Content & SEO, GBP, Local SEO/Technical, and Conversion/Sales Enablement.

MONTH 1 should focus on: foundation work (technical audit, schema, citation audit, first 2-3 suburb pages, GBP scaling to 35-40 posts, hub page refresh)

MONTH 2 should focus on: expansion (next batch of suburb pages, species×location pages, review velocity, seasonal content aligned to the territory's wildlife calendar)

MONTH 3 should focus on: optimization (review Month 1-2 data, build remaining suburb pages, species×location variants, identify best-performing content, prepare next quarter's strategy)

For each month, list 4-6 specific tasks per category. Tasks should reference actual suburb names and species from this territory.

STYLE: Actionable and specific. Each task should be concrete enough that someone could check it off a list. No vague "optimize content" — instead "Publish dedicated suburb page for ${data.topSuburbNames[0]} targeting [species] removal [suburb] keywords."

Return ONLY the text content. Format as:
Month 1 — Foundation
Content & SEO: [tasks separated by semicolons]
GBP: [tasks separated by semicolons]
Local SEO: [tasks separated by semicolons]
Conversion: [tasks separated by semicolons]

Month 2 — Expansion
[same format]

Month 3 — Optimization
[same format]`;

  const text = await callClaude(prompt, "claude-sonnet-4-20250514", 4000);
  return text; // Will be formatted in the HTML builder
}

async function generateRisksAndMitigations(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const prompt = `You are writing the "Key Risks and Mitigations" section of a franchise digital marketing strategy for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT:
${priorContext}

TERRITORY DATA:
- Total revenue: ${formatCurrency(data.totalRevenue, data.currencySymbol)}
- Top species: ${data.topSpeciesNames.join(", ")}
- Top suburbs: ${data.topSuburbNames.slice(0, 6).join(", ")}
- GBP calls: ${formatNumber(data.gbp.totalCalls)}

Identify 5-7 territory-specific risks and provide a mitigation for each. Risks should be realistic and tied to this territory's data. Examples of risk categories:
- Species pages lacking conversion content (high traffic but low close rate)
- Suburb pages being too thin/generic to rank
- GBP post volume not producing engagement
- Seasonal timing misalignment
- Content built too early before technical SEO foundation is solid
- Revenue concentration in few suburbs creating fragility
- Close rate below network average for key species

For each risk, provide: the risk statement, its potential impact, and a specific mitigation action.

STYLE: Direct and practical. Each risk should feel real and specific to this territory, not generic. Mitigations should be actionable.

Return as plain text in this format (one per line):
RISK: [risk statement] | IMPACT: [impact] | MITIGATION: [mitigation action]`;

  const text = await callClaude(prompt, "claude-sonnet-4-20250514", 2000);
  return text; // Will be formatted into a table in HTML builder
}

async function generateRecommendations(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const prompt = `You are writing the "Summary of Recommendations" section — the final section of a franchise digital marketing strategy for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT (key conclusions from the full document):
${priorContext}

TERRITORY DATA:
- Revenue: ${formatCurrency(data.totalRevenue, data.currencySymbol)}, ${formatNumber(data.totalJobs)} jobs
- Top species: ${data.topSpeciesNames.join(", ")}
- Top suburbs: ${data.topSuburbNames.slice(0, 6).join(", ")}

Write exactly 8 numbered recommendations that summarize the entire strategy. Each recommendation should be 1-2 sentences, actionable, and reference specific data points from this territory. They should cover:
1. Build suburb pages in revenue order (name the top 3)
2. Execute local SEO foundation in parallel
3. Keep the main hub page as SEO/GBP anchor
4. Weight content to the top 2 species (with their % of revenue/jobs)
5. Capitalize on seasonal species momentum
6. Align GBP post timing to species calendar
7. Build static page layer first, blog second
8. Use closed-business data as ongoing content compass

STYLE: Concise, direct, data-backed. Each recommendation should feel like a clear directive, not a suggestion.

Return as numbered list (1. ... 2. ... etc.) with no other formatting.`;

  const text = await callClaude(prompt, "claude-sonnet-4-20250514", 1500);
  return text; // Will be formatted in HTML builder
}

// ─── Deterministic Template Sections ─────────────────────────────────────────

function buildCurrentCampaignHtml(data: TerritoryDataObject): string {
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Channel</th>
          <th>Current Activity</th>
          <th>Content Type</th>
          <th>Volume</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Google Business Profile</td>
          <td>Active listing, limited posts</td>
          <td>General / unstructured</td>
          <td>3-5 posts/month</td>
        </tr>
        <tr>
          <td>Blog</td>
          <td>Educational content</td>
          <td>Generic wildlife articles</td>
          <td>2-3 posts/month</td>
        </tr>
        <tr>
          <td>Static Pages</td>
          <td>Existing species pages only</td>
          <td>Service descriptions</td>
          <td>Existing only</td>
        </tr>
        <tr>
          <td>Suburb/City Pages</td>
          <td>None</td>
          <td>—</td>
          <td>0 pages</td>
        </tr>
        <tr>
          <td>Schema Markup</td>
          <td>Basic / limited</td>
          <td>LocalBusiness only</td>
          <td>Minimal</td>
        </tr>
        <tr>
          <td>Citation/NAP</td>
          <td>Unknown / unaudited</td>
          <td>—</td>
          <td>Not tracked</td>
        </tr>
      </tbody>
    </table>
    <p class="narrative">The current program keeps the listing active and produces a baseline of educational content, but does not systematically target geographic demand. There are no dedicated suburb or city pages despite significant revenue being generated across multiple communities. The GBP post volume is well below what is needed to maintain consistent local pack visibility during peak wildlife seasons.</p>`;
}

function buildSpeciesTableHtml(data: TerritoryDataObject): string {
  const rows = data.species.slice(0, 12).map(s => `
        <tr>
          <td>${s.species}</td>
          <td class="num">${formatNumber(s.total_jobs)}</td>
          <td class="num">${formatCurrency(s.total_revenue, data.currencySymbol)}</td>
          <td class="num">${formatPct(s.pctRevenue)}</td>
          <td class="num">${formatCurrency(s.avgJobValue, data.currencySymbol)}</td>
        </tr>`).join("");

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Species</th>
          <th>Closed Jobs</th>
          <th>Closed Revenue</th>
          <th>% of Total</th>
          <th>Avg Job Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="num"><strong>${formatNumber(data.totalJobs)}</strong></td>
          <td class="num"><strong>${formatCurrency(data.totalRevenue, data.currencySymbol)}</strong></td>
          <td class="num"><strong>100%</strong></td>
          <td class="num"><strong>${formatCurrency(data.avgJobValue, data.currencySymbol)}</strong></td>
        </tr>
      </tbody>
    </table>`;
}

function buildSuburbTableHtml(data: TerritoryDataObject): string {
  const rows = data.suburbs.slice(0, 20).map(s => `
        <tr>
          <td>${s.suburb}</td>
          <td class="num">${formatCurrency(s.revenue, data.currencySymbol)}</td>
          <td class="num">${formatNumber(s.jobs)}</td>
          <td class="num">${formatCurrency(s.avgJobValue, data.currencySymbol)}</td>
          <td class="num">${formatPct(s.pctRevenue)}</td>
          <td class="status-none">None</td>
        </tr>`).join("");

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>City / Suburb</th>
          <th>Closed Revenue</th>
          <th>Jobs</th>
          <th>Avg Job Value</th>
          <th>% of Total</th>
          <th>Dedicated Page</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

function buildGbpDataHtml(data: TerritoryDataObject): string {
  if (data.gbp.monthly.length === 0) {
    return `<p class="narrative">GBP performance data is not yet available for this territory. Once connected, monthly call, click, and search data will be displayed here.</p>`;
  }

  const rows = data.gbp.monthly.map(m => `
        <tr>
          <td>${m.month}</td>
          <td class="num">${formatNumber(m.searches)}</td>
          <td class="num">${formatNumber(m.calls)}</td>
          <td class="num">${formatNumber(m.website_clicks)}</td>
          <td class="num">${formatNumber(m.calls + m.website_clicks)}</td>
        </tr>`).join("");

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Searches</th>
          <th>Calls</th>
          <th>Website Clicks</th>
          <th>Combined (Calls + Clicks)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td><strong>Total</strong></td>
          <td class="num"><strong>${formatNumber(data.gbp.totalSearches)}</strong></td>
          <td class="num"><strong>${formatNumber(data.gbp.totalCalls)}</strong></td>
          <td class="num"><strong>${formatNumber(data.gbp.totalClicks)}</strong></td>
          <td class="num"><strong>${formatNumber(data.gbp.totalCalls + data.gbp.totalClicks)}</strong></td>
        </tr>
      </tbody>
    </table>
    <p class="narrative">Peak call month: <strong>${data.gbp.peakMonth}</strong> with ${data.gbp.peakCalls} calls. Average monthly combined activity (calls + website clicks): ${Math.round(data.gbp.avgMonthlyCalls + data.gbp.avgMonthlyClicks)}. GBP is functioning as a direct lead channel — combined calls and website clicks represent the primary inbound lead volume from local search.</p>`;
}

function buildScaleComparisonHtml(data: TerritoryDataObject): string {
  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Current</th>
          <th>Proposed</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>GBP Posts / Month</td>
          <td>3-5</td>
          <td>35-40</td>
          <td class="highlight">+10-12×</td>
        </tr>
        <tr>
          <td>Blog Posts / Month</td>
          <td>2-3 (educational)</td>
          <td>3-5 (conversion-oriented)</td>
          <td>Same volume, different content</td>
        </tr>
        <tr>
          <td>Suburb/City Pages</td>
          <td>0</td>
          <td>${Math.min(data.suburbs.length, 12)} (phased build)</td>
          <td class="highlight">Net new</td>
        </tr>
        <tr>
          <td>Species × Location Pages</td>
          <td>0</td>
          <td>${Math.min(data.species.length * 3, 20)}+</td>
          <td class="highlight">Net new</td>
        </tr>
        <tr>
          <td>Schema Markup</td>
          <td>Basic</td>
          <td>Full LocalBusiness + Service + FAQ</td>
          <td>Expanded</td>
        </tr>
        <tr>
          <td>Citation/NAP Audit</td>
          <td>Not tracked</td>
          <td>Audited + corrected</td>
          <td class="highlight">Net new</td>
        </tr>
        <tr>
          <td>Rank Tracking</td>
          <td>None</td>
          <td>Weekly position monitoring</td>
          <td class="highlight">Net new</td>
        </tr>
      </tbody>
    </table>`;
}

// ─── HTML Document Assembly ──────────────────────────────────────────────────

function buildFullReportHtml(data: TerritoryDataObject, sections: SectionResult[]): string {
  const sectionHtmlParts = sections.map((section, idx) => {
    const sectionNum = String(idx + 1).padStart(2, "0");
    return `
    <!-- Section ${sectionNum}: ${section.title} -->
    <div class="section">
      <h2><span class="section-num">${sectionNum}</span> ${section.title}</h2>
      ${section.html}
    </div>`;
  });

  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.name} — Franchise Digital Marketing & Sales Strategy</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
    }

    .cover-page {
      width: 8.5in;
      height: 11in;
      padding: 1.2in 1in;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      page-break-after: always;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: #1B5E3B;
    }

    .cover-logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28pt;
      color: #1B5E3B;
      font-weight: 700;
      margin-bottom: 48px;
    }

    .cover-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22pt;
      color: #1a1a1a;
      font-weight: 700;
      margin-bottom: 12px;
      line-height: 1.3;
    }

    .cover-subtitle {
      font-size: 12pt;
      color: #555;
      margin-bottom: 48px;
    }

    .cover-meta {
      font-size: 9.5pt;
      color: #777;
      line-height: 1.8;
    }

    .cover-meta strong {
      color: #333;
    }

    .page {
      width: 8.5in;
      min-height: 11in;
      padding: 0.6in 0.8in;
      page-break-after: always;
      position: relative;
    }

    .page:last-child { page-break-after: avoid; }

    .header-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: #1B5E3B;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #e8e8e8;
      margin-bottom: 24px;
    }

    .page-header-logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 11pt;
      color: #1B5E3B;
      font-weight: 700;
    }

    .page-header-territory {
      font-size: 8.5pt;
      color: #666;
    }

    .section {
      margin-bottom: 28px;
    }

    h2 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14pt;
      color: #1B5E3B;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 2px solid #1B5E3B;
    }

    .section-num {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      font-weight: 700;
      color: #1B5E3B;
      margin-right: 8px;
      opacity: 0.7;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #2d2d2d;
      margin-top: 18px;
      margin-bottom: 8px;
    }

    p.narrative {
      font-size: 10pt;
      line-height: 1.7;
      color: #222;
      margin-bottom: 12px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 18px 0;
      font-size: 9pt;
    }

    .data-table th {
      background: #1B5E3B;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .data-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e8e8e8;
    }

    .data-table td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .data-table tr:nth-child(even) td {
      background: #f9fafb;
    }

    .data-table .total-row td {
      background: #f0f7f3;
      border-top: 2px solid #1B5E3B;
    }

    .data-table .highlight {
      color: #1B5E3B;
      font-weight: 700;
    }

    .data-table .status-none {
      color: #c0392b;
      font-weight: 600;
      font-size: 8.5pt;
    }

    .callout-box {
      background: #f0f7f3;
      border: 1px solid #c8e0d4;
      border-left: 4px solid #1B5E3B;
      border-radius: 4px;
      padding: 14px 18px;
      margin: 16px 0;
      font-size: 9.5pt;
      color: #2d5a3f;
    }

    .callout-box strong {
      color: #1B5E3B;
    }

    .action-plan-month {
      margin-bottom: 24px;
    }

    .action-plan-month h3 {
      color: #1B5E3B;
      font-size: 11pt;
      margin-bottom: 10px;
    }

    .action-category {
      margin-bottom: 12px;
    }

    .action-category-title {
      font-size: 9pt;
      font-weight: 700;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
    }

    .action-category ul {
      margin-left: 16px;
      font-size: 9.5pt;
      color: #333;
    }

    .action-category li {
      margin-bottom: 4px;
      padding-left: 4px;
    }

    .action-category li::marker {
      color: #1B5E3B;
      content: "▪ ";
    }

    .risk-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9pt;
    }

    .risk-table th {
      background: #1B5E3B;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 8.5pt;
    }

    .risk-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e8e8e8;
      vertical-align: top;
    }

    .risk-table tr:nth-child(even) td {
      background: #f9fafb;
    }

    .recommendations-list {
      counter-reset: rec-counter;
      list-style: none;
      padding: 0;
    }

    .recommendations-list li {
      counter-increment: rec-counter;
      padding: 10px 0 10px 36px;
      border-bottom: 1px solid #eee;
      position: relative;
      font-size: 10pt;
      line-height: 1.6;
    }

    .recommendations-list li::before {
      content: counter(rec-counter);
      position: absolute;
      left: 0;
      top: 10px;
      width: 24px;
      height: 24px;
      background: #1B5E3B;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: 700;
    }

    .footer {
      position: absolute;
      bottom: 0.4in;
      left: 0.8in;
      right: 0.8in;
      font-size: 7.5pt;
      color: #999;
      border-top: 1px solid #e8e8e8;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      .page { page-break-after: always; }
      .cover-page { page-break-after: always; }
    }
  </style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div class="cover-logo">Skedaddle</div>
  <div class="cover-title">Franchise Digital Marketing<br>& Sales Strategy</div>
  <div class="cover-subtitle">${data.name} Territory — ${data.city}, ${data.state}</div>
  <div class="cover-meta">
    <strong>Prepared by:</strong> Unwired Web Solutions<br>
    <strong>Date:</strong> ${dateStr}<br>
    <strong>Territory Revenue (T12):</strong> ${formatCurrency(data.totalRevenue, data.currencySymbol)}<br>
    <strong>Closed Jobs (T12):</strong> ${formatNumber(data.totalJobs)}<br>
    <strong>Data Sources:</strong> Salesforce CRM, Google Business Profile Insights${data.gsc.totalClicks > 0 ? ", Google Search Console" : ""}
  </div>
</div>

<!-- REPORT BODY -->
<div class="page">
  <div class="header-bar"></div>
  <div class="page-header">
    <div class="page-header-logo">Skedaddle</div>
    <div class="page-header-territory">${data.name} Territory — ${dateStr}</div>
  </div>
  ${sectionHtmlParts.join("\n")}
  <div class="footer">
    <span>Unwired Web Solutions | Confidential — Franchise Use Only</span>
    <span>${data.name} Territory Strategy — ${dateStr}</span>
  </div>
</div>

</body>
</html>`;
}

// ─── 90-Day Plan HTML formatter ──────────────────────────────────────────────

function formatNinetyDayPlanHtml(rawText: string): string {
  // Parse the raw text into structured months
  const months = rawText.split(/Month \d/i).filter(m => m.trim());
  let html = "";

  const monthTitles = ["Month 1 — Foundation", "Month 2 — Expansion", "Month 3 — Optimization"];

  for (let i = 0; i < Math.min(months.length, 3); i++) {
    const monthContent = months[i];
    html += `<div class="action-plan-month"><h3>${monthTitles[i] || `Month ${i + 1}`}</h3>`;

    // Try to split by categories
    const categories = monthContent.split(/(?:Content & SEO|GBP|Local SEO|Conversion|Sales Enablement)[:\s]*/i);
    const categoryNames = ["Content & SEO", "GBP", "Local SEO / Technical", "Conversion & Sales Enablement"];

    if (categories.length > 1) {
      for (let j = 1; j < categories.length && j <= 4; j++) {
        const tasks = categories[j].split(/[;\n]/).map(t => t.trim()).filter(t => t && t.length > 10);
        if (tasks.length > 0) {
          html += `<div class="action-category"><div class="action-category-title">${categoryNames[j - 1] || "Tasks"}</div><ul>`;
          tasks.slice(0, 6).forEach(task => {
            html += `<li>${task.replace(/^[-•▪]\s*/, "")}</li>`;
          });
          html += `</ul></div>`;
        }
      }
    } else {
      // Fallback: just list all tasks
      const tasks = monthContent.split(/[;\n]/).map(t => t.trim()).filter(t => t && t.length > 10);
      html += `<div class="action-category"><ul>`;
      tasks.slice(0, 12).forEach(task => {
        html += `<li>${task.replace(/^[-•▪]\s*/, "").replace(/^—\s*/, "")}</li>`;
      });
      html += `</ul></div>`;
    }

    html += `</div>`;
  }

  return html || `<p class="narrative">Detailed 90-day action plan will be customized based on territory priorities and seasonal timing.</p>`;
}

// ─── Risks table formatter ───────────────────────────────────────────────────

function formatRisksHtml(rawText: string): string {
  const lines = rawText.split("\n").filter(l => l.includes("RISK:") || l.includes("|"));
  if (lines.length === 0) {
    // Try alternate parsing
    const risks = rawText.split(/\d+\.\s*/).filter(r => r.trim());
    if (risks.length > 0) {
      let html = `<table class="risk-table"><thead><tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr></thead><tbody>`;
      risks.slice(0, 7).forEach(risk => {
        const parts = risk.split(/\|/).map(p => p.trim());
        if (parts.length >= 3) {
          html += `<tr><td>${parts[0]}</td><td>${parts[1]}</td><td>${parts[2]}</td></tr>`;
        } else {
          html += `<tr><td colspan="3">${risk.trim()}</td></tr>`;
        }
      });
      html += `</tbody></table>`;
      return html;
    }
    return `<p class="narrative">${rawText}</p>`;
  }

  let html = `<table class="risk-table"><thead><tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr></thead><tbody>`;
  lines.forEach(line => {
    const riskMatch = line.match(/RISK:\s*(.+?)\s*\|\s*IMPACT:\s*(.+?)\s*\|\s*MITIGATION:\s*(.+)/i);
    if (riskMatch) {
      html += `<tr><td>${riskMatch[1]}</td><td>${riskMatch[2]}</td><td>${riskMatch[3]}</td></tr>`;
    }
  });
  html += `</tbody></table>`;
  return html;
}

// ─── Recommendations formatter ───────────────────────────────────────────────

function formatRecommendationsHtml(rawText: string): string {
  const items = rawText.split(/\d+\.\s+/).filter(i => i.trim());
  if (items.length === 0) return `<p class="narrative">${rawText}</p>`;

  let html = `<ol class="recommendations-list">`;
  items.slice(0, 8).forEach(item => {
    html += `<li>${item.trim()}</li>`;
  });
  html += `</ol>`;
  return html;
}

// ─── Main Generation Orchestrator ────────────────────────────────────────────

export async function generateStrategyReport(
  territoryId: string,
  onProgress?: (section: string, pct: number) => void
): Promise<{ html: string; pdfUrl?: string; sections: SectionResult[] }> {
  // Step 1: Build territory data object
  onProgress?.("Building territory data...", 5);
  const data = await buildTerritoryData(territoryId);

  const sections: SectionResult[] = [];
  let priorContext = "";

  // Step 2: Executive Summary (AI)
  onProgress?.("Writing Executive Summary...", 10);
  const execSummaryHtml = await generateExecutiveSummary(data);
  sections.push({ id: "executive_summary", title: "Executive Summary", html: execSummaryHtml, isAiGenerated: true });
  priorContext += `Executive Summary established: ${data.name} territory, ${formatCurrency(data.totalRevenue, data.currencySymbol)} revenue, ${formatNumber(data.totalJobs)} jobs, top species ${data.topSpeciesNames.slice(0, 3).join(", ")}, top suburbs ${data.topSuburbNames.slice(0, 3).join(", ")}. `;

  // Step 3: Current Campaign (Template)
  onProgress?.("Building Current Campaign section...", 18);
  const currentCampaignHtml = buildCurrentCampaignHtml(data);
  sections.push({ id: "current_campaign", title: "What's Running Now — Current Campaign", html: currentCampaignHtml, isAiGenerated: false });

  // Step 4: Data Foundation — Species Analysis (Template + context)
  onProgress?.("Building Species Revenue Analysis...", 25);
  const speciesTableHtml = buildSpeciesTableHtml(data);
  const speciesNarrative = `<p class="narrative">${data.species[0]?.species || "Primary species"} leads with ${formatCurrency(data.species[0]?.total_revenue || 0, data.currencySymbol)} in closed revenue (${formatPct(data.species[0]?.pctRevenue || 0)} of total), followed by ${data.species[1]?.species || "secondary species"} at ${formatCurrency(data.species[1]?.total_revenue || 0, data.currencySymbol)}. The top ${Math.min(data.species.length, 3)} species account for ${formatPct(data.species.slice(0, 3).reduce((sum, s) => sum + s.pctRevenue, 0))} of all closed revenue — content and SEO investment should be weighted accordingly.</p>`;
  sections.push({ id: "species_analysis", title: "Sales & Species Analysis — Revenue by Species", html: speciesTableHtml + speciesNarrative, isAiGenerated: false });
  priorContext += `Top species: ${data.species.slice(0, 3).map(s => `${s.species} (${formatPct(s.pctRevenue)})`).join(", ")}. `;

  // Step 5: Suburb/City Revenue (Template)
  onProgress?.("Building Suburb Revenue Analysis...", 32);
  const suburbTableHtml = buildSuburbTableHtml(data);
  const suburbNarrative = `<p class="narrative">${data.suburbs[0]?.suburb || "Primary market"} leads with ${formatCurrency(data.suburbs[0]?.revenue || 0, data.currencySymbol)} in closed revenue across ${data.suburbs[0]?.jobs || 0} jobs. The top 5 suburbs account for ${formatPct(data.suburbs.slice(0, 5).reduce((sum, s) => sum + s.pctRevenue, 0))} of total territory revenue. Despite this revenue concentration, none of these suburbs have dedicated website pages — representing the primary content gap.</p>`;
  sections.push({ id: "suburb_revenue", title: "Revenue by City — Top Markets", html: suburbTableHtml + suburbNarrative, isAiGenerated: false });
  priorContext += `Top suburbs: ${data.suburbs.slice(0, 5).map(s => `${s.suburb} (${formatCurrency(s.revenue, data.currencySymbol)})`).join(", ")}. NONE have dedicated pages. `;

  // Step 6: GBP Performance Data (Template)
  onProgress?.("Building GBP Performance section...", 38);
  const gbpHtml = buildGbpDataHtml(data);
  sections.push({ id: "data_foundation", title: "Google Business Profile Performance", html: gbpHtml, isAiGenerated: false });
  priorContext += `GBP: ${formatNumber(data.gbp.totalCalls)} calls, ${formatNumber(data.gbp.totalClicks)} clicks over ${data.gbp.monthly.length} months. Peak: ${data.gbp.peakMonth}. `;

  // Step 7: Gap Analysis (AI)
  onProgress?.("Writing Gap Analysis...", 45);
  const gapHtml = await generateGapAnalysis(data, priorContext);
  sections.push({ id: "gap_analysis", title: "Content Architecture Gap — The Opportunity", html: gapHtml, isAiGenerated: true });
  priorContext += `Gap analysis: ${data.suburbs.filter(s => !s.hasPage).length} suburbs generating revenue have NO dedicated pages. Primary structural gap identified. `;

  // Step 8: Proposed Program (AI)
  onProgress?.("Writing Proposed Program...", 55);
  const proposedHtml = await generateProposedProgram(data, priorContext);
  sections.push({ id: "proposed_program", title: "Proposed Program — Full Build", html: proposedHtml, isAiGenerated: true });

  // Step 9: Scale Comparison (Template)
  onProgress?.("Building Scale Comparison...", 62);
  const scaleHtml = buildScaleComparisonHtml(data);
  sections.push({ id: "scale_comparison", title: "Scale Comparison — Current vs. Proposed", html: scaleHtml, isAiGenerated: false });

  // Step 10: Content Architecture (AI)
  onProgress?.("Writing Content Architecture...", 68);
  const contentArchHtml = await generateContentArchitecture(data, priorContext);
  sections.push({ id: "content_architecture", title: "Website Content Architecture", html: contentArchHtml, isAiGenerated: true });

  // Step 11: GBP Strategy (AI)
  onProgress?.("Writing GBP Strategy...", 75);
  const gbpStrategyHtml = await generateGbpStrategy(data, priorContext);
  sections.push({ id: "gbp_strategy", title: "Google Business Profile Strategy", html: gbpStrategyHtml, isAiGenerated: true });

  // Step 12: 90-Day Action Plan (AI)
  onProgress?.("Writing 90-Day Action Plan...", 82);
  const ninetyDayRaw = await generateNinetyDayPlan(data, priorContext);
  const ninetyDayHtml = formatNinetyDayPlanHtml(ninetyDayRaw);
  sections.push({ id: "ninety_day_plan", title: "90-Day Action Plan", html: ninetyDayHtml, isAiGenerated: true });

  // Step 13: Risks & Mitigations (AI)
  onProgress?.("Writing Risks & Mitigations...", 88);
  const risksRaw = await generateRisksAndMitigations(data, priorContext);
  const risksHtml = formatRisksHtml(risksRaw);
  sections.push({ id: "risks", title: "Key Risks and Mitigations", html: risksHtml, isAiGenerated: true });

  // Step 14: Summary of Recommendations (AI)
  onProgress?.("Writing Recommendations...", 93);
  const recsRaw = await generateRecommendations(data, priorContext);
  const recsHtml = formatRecommendationsHtml(recsRaw);
  sections.push({ id: "recommendations", title: "Summary of Recommendations", html: recsHtml, isAiGenerated: true });

  // Step 15: Assemble full HTML
  onProgress?.("Assembling document...", 97);
  const fullHtml = buildFullReportHtml(data, sections);

  onProgress?.("Complete", 100);
  return { html: fullHtml, sections };
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Allow fonts to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── tRPC Router ─────────────────────────────────────────────────────────────

export const strategyReportRouter = router({
  // Get available territories for report generation
  getTerritories: publicProcedure.query(async () => {
    const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
    const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");

    return FRANCHISE_LOCATIONS
      .filter((loc: any) => loc.status === "active" && DASHBOARD_DATA[loc.id])
      .map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        revenue: DASHBOARD_DATA[loc.id]?.total_revenue || 0,
      }));
  }),

  // Generate strategy report (returns HTML for preview)
  preview: adminProcedure
    .input(z.object({ territoryId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await generateStrategyReport(input.territoryId);
      return { html: result.html, sectionCount: result.sections.length };
    }),

  // Generate strategy report + PDF
  generate: adminProcedure
    .input(z.object({ territoryId: z.string() }))
    .mutation(async ({ input }) => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
      const dashData = DASHBOARD_DATA[input.territoryId];
      if (!dashData) throw new Error(`No data for territory: ${input.territoryId}`);

      // Generate the full report
      const result = await generateStrategyReport(input.territoryId);

      // Generate PDF
      const pdfBuffer = await generatePdf(result.html);

      // Store PDF in S3
      const filename = `strategy-reports/${input.territoryId}_strategy_report_${Date.now()}.pdf`;
      const { url } = await storagePut(filename, pdfBuffer, "application/pdf");

      return {
        url,
        territoryName: dashData.name,
        sectionCount: result.sections.length,
        generatedAt: new Date().toISOString(),
      };
    }),
});
