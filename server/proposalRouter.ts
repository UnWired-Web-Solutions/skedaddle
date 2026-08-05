import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import puppeteer from "puppeteer";

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
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const currencySymbol = data.currency === "CAD" ? "CA$" : "$";
  const revenueFormatted = `${currencySymbol}${(data.totalRevenue / 1000000).toFixed(1)}M`;
  const suburbList = data.topSuburbs.slice(0, 6).join(", ");
  const speciesList = data.topSpecies.slice(0, 4).join(", ");

  const prompt = `You are writing the opening paragraph for a franchise digital marketing proposal for Skedaddle Humane Wildlife Control. This is the "${data.territoryName}" territory (${data.city}, ${data.state}, ${data.country}).

Key data points:
- Territory: ${data.territoryName}
- Total closed revenue (trailing 12 months): ${revenueFormatted}
- Top suburbs by revenue: ${suburbList}
- Top species by revenue: ${speciesList}
- Seasonal wildlife timing: ${data.seasonalTiming}

Write a compelling 3-4 sentence opening paragraph that:
1. Names the territory and frames the opportunity (high-intent local searches, growing market)
2. References the revenue figure as proof of demand
3. Mentions 2-3 specific suburbs that drive the highest value
4. Positions the proposal as a structured program to grow organic visibility and convert more traffic into closed revenue

Style: Professional but direct. No fluff. Written as if from a senior digital marketing strategist who knows this specific market. Do NOT sound like AI. Do NOT use phrases like "leverage," "harness," or "cutting-edge." Write like a person who has studied this territory's data.

Return ONLY the paragraph text, no quotes or formatting.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Anthropic API error:", resp.status, errText);
    // Fallback to a template-based paragraph
    return `The ${data.territoryName} territory represents a significant growth opportunity for Skedaddle's digital presence. With ${revenueFormatted} in closed revenue over the trailing twelve months — concentrated in ${data.topSuburbs.slice(0, 3).join(", ")} — the demand for humane wildlife control in this market is well established. This proposal outlines a structured digital marketing program designed to grow your franchise's organic visibility across the ${data.territoryName} territory, increase inbound call and inspection volume, and convert more of that traffic into closed revenue — built around the species your customers are actually calling about (${speciesList}) and the communities that already drive your highest job value.`;
  }

  const result = await resp.json() as { content: Array<{ text: string }> };
  return result.content[0]?.text || "";
}

// ─── HTML Template ───────────────────────────────────────────────────────────

function buildProposalHtml(data: ProposalData, narrative: string): string {
  const suburbList = data.topSuburbs.slice(0, 6).join(", ");
  const seasonalTiming = data.seasonalTiming;

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
      background: #1B5E3B;
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
      color: #1B5E3B;
      font-weight: 700;
    }
    
    .territory-badge {
      background: #f0f7f3;
      border: 1px solid #1B5E3B;
      border-radius: 4px;
      padding: 4px 12px;
      font-size: 9pt;
      font-weight: 600;
      color: #1B5E3B;
    }
    
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18pt;
      color: #1B5E3B;
      margin-bottom: 6px;
    }
    
    h2 {
      font-size: 12pt;
      font-weight: 700;
      color: #1B5E3B;
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
      color: #1B5E3B;
      content: "■ ";
    }
    
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 10pt;
    }
    
    .pricing-table th {
      background: #1B5E3B;
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
      color: #1B5E3B;
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
      color: #1B5E3B;
    }
    
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 9.5pt;
    }
    
    .comparison-table th {
      background: #1B5E3B;
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
    
    .check { color: #1B5E3B; font-weight: 700; }
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
      border-left: 3px solid #1B5E3B;
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
  <p class="subtitle">Prepared for ${data.territoryName} · ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
  
  <h2>The Opportunity</h2>
  <p class="narrative">${narrative}</p>
  <p class="narrative">This proposal outlines a comprehensive digital marketing program designed to grow your franchise's organic visibility across the ${data.territoryName} territory, increase inbound call and inspection volume, and convert more of that traffic into closed revenue — built around the species your customers are actually calling about (${data.topSpecies.slice(0, 4).join(", ").toLowerCase()}) and the communities that already drive your highest job value.</p>
  
  <h2>What We Will Build</h2>
  <p>Every program begins with a structured build-out across four areas:</p>
  
  <h3>Website Content Architecture</h3>
  <ul>
    <li>Dedicated location and suburb pages for ${suburbList} — built to rank for high-intent local searches and backed by real revenue data from your territory.</li>
    <li>Neighborhood pages targeting the communities within each suburb that generate the highest call and job-value concentration.</li>
    <li>Species pages rewritten and optimized for AEO, GEO, and conversion — restructured to answer the questions ${data.city} homeowners are actually searching, surface in AI-generated results, and move prospects toward booking an inspection.</li>
    <li>Seasonal and educational content timed to ${data.territoryName}'s wildlife biology calendar — ${seasonalTiming} — that pre-qualifies prospects and sets pricing expectations before the inspection occurs.</li>
  </ul>
  
  <h3>Google Business Profile Optimization & Management</h3>
  <ul>
    <li>Ongoing optimization of your existing GBP listings — service categories, description, photo refresh, Q&A, and profile completeness reviewed and updated on a consistent basis.</li>
    <li>Monthly post program using a proven structure: species or seasonal hook, local ${data.territoryName} suburb signal (${data.topSuburbs.slice(0, 4).join(", ")}), service proof, and a direct call-to-action.</li>
    <li>Post volume scales by package tier — higher frequency drives stronger local pack visibility and more call conversions during ${data.territoryName}'s peak wildlife seasons.</li>
  </ul>
  
  <h3>Quarterly Content Strategy</h3>
  <ul>
    <li>Content planning is not set-and-forget. Every quarter we review your organic performance, GBP data, and current species activity across the ${data.territoryName} territory to set the content calendar for the coming 90 days.</li>
    <li>Strategy is aligned to ${data.territoryName}'s seasonal wildlife patterns — ${seasonalTiming} — so your content is relevant when local search demand peaks.</li>
  </ul>
  
  <h3>Analytics & Reporting</h3>
  <ul>
    <li>A dedicated analytics reporting folder for your ${data.territoryName} location, updated monthly with organic traffic, GBP call and click performance, and conversion data.</li>
    <li>Quarterly strategy calls to review performance, discuss what's working, and align on priorities for the next quarter.</li>
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
  <p>All three packages include the full program: location, suburb, neighborhood and species page creation, quarterly content strategy, GBP post program, quarterly performance calls, and a monthly analytics reporting folder. The difference between tiers is the monthly GBP post volume — more posts means more consistent local pack presence and higher call volume through ${data.territoryName}'s peak wildlife seasons.</p>
  
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
        <td>25 posts / month</td>
        <td class="price">$1,750 / location</td>
      </tr>
      <tr>
        <td class="tier-name">Growth</td>
        <td>30 posts / month</td>
        <td class="price">$2,000 / location</td>
      </tr>
      <tr>
        <td class="tier-name">Accelerator</td>
        <td>40 posts / month</td>
        <td class="price">$2,350 / location</td>
      </tr>
    </tbody>
  </table>
  
  <div class="includes-box">
    <strong>Every package includes:</strong> All location, suburb, neighborhood & species page creation · Quarterly content strategy · Monthly GBP post program · Quarterly strategy calls · Monthly analytics reporting folder per location.
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
        <td>$1,000 / location</td>
        <td>$1,750 / location</td>
        <td>$2,000 / location</td>
        <td>$2,350 / location</td>
      </tr>
      <tr>
        <td>Blog Posts / Month</td>
        <td>3</td>
        <td class="dash">—</td>
        <td class="dash">—</td>
        <td class="dash">—</td>
      </tr>
      <tr>
        <td>GBP Posts / Month</td>
        <td>3</td>
        <td>25</td>
        <td>30</td>
        <td>40</td>
      </tr>
      <tr>
        <td>Species Page Rewrites</td>
        <td class="dash">—</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
      </tr>
      <tr>
        <td>Location & Suburb Pages</td>
        <td class="dash">—</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
      </tr>
      <tr>
        <td>Neighborhood Pages</td>
        <td class="dash">—</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
      </tr>
      <tr>
        <td>AEO / GEO Optimization</td>
        <td class="dash">—</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
      </tr>
      <tr>
        <td>Quarterly Content Strategy</td>
        <td class="dash">—</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
      </tr>
      <tr>
        <td>Quarterly Strategy Calls</td>
        <td class="dash">—</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
      </tr>
      <tr>
        <td>Monthly Analytics Folder</td>
        <td class="dash">—</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
        <td class="check">✓</td>
      </tr>
    </tbody>
  </table>
  
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
  getTerritories: publicProcedure.query(async () => {
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

  // Generate a proposal for a specific territory
  generate: publicProcedure
    .input(z.object({ territoryId: z.string() }))
    .mutation(async ({ input }) => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
      const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");

      const location = FRANCHISE_LOCATIONS.find((l) => l.id === input.territoryId);
      if (!location) throw new Error(`Territory not found: ${input.territoryId}`);

      const dashData = DASHBOARD_DATA[input.territoryId];
      if (!dashData) throw new Error(`No dashboard data for: ${input.territoryId}`);

      // Build proposal data
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
      };

      // Generate narrative with Claude Opus 5
      const narrative = await generateProposalNarrative(proposalData);

      // Build HTML
      const html = buildProposalHtml(proposalData, narrative);

      // Generate PDF
      const pdfBuffer = await generatePdf(html);

      // Store PDF in S3
      const filename = `proposals/${input.territoryId}_franchise_proposal_${Date.now()}.pdf`;
      const { url } = await storagePut(filename, pdfBuffer, "application/pdf");

      return {
        url,
        territoryName: dashData.name,
        generatedAt: new Date().toISOString(),
      };
    }),

  // Preview HTML (for in-browser preview without PDF generation)
  preview: publicProcedure
    .input(z.object({ territoryId: z.string() }))
    .mutation(async ({ input }) => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
      const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");

      const location = FRANCHISE_LOCATIONS.find((l) => l.id === input.territoryId);
      if (!location) throw new Error(`Territory not found: ${input.territoryId}`);

      const dashData = DASHBOARD_DATA[input.territoryId];
      if (!dashData) throw new Error(`No dashboard data for: ${input.territoryId}`);

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
      };

      const narrative = await generateProposalNarrative(proposalData);
      const html = buildProposalHtml(proposalData, narrative);

      return { html, narrative };
    }),
});
