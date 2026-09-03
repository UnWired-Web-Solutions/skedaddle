import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import puppeteer from "puppeteer";
import {
  loadTerritoryReportingAnalytics,
  loadTerritoryWorkbookAggregate,
  type ReportingAnalyticsSnapshot,
  type TerritoryWorkbookAggregateSnapshot,
} from "./territoryReportingData";
import { INITIAL_SALES_REPORT_WINDOW, reportingMonthIso } from "../shared/reportingPeriod";
import { createReportDraft, getReportDraft, markReportDraftExported } from "./reportDraftStore";
import { getTerritoryCatalogEntry, TERRITORY_CATALOG } from "./territoryCatalog";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProposalData {
  territoryId: string;
  territoryName: string;
  city: string;
  state: string;
  country: string;
  currency: "CAD" | "USD";
  workbook: TerritoryWorkbookAggregateSnapshot | null;
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

function workbookContextSummary(workbook: TerritoryWorkbookAggregateSnapshot | null): string {
  if (!workbook) return "No active Drive-workbook aggregate is available for this reporting window. Sales context is unavailable and must not be inferred.";
  const cityLabels = workbook.cities.slice(0, 8).map(row => row.label).join(", ") || "no city categories";
  const speciesLabels = workbook.species.slice(0, 8).map(row => row.label).join(", ") || "no species categories";
  return `Active Drive-workbook aggregate: ${workbook.activeRun.status}; reporting period ${workbook.reportingPeriodLabel}; ${workbook.activeRun.rowsRejected} rejected source rows; city categories ${cityLabels}; species categories ${speciesLabels}; conversion is unavailable pending an approved status definition. This context is aggregate-only and must not be framed as local demand, closed revenue, ranking, service coverage, or a conversion result.`;
}

// ─── Internal GPT proposal narrative generation ───────────────────────────────

async function generateProposalNarrative(data: ProposalData): Promise<string> {
  const workbookSummary = workbookContextSummary(data.workbook);

  const prompt = `You are writing the opening paragraph for a franchise digital marketing proposal for Skedaddle Humane Wildlife Control. This is the "${data.territoryName}" territory (${data.city}, ${data.state}, ${data.country}).

Approved context:
- Territory: ${data.territoryName}
- Workbook context: ${workbookSummary}
- Search evidence: ${data.analytics.hasGsc ? `${data.analytics.organicClicks.toLocaleString("en-US")} Search Console clicks and ${data.analytics.searchImpressions.toLocaleString("en-US")} impressions across ${data.analytics.gscMonths} imported months (${data.analytics.gscPeriod})` : "No persisted Search Console import is available"}
- GA4 evidence: ${data.analytics.hasGa4 ? `${data.analytics.priorityPageSessions.toLocaleString("en-US")} species/location-page sessions across ${data.analytics.ga4Months} imported months (${data.analytics.ga4Period}; ${data.analytics.ga4Coverage})` : "No persisted GA4 import is available"}

Write a compelling 3-4 sentence opening paragraph that:
1. Names the territory and explains that the proposal turns the approved scope into a reviewable marketing program.
2. Uses measured search data only if it is supplied above, with the stated coverage.
3. Treats Drive-workbook categories as aggregate planning context only; do not claim local demand, revenue, job totals, rankings, conversion, service coverage, availability, or seasonality.
4. States that priorities, local facts, and content claims require editorial review before publication.

Style: Professional but direct. No fluff. Do NOT sound like AI. Do NOT use phrases like "leverage," "harness," or "cutting-edge." Do not promise rankings, traffic, leads, calls, revenue, or conversions.

Return ONLY the paragraph text, no quotes or formatting.`;

  try {
    const result = await invokeLLM({
      model: "gpt-5.5",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });
    const content = result.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content)
      ? content.map((part: any) => part.type === "text" ? part.text : "").join("") : "";
    if (text.trim().length > 40) return text.trim();
  } catch (error) {
    console.error("Internal proposal narrative request failed:", error);
  }
  return `This proposal outlines an approved digital marketing program for ${data.territoryName}. It uses available analytics and the active Drive-workbook aggregate only as disclosed planning context; where a source is unavailable or partial, the proposal does not infer a performance result. Local claims, content priorities, and final deliverables remain subject to the approved scope and editorial review.`;
}

// ─── HTML Template ───────────────────────────────────────────────────────────

