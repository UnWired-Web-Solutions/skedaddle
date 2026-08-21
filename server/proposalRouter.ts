import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import puppeteer from "puppeteer";
import {
  loadTerritoryReportingAnalytics,
  type ReportingAnalyticsSnapshot,
} from "./territoryReportingData";
import { INITIAL_SALES_REPORT_WINDOW, reportingMonthIso } from "../shared/reportingPeriod";
import { createReportDraft, getReportDraft, markReportDraftExported } from "./reportDraftStore";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProposalData {
  territoryId: string;
  territoryName: string;
  city: string;
  state: string;
  country: string;
  currency: "CAD" | "USD";
  totalRevenue: number;
  topSuburbs: string[];
  topSpecies: string[];
  seasonalTiming: string;
  analytics: {
    available: boolean;
    hasGsc: boolean;
    hasGa4: boolean;
    organicClicks: number;
    searchImpressions: number;
    priorityPageSessions: number;
    gscMonths: number;
    ga4Months: number;
    gscPeriod: string;
    ga4Period: string;
    ga4Coverage: string;
  };
}

function buildProposalAnalytics(
  reportingAnalytics: ReportingAnalyticsSnapshot | null,
): ProposalData["analytics"] {
  const ga4Months = reportingAnalytics?.ga4.monthly ?? [];
  const gscMonths = reportingAnalytics?.gsc.monthly ?? [];
  const ga4Period = ga4Months.length > 0
    ? `${ga4Months[0].year}-${String(ga4Months[0].month).padStart(2, "0")} to ${ga4Months.at(-1)!.year}-${String(ga4Months.at(-1)!.month).padStart(2, "0")}`
    : "not imported";
  const gscPeriod = gscMonths.length > 0
    ? `${gscMonths[0].month} to ${gscMonths.at(-1)!.month}`
    : "not imported";
  return {
    available: Boolean(gscMonths.length || ga4Months.length),
    hasGsc: gscMonths.length > 0,
    hasGa4: ga4Months.length > 0,
    organicClicks: reportingAnalytics?.gsc.totalClicks ?? 0,
    searchImpressions: reportingAnalytics?.gsc.totalImpressions ?? 0,
    priorityPageSessions: reportingAnalytics?.ga4.totalPriorityPageSessions ?? 0,
    gscMonths: gscMonths.length,
    ga4Months: ga4Months.length,
    gscPeriod,
    ga4Period,
    ga4Coverage: reportingAnalytics?.ga4.latestImport
      ? `${reportingAnalytics.ga4.completeMonths}/${ga4Months.length} months complete; latest successful import ${reportingAnalytics.ga4.latestImport.propertiesSucceeded}/${reportingAnalytics.ga4.latestImport.propertiesExpected} properties`
      : "not yet imported",
  };
}

const proposalConfigSchema = z.object({
  currentMonthlyPrice: z.number().nonnegative(),
  currentBlogPosts: z.number().int().nonnegative(),
  currentGbpPosts: z.number().int().nonnegative(),
  essentialPrice: z.number().nonnegative(),
  essentialBlogPosts: z.number().int().nonnegative(),
  essentialGbpPosts: z.number().int().nonnegative(),
  growthPrice: z.number().nonnegative(),
  growthBlogPosts: z.number().int().nonnegative(),
  growthGbpPosts: z.number().int().nonnegative(),
  acceleratorPrice: z.number().nonnegative(),
  acceleratorBlogPosts: z.number().int().nonnegative(),
  acceleratorGbpPosts: z.number().int().nonnegative(),
  implementationFee: z.number().nonnegative(),
  estimatedTokenCost: z.number().nonnegative(),
  tokenBufferPercent: z.number().min(0).max(100),
  scopeNotes: z.string().min(1).max(2000),
}).superRefine((config, ctx) => {
  if (config.essentialPrice <= 0 || config.growthPrice <= 0 || config.acceleratorPrice <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Every proposal tier must have a non-zero price." });
  }
  if (!(config.essentialPrice <= config.growthPrice && config.growthPrice <= config.acceleratorPrice)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Proposal prices must increase from Essential to Growth to Accelerator." });
  }
});
type ProposalConfig = z.infer<typeof proposalConfigSchema>;

const proposalInputSchema = z.object({
  territoryId: z.string(),
  config: proposalConfigSchema,
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  } as Record<string, string>)[character] || character);
}

// ─── Seasonal data by region ─────────────────────────────────────────────────

const SEASONAL_DATA: Record<string, string> = {
  // Canadian territories
  "ON": "raccoon denning in May and June, bat maternity exclusion window in August, mice entry peak in September and October, squirrel attic activity in spring and fall",
  "BC": "spring bat emergence and roosting in April, raccoon denning in May, rat activity year-round with peaks in fall, squirrel attic entry in spring and fall",
  "QC": "raccoon denning in May and June, bat maternity colonies forming in June, mice seeking entry in September and October, squirrel activity in spring and fall",
  // US territories
  "MN": "spring bat emergence in April, raccoon denning in May, summer squirrel attic activity, fall rodent entry from September through November",
  "WI": "spring bat emergence in April, raccoon denning in May, summer squirrel attic activity, fall rodent entry from September through November",
  "OH": "spring raccoon denning in April and May, bat maternity colonies in June, fall mice and squirrel entry from September, winter rodent pressure through December",
  "CO": "spring raccoon activity in April, bat emergence in May, summer squirrel attic entry, fall mice and rat entry from September through November",
  "GA": "year-round raccoon and squirrel activity, bat maternity colonies from April through August, fall rodent entry from October, winter attic denning from December",
  "MD": "spring raccoon denning in April and May, bat maternity colonies from May through August, fall squirrel and mice entry from September, winter rodent pressure",
  "PA": "spring raccoon denning in April and May, bat maternity exclusion window from June through August, fall rodent entry from September, winter mice and squirrel pressure",
  // Default
  "default": "spring wildlife emergence and denning activity, summer bat maternity season, fall rodent entry pressure, winter attic denning and overwintering",
};

function getSeasonalTiming(state: string): string {
  return SEASONAL_DATA[state] || SEASONAL_DATA["default"];
}

// ─── Claude Opus 5 narrative generation ──────────────────────────────────────

async function generateProposalNarrative(data: ProposalData): Promise<string> {
  const apiKey = ENV.anthropicApiKey;

  const currencySymbol = data.currency === "CAD" ? "CA$" : "$";
  const revenueFormatted = `${currencySymbol}${(data.totalRevenue / 1000000).toFixed(1)}M`;
  const suburbList = data.topSuburbs.slice(0, 6).join(", ");
  const speciesList = data.topSpecies.slice(0, 4).join(", ");

  const prompt = `You are writing the opening paragraph for a franchise digital marketing proposal for Skedaddle Humane Wildlife Control. This is the "${data.territoryName}" territory (${data.city}, ${data.state}, ${data.country}).

Key data points:
- Territory: ${data.territoryName}
- Total closed revenue (2025-07-01 through 2026-06-30): ${revenueFormatted}
- Top suburbs by revenue: ${suburbList}
- Top species by revenue: ${speciesList}
- Seasonal wildlife timing: ${data.seasonalTiming}
- Search evidence: ${data.analytics.hasGsc ? `${data.analytics.organicClicks.toLocaleString("en-US")} Search Console clicks and ${data.analytics.searchImpressions.toLocaleString("en-US")} impressions across ${data.analytics.gscMonths} imported months (${data.analytics.gscPeriod})` : "No persisted Search Console import is available"}
- GA4 evidence: ${data.analytics.hasGa4 ? `${data.analytics.priorityPageSessions.toLocaleString("en-US")} species/location-page sessions across ${data.analytics.ga4Months} imported months (${data.analytics.ga4Period}; ${data.analytics.ga4Coverage})` : "No persisted GA4 import is available"}

Write a compelling 3-4 sentence opening paragraph that:
1. Names the territory and frames the opportunity (high-intent local searches, growing market)
2. References the revenue figure as proof of demand and uses measured search data only when it is available
3. Mentions 2-3 specific suburbs that drive the highest value
4. Positions the proposal as a structured program to grow organic visibility and convert more traffic into closed revenue

Style: Professional but direct. No fluff. Written as if from a senior digital marketing strategist who knows this specific market. Do NOT sound like AI. Do NOT use phrases like "leverage," "harness," or "cutting-edge." Write like a person who has studied this territory's data.

Return ONLY the paragraph text, no quotes or formatting.`;

  if (apiKey) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: "claude-opus-5", max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
        });
        if (resp.ok) {
          const result = await resp.json() as { content: Array<{ text: string }> };
          const text = result.content[0]?.text?.trim() || "";
          if (text.length > 40) return text;
        } else {
          console.error("Anthropic proposal narrative error:", resp.status, await resp.text());
        }
      } catch (error) {
        console.error("Anthropic proposal narrative request failed:", error);
      }
    }
  }
  try {
    const result = await invokeLLM({
      model: "claude-opus-4-7",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });
    const content = result.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content)
      ? content.map((part: any) => part.type === "text" ? part.text : "").join("") : "";
    if (text.trim().length > 40) return text.trim();
  } catch (error) {
    console.error("Fallback proposal narrative request failed:", error);
  }
  return `The ${data.territoryName} territory generated ${revenueFormatted} in closed revenue from July 2025 through June 2026, with demand concentrated in ${data.topSuburbs.slice(0, 3).join(", ")}. The strongest species categories are ${speciesList}. This proposal presents the operator-approved scope for improving measured local visibility and turning more qualified demand into inspections and closed work.`;
}