function buildProposalHtml(data: ProposalData, narrative: string, config: ProposalConfig): string {
  const cityList = data.workbook?.cities.slice(0, 6).map(row => row.label).join(", ") || "review-required local areas";
  const workbookSummary = workbookContextSummary(data.workbook);
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
  <p class="subtitle">Prepared for ${data.territoryName} · Source period ${escapeHtml(data.workbook?.reportingPeriodLabel ?? "unavailable")} · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
  
  <h2>The Opportunity</h2>
  <p class="narrative">${safeNarrative}</p>
  <div class="includes-box"><strong>Measured digital baseline:</strong> ${data.analytics.available ? `${data.analytics.hasGsc ? `${data.analytics.organicClicks.toLocaleString("en-US")} Search Console clicks and ${data.analytics.searchImpressions.toLocaleString("en-US")} impressions across ${data.analytics.gscMonths} imported months (${data.analytics.gscPeriod}).` : "No persisted Search Console import."} ${data.analytics.hasGa4 ? `${data.analytics.priorityPageSessions.toLocaleString("en-US")} GA4 species/location-page sessions across ${data.analytics.ga4Months} imported months (${data.analytics.ga4Period}); coverage: ${data.analytics.ga4Coverage}.` : "No persisted GA4 import."}` : "No persisted GA4 or Search Console import is available for this proposal. Performance claims are intentionally omitted."}</div>
  <div class="includes-box"><strong>Workbook context:</strong> ${escapeHtml(workbookSummary)}</div>
  
  <h2>Recommended Program Framework</h2>
  <p>The following workstreams explain the strategy. They are not purchased deliverables unless they appear in the approved scope notes and selected package.</p>
  
  <h3>Website Content Architecture</h3>
  <ul>
    <li>Audit dedicated location and suburb hubs for ${cityList}; build only the pages and counts explicitly approved in scope.</li>
    <li>Consider neighborhood targeting only after suburb hubs are verified and separately approved.</li>
    <li>Audit species pages for search intent and conversion before recommending rewrites or additions.</li>
    <li>Select educational and seasonal themes only after editorial research, local-fact verification, and written approval; no service, pricing, or availability claim is implied here.</li>
  </ul>
  
  <h3>Google Business Profile Optimization & Management</h3>
  <ul>
    <li>Ongoing optimization of your existing GBP listings — service categories, description, photo refresh, Q&A, and profile completeness reviewed and updated on a consistent basis.</li>
    <li>Monthly post topics and any local references require source review and approval before publication.</li>
    <li>Post volume scales by the approved package tier; content volume is not presented as a visibility, call, or conversion guarantee.</li>
  </ul>
  
  <h3>Future Performance Strategy (Not Included Unless Approved)</h3>
  <ul>
    <li>A later performance phase can review only the sources available at that time, with their coverage and limitations stated explicitly.</li>
    <li>The next content calendar requires independently reviewed research and approved local facts before claims are published.</li>
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
      <li>We'll schedule a kickoff call to confirm priority communities, content topics, source coverage, and the initial GBP post program before any local claims are used.</li>
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
    return TERRITORY_CATALOG.map((territory) => ({
      ...territory,
      source: "approved_identity_mapping" as const,
    }));
  }),

  // Backward-compatible PDF action; it only accepts an existing saved draft.
  generate: adminProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const draft = await getReportDraft(input.draftId, "proposal");
      const territory = getTerritoryCatalogEntry(draft.territoryId);
      if (!territory) throw new Error(`Territory not found: ${draft.territoryId}`);
      const pdfBuffer = await generatePdf(draft.html);
      const filename = `proposals/${draft.territoryId}_franchise_proposal_${Date.now()}.pdf`;
      const { url } = await storagePut(filename, pdfBuffer, "application/pdf");
      await markReportDraftExported(draft.id, url);

      return {
        url,
        draftId: draft.id,
        html: draft.html,
        territoryName: territory.name,
        generatedAt: new Date().toISOString(),
      };
    }),

  // Preview HTML (for in-browser preview without PDF generation)
  preview: adminProcedure
    .input(proposalInputSchema)
    .mutation(async ({ input }) => {
      const territory = getTerritoryCatalogEntry(input.territoryId);
      if (!territory) throw new Error(`Territory not found: ${input.territoryId}`);
      const [reportingAnalytics, workbook] = await Promise.all([
        loadTerritoryReportingAnalytics(input.territoryId, INITIAL_SALES_REPORT_WINDOW),
        loadTerritoryWorkbookAggregate(input.territoryId, territory.country === "CA" ? "CAD" : "USD", INITIAL_SALES_REPORT_WINDOW),
      ]);

      const proposalData: ProposalData = {
        territoryId: input.territoryId,
        territoryName: territory.name,
        city: territory.city,
        state: territory.state,
        country: territory.country === "CA" ? "Canada" : "United States",
        currency: territory.country === "CA" ? "CAD" : "USD",
        workbook,
        analytics: buildProposalAnalytics(reportingAnalytics),
      };

      const narrative = await generateProposalNarrative(proposalData);
      const html = buildProposalHtml(proposalData, narrative, input.config);
      const draftId = await createReportDraft({
        reportType: "proposal",
        territoryId: input.territoryId,
        reportStart: `${reportingMonthIso(INITIAL_SALES_REPORT_WINDOW.start)}-01`,
        reportEnd: `${INITIAL_SALES_REPORT_WINDOW.end.year}-${String(INITIAL_SALES_REPORT_WINDOW.end.month).padStart(2, "0")}-01`,
        config: input.config,
        dataSnapshot: proposalData,
        html,
      });

      return { draftId, html, narrative };
    }),

  // Export the exact reviewed preview; no second AI call can change the copy.
  exportPdf: adminProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const draft = await getReportDraft(input.draftId, "proposal");
      const pdfBuffer = await generatePdf(draft.html);
      const filename = `proposals/${draft.territoryId}_franchise_proposal_${Date.now()}.pdf`;
      const { url } = await storagePut(filename, pdfBuffer, "application/pdf");
      await markReportDraftExported(draft.id, url);
      return { url, generatedAt: new Date().toISOString() };
    }),
});