// ─── HTML Template ───────────────────────────────────────────────────────────

function buildProposalHtml(data: ProposalData, narrative: string, config: ProposalConfig): string {
  const suburbList = data.topSuburbs.slice(0, 6).join(", ");
  const seasonalTiming = data.seasonalTiming;
  const money = (amount: number) => (data.currency === "CAD" ? "CA$" : "$") + amount.toLocaleString("en-US");
  const tokenBuffer = config.estimatedTokenCost * (config.tokenBufferPercent / 100);
  const estimatedImplementationTotal = config.implementationFee + config.estimatedTokenCost + tokenBuffer;

  const safeNarrative = escapeHtml(narrative).replaceAll("\n", "<br>");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1a1a1a;
    }
    
    .page {
      width: 8.5in;
      min-height: 11in;
      padding: 0.7in 0.8in;
      page-break-after: always;
      position: relative;
    }
    
    .page:last-child { page-break-after: avoid; }
    
    .header-bar {
      background: #69BE28;
      height: 6px;
      width: 100%;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }
    
    .logo-area {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-top: 12px;
    }
    
    .logo-text {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22pt;
      color: #69BE28;
      font-weight: 700;
    }
    
    .territory-badge {
      background: #f0f7f3;
      border: 1px solid #69BE28;
      border-radius: 4px;
      padding: 4px 12px;
      font-size: 9pt;
      font-weight: 600;
      color: #69BE28;
    }
    
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18pt;
      color: #69BE28;
      margin-bottom: 6px;
    }
    
    h2 {
      font-size: 12pt;
      font-weight: 700;
      color: #69BE28;
      margin-top: 20px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #2d2d2d;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    
    p {
      margin-bottom: 10px;
      color: #333;
    }
    
    .subtitle {
      font-size: 9.5pt;
      color: #666;
      margin-bottom: 20px;
    }
    
    .narrative {
      font-size: 10.5pt;
      line-height: 1.65;
      color: #222;
      margin-bottom: 18px;
    }
    
    ul {
      margin-left: 16px;
      margin-bottom: 12px;
    }
    
    li {
      margin-bottom: 6px;
      padding-left: 4px;
    }
    
    li::marker {
      color: #69BE28;
      content: "■ ";
    }
    
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    
    .pricing-table th {
      background: #69BE28;
      color: white;
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .pricing-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #e8e8e8;
    }
    
    .pricing-table tr:nth-child(even) td {
      background: #f9fafb;
    }
    
    .pricing-table .tier-name {
      font-weight: 700;
      color: #69BE28;
    }
    
    .pricing-table .price {
      font-weight: 700;
      color: #1a1a1a;
    }
    
    .includes-box {
      background: #f0f7f3;
      border: 1px solid #c8e0d4;
      border-radius: 6px;
      padding: 14px 18px;
      margin: 14px 0;
      font-size: 9.5pt;
      color: #2d5a3f;
    }
    
    .includes-box strong {
      color: #69BE28;
    }
    
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 9.5pt;
    }
    
    .comparison-table th {
      background: #69BE28;
      color: white;
      padding: 8px 10px;
      text-align: center;
      font-weight: 600;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .comparison-table th:first-child {
      text-align: left;
      width: 30%;
    }
    
    .comparison-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e8e8e8;
      text-align: center;
    }
    
    .comparison-table td:first-child {
      text-align: left;
      font-weight: 500;
    }
    
    .comparison-table tr:nth-child(even) td {
      background: #f9fafb;
    }
    
    .check { color: #69BE28; font-weight: 700; }
    .dash { color: #ccc; }
    
    .footer {
      position: absolute;
      bottom: 0.5in;
      left: 0.8in;
      right: 0.8in;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #e8e8e8;
      padding-top: 8px;
    }
    
    .next-steps {
      background: #fafafa;
      border-left: 3px solid #69BE28;
      padding: 14px 18px;
      margin: 16px 0;
    }
    
    .next-steps li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>

<!-- PAGE 1: The Opportunity + What We Will Build -->
<div class="page">
  <div class="header-bar"></div>
  <div class="logo-area">
    <div class="logo-text">Skedaddle</div>
    <div class="territory-badge">${data.territoryName} Territory</div>
  </div>
  
  <h1>Franchise Digital Marketing Proposal</h1>
  <p class="subtitle">Prepared for ${data.territoryName} · Reporting period July 2025–June 2026 · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
  
  <h2>The Opportunity</h2>
  <p class="narrative">${safeNarrative}</p>
  <div class="includes-box"><strong>Measured digital baseline:</strong> ${data.analytics.available ? `${data.analytics.hasGsc ? `${data.analytics.organicClicks.toLocaleString("en-US")} Search Console clicks and ${data.analytics.searchImpressions.toLocaleString("en-US")} impressions across ${data.analytics.gscMonths} imported months (${data.analytics.gscPeriod}).` : "No persisted Search Console import."} ${data.analytics.hasGa4 ? `${data.analytics.priorityPageSessions.toLocaleString("en-US")} GA4 species/location-page sessions across ${data.analytics.ga4Months} imported months (${data.analytics.ga4Period}); coverage: ${data.analytics.ga4Coverage}.` : "No persisted GA4 import."}` : "No persisted GA4 or Search Console import is available for this proposal. Performance claims are intentionally omitted."}</div>
  
  <h2>Recommended Program Framework</h2>
  <p>The following workstreams explain the strategy. They are not purchased deliverables unless they appear in the approved scope notes and selected package.</p>
  
  <h3>Website Content Architecture</h3>
  <ul>
    <li>Audit dedicated location and suburb hubs for ${suburbList}; build only the pages and counts explicitly approved in scope.</li>
    <li>Consider neighborhood targeting only after suburb hubs are verified and separately approved.</li>
    <li>Audit species pages for search intent and conversion before recommending rewrites or additions.</li>
    <li>Seasonal and educational content timed to ${data.territoryName}'s wildlife biology calendar — ${seasonalTiming} — that pre-qualifies prospects and sets pricing expectations before the inspection occurs.</li>
  </ul>
  
  <h3>Google Business Profile Optimization & Management</h3>
  <ul>
    <li>Ongoing optimization of your existing GBP listings — service categories, description, photo refresh, Q&A, and profile completeness reviewed and updated on a consistent basis.</li>
    <li>Monthly post program using a proven structure: species or seasonal hook, local ${data.territoryName} suburb signal (${data.topSuburbs.slice(0, 4).join(", ")}), service proof, and a direct call-to-action.</li>
    <li>Post volume scales by package tier — higher frequency drives stronger local pack visibility and more call conversions during ${data.territoryName}'s peak wildlife seasons.</li>
  </ul>
  
  <h3>Future Performance Strategy (Not Included Unless Approved)</h3>
  <ul>
    <li>A later performance phase can review organic performance, GBP data, and species activity across the ${data.territoryName} territory to set the next content calendar.</li>
    <li>Strategy is aligned to ${data.territoryName}'s seasonal wildlife patterns — ${seasonalTiming} — so your content is relevant when local search demand peaks.</li>
  </ul>
  
  <h3>Analytics & Reporting</h3>
  <ul>
    <li>Monthly analytics reporting is included only when it appears in the approved scope notes below.</li>
    <li>Strategy-call cadence must be stated explicitly in the approved scope.</li>
  </ul>
  
  <div class="footer">Unwired Web Solutions | uws@unwiredwebsolutions.com | Confidential — Franchise Use Only</div>
</div>

<!-- PAGE 2: Investment / Per Location Pricing -->
<div class="page">
  <div class="header-bar"></div>
  <div class="logo-area">
    <div class="logo-text">Skedaddle</div>
    <div class="territory-badge">${data.territoryName} Territory</div>
  </div>
  
  <h2>Investment — Per Location Pricing</h2>
  <p>The prices and monthly content volumes below are the confirmed commercial inputs for this territory. Package inclusions, exclusions, and rollout limits are governed by the approved scope notes; volume alone is not presented as a guarantee of visibility or call growth.</p>
  
  <table class="pricing-table">
    <thead>
      <tr>
        <th>Package Tier</th>
        <th>GBP Posts / Month</th>
        <th>Investment / Location</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="tier-name">Essential</td>
        <td>${config.essentialGbpPosts} posts / month</td>
        <td class="price">${money(config.essentialPrice)} / location</td>
      </tr>
      <tr>
        <td class="tier-name">Growth</td>
        <td>${config.growthGbpPosts} posts / month</td>
        <td class="price">${money(config.growthPrice)} / location</td>
      </tr>
      <tr>
        <td class="tier-name">Accelerator</td>
        <td>${config.acceleratorGbpPosts} posts / month</td>
        <td class="price">${money(config.acceleratorPrice)} / location</td>
      </tr>
    </tbody>
  </table>
  
  <div class="includes-box">
    <strong>Approved scope notes:</strong> ${escapeHtml(config.scopeNotes)}
  </div>
  
  <div class="footer">Unwired Web Solutions | uws@unwiredwebsolutions.com | Confidential — Franchise Use Only</div>
</div>

<!-- PAGE 3: Current Plan vs. New Campaign + Next Steps -->
<div class="page">
  <div class="header-bar"></div>
  <div class="logo-area">
    <div class="logo-text">Skedaddle</div>
    <div class="territory-badge">${data.territoryName} Territory</div>
  </div>
  
  <h2>Current Plan vs. New Campaign</h2>
  <p>A side-by-side overview of what's included at each level:</p>
  
  <table class="comparison-table">
    <thead>
      <tr>
        <th>What's Included</th>
        <th>Current Plan</th>
        <th>Essential</th>
        <th>Growth</th>
        <th>Accelerator</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Monthly Investment</td>
        <td>${money(config.currentMonthlyPrice)} / location</td>
        <td>${money(config.essentialPrice)} / location</td>
        <td>${money(config.growthPrice)} / location</td>
        <td>${money(config.acceleratorPrice)} / location</td>
      </tr>
      <tr>
        <td>Blog Posts / Month</td>
        <td>${config.currentBlogPosts}</td>
        <td>${config.essentialBlogPosts}</td>
        <td>${config.growthBlogPosts}</td>
        <td>${config.acceleratorBlogPosts}</td>
      </tr>
      <tr>
        <td>GBP Posts / Month</td>
        <td>${config.currentGbpPosts}</td>
        <td>${config.essentialGbpPosts}</td>
        <td>${config.growthGbpPosts}</td>
        <td>${config.acceleratorGbpPosts}</td>
      </tr>
      <tr>
        <td>Other Inclusions</td>
        <td colspan="4">Only the deliverables explicitly listed in the approved scope notes below are included.</td>
      </tr>
    </tbody>
  </table>

  <h2>Implementation & AI Usage Allowance</h2>
  <table class="comparison-table">
    <tbody>
      <tr><td>Development / implementation fee</td><td>${money(config.implementationFee)}</td></tr>
      <tr><td>Estimated token usage</td><td>${money(config.estimatedTokenCost)}</td></tr>
      <tr><td>Exploration buffer (${config.tokenBufferPercent.toFixed(1)}%)</td><td>${money(tokenBuffer)}</td></tr>
      <tr><td><strong>Estimated one-time implementation total</strong></td><td><strong>${money(estimatedImplementationTotal)}</strong></td></tr>
    </tbody>
  </table>
  <p class="scope-note">The buffer is explicit so exploration and investigation are priced transparently. Final billing follows the approved commercial terms and actual scope.</p>
  
  <h2>Next Steps</h2>
  <div class="next-steps">
    <ul>
      <li>Choose the package tier that fits your growth goals for the ${data.territoryName} territory this season.</li>
      <li>We'll schedule a kickoff call to map your priority suburbs (${data.topSuburbs.slice(0, 3).join(", ")} first), confirm the species content calendar, and set the initial GBP post program.</li>
    </ul>
  </div>
  
  <div class="footer">Unwired Web Solutions | uws@unwiredwebsolutions.com | Confidential — Franchise Use Only</div>
</div>

</body>
</html>`;
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
    await page.setContent(html, { waitUntil: "domcontentloaded" });
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

export const proposalRouter = router({
  // Get available territories for proposal generation
  getTerritories: adminProcedure.query(async () => {
    // Import franchise data dynamically to avoid circular deps
    const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
    const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");

    return FRANCHISE_LOCATIONS
      .filter((loc) => loc.status === "active" && DASHBOARD_DATA[loc.id])
      .map((loc) => ({
        id: loc.id,
        name: loc.name,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        revenue: DASHBOARD_DATA[loc.id]?.total_revenue || 0,
      }));
  }),

  // Backward-compatible PDF action; it only accepts an existing saved draft.
  generate: adminProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
      const draft = await getReportDraft(input.draftId, "proposal");
      const dashData = DASHBOARD_DATA[draft.territoryId];
      if (!dashData) throw new Error(`No dashboard data for: ${draft.territoryId}`);
      const pdfBuffer = await generatePdf(draft.html);
      const filename = `proposals/${draft.territoryId}_franchise_proposal_${Date.now()}.pdf`;
      const { url } = await storagePut(filename, pdfBuffer, "application/pdf");
      await markReportDraftExported(draft.id, url, ctx.user.id);

      return {
        url,
        draftId: draft.id,
        html: draft.html,
        territoryName: dashData.name,
        generatedAt: new Date().toISOString(),
      };
    }),

  // Preview HTML (for in-browser preview without PDF generation)
  preview: adminProcedure
    .input(proposalInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
      const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");

      const location = FRANCHISE_LOCATIONS.find((l) => l.id === input.territoryId);
      if (!location) throw new Error(`Territory not found: ${input.territoryId}`);

      const dashData = DASHBOARD_DATA[input.territoryId];
      if (!dashData) throw new Error(`No dashboard data for: ${input.territoryId}`);
      const reportingAnalytics = await loadTerritoryReportingAnalytics(input.territoryId);

      const proposalData: ProposalData = {
        territoryId: input.territoryId,
        territoryName: dashData.name,
        city: location.city,
        state: location.state,
        country: location.country === "CA" ? "Canada" : "United States",
        currency: dashData.currency,
        totalRevenue: dashData.total_revenue,
        topSuburbs: dashData.suburbs.slice(0, 8).map((s) => s.suburb),
        topSpecies: dashData.species.slice(0, 5).map((s) => s.species),
        seasonalTiming: getSeasonalTiming(location.state),
        analytics: buildProposalAnalytics(reportingAnalytics),
      };

      const narrative = await generateProposalNarrative(proposalData);
      const html = buildProposalHtml(proposalData, narrative, input.config);
      const draftId = await createReportDraft({
        reportType: "proposal",
        territoryId: input.territoryId,
        reportStart: `${reportingMonthIso(INITIAL_SALES_REPORT_WINDOW.start)}-01`,
        reportEnd: "2026-06-30",
        config: input.config,
        dataSnapshot: proposalData,
        html,
        createdByUserId: ctx.user.id,
      });

      return { draftId, html, narrative };
    }),

  // Export the exact reviewed preview; no second AI call can change the copy.
  exportPdf: adminProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const draft = await getReportDraft(input.draftId, "proposal");
      const pdfBuffer = await generatePdf(draft.html);
      const filename = `proposals/${draft.territoryId}_franchise_proposal_${Date.now()}.pdf`;
      const { url } = await storagePut(filename, pdfBuffer, "application/pdf");
      await markReportDraftExported(draft.id, url, ctx.user.id);
      return { url, generatedAt: new Date().toISOString() };
    }),
});
