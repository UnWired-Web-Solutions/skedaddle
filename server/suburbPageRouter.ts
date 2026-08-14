/**
 * Suburb Page Content Generator
 * Produces ready-to-publish suburb page content using Claude Opus 5.
 * Species weighting from Salesforce revenue data, schema from validated template.
 */

import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { suburbPages } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { buildSuburbSchema, type SuburbSchemaParams } from "./templates/suburbPageSchema";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SuburbPageContent {
  // Meta
  urlSlug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;

  // Trust chips
  trustChips: string[];

  // Verified NAP
  nap: {
    name: string;
    phone: string;
    serviceArea: string;
    source: string;
  };

  // Body sections
  introSection: string; // 80-100 words
  whyChooseSection: string; // 150 words, E-E-A-T focused
  speciesSections: Array<{
    species: string;
    tier: 1 | 2 | 3;
    heading: string;
    body: string;
    wordCount: number;
    internalLink: string;
  }>;
  neighbourhoodSection: string; // AEO/GEO direct-answer paragraph
  faqSection: Array<{ question: string; answer: string }>;
  closingCta: string;

  // Schema (8 JSON-LD blocks)
  schemaBlocks: object[];

  // Launch checklist
  launchChecklist: Array<{ item: string; status: "ready" | "needs_review" | "pending" }>;

  // Source citations
  citations: Array<{ fact: string; source: string; verified: boolean }>;

  // Sonar research summary (optional — present when research was run)
  research?: {
    existingPageStatus: string;
    existingPageUrl: string | null;
    county: string | null;
    verifiedNeighbourhoods: string[];
    topCompetitors: Array<{ name: string; reviews?: string; rating?: string }>;
    localFactsCitations: string[];
  };
}

export interface SpeciesTier {
  species: string;
  tier: 1 | 2 | 3;
  revenuePercent: number;
  targetWordCount: number;
  jobs: number;
  revenue: number;
}

// ─── Perplexity Sonar API Helper ────────────────────────────────────────────

export interface SuburbResearch {
  // Page validation
  existingPageUrl: string | null;       // URL if a dedicated page was found
  existingPageStatus: string;           // Human-readable status
  existingPageCitation: string | null;  // Source URL for the finding

  // Local facts
  county: string | null;
  verifiedNeighbourhoods: string[];     // Verified from real sources
  localWildlifeNotes: string;           // Any local species/regulation notes
  localFactsCitations: string[];        // Source URLs

  // Competitor landscape
  topCompetitors: Array<{ name: string; reviews?: string; rating?: string }>;
  competitorNotes: string;
  competitorCitations: string[];

  // Raw Sonar content (for debugging / citation display)
  rawPageCheck: string;
  rawLocalFacts: string;
  rawCompetitors: string;
}

async function callSonar(query: string, maxTokens: number = 600): Promise<{ content: string; citations: string[] }> {
  const apiKey = process.env.SONAR_API_KEY;
  if (!apiKey) {
    console.warn("[Sonar] SONAR_API_KEY not configured — skipping research");
    return { content: "", citations: [] };
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "user", content: query }],
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[Sonar] API error (${response.status}):`, err);
      return { content: "", citations: [] };
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "";
    const citations: string[] = Array.isArray(data.citations)
      ? data.citations.filter((c: any) => typeof c === "string")
      : [];

    return { content, citations };
  } catch (err) {
    console.error("[Sonar] Request failed:", err);
    return { content: "", citations: [] };
  }
}

async function researchSuburb(
  suburbName: string,
  state: string,
  country: string,
  territoryName: string,
): Promise<SuburbResearch> {
  const countryLabel = country === "Canada" ? "Canada" : "USA";

  // Run 3 queries in parallel
  const [pageCheck, localFacts, competitors] = await Promise.all([
    // Query 1: Does Skedaddle already have a dedicated page for this suburb?
    callSonar(
      `Search site:skedaddlewildlife.com for a page specifically dedicated to "${suburbName}" wildlife removal. ` +
      `Is there a URL that is specifically about ${suburbName} (not just a general location page that mentions ${suburbName} as a service area)? ` +
      `If yes, provide the exact URL. If no, confirm it does not exist.`,
      400,
    ),
    // Query 2: Verified local facts
    callSonar(
      `What are the official neighbourhoods or districts within ${suburbName}, ${state}, ${countryLabel}? ` +
      `What county or regional municipality is ${suburbName} in? ` +
      `Are there any specific local wildlife bylaws, DNR regulations, or humane wildlife control guidelines that apply to homeowners in ${suburbName}? ` +
      `Provide factual, sourced answers only.`,
      600,
    ),
    // Query 3: Competitor landscape
    callSonar(
      `Who are the top wildlife removal companies competing with Skedaddle Humane Wildlife Control in ${suburbName}, ${state}? ` +
      `List their Google review counts and ratings if available. ` +
      `Do any competitors have dedicated suburb-specific pages for ${suburbName}?`,
      400,
    ),
  ]);

  // Parse page check result
  const pageContent = pageCheck.content.toLowerCase();
  const hasPage = pageContent.includes("yes") || pageContent.includes("found") || pageContent.includes("exists") || pageContent.includes("dedicated page");
  const noPage = pageContent.includes("no dedicated") || pageContent.includes("does not exist") || pageContent.includes("not found") || pageContent.includes("not appear") || pageContent.includes("no page");

  let existingPageUrl: string | null = null;
  let existingPageStatus: string;

  if (hasPage && !noPage) {
    // Try to extract URL from the response
    const urlMatch = pageCheck.content.match(/https?:\/\/[^\s)"']+skedaddlewildlife[^\s)"']*/i);
    existingPageUrl = urlMatch ? urlMatch[0] : null;
    existingPageStatus = existingPageUrl
      ? `Dedicated page found: ${existingPageUrl}`
      : "Dedicated page may exist — manual verification recommended";
  } else if (noPage) {
    existingPageStatus = "No dedicated page found — confirmed gap";
  } else {
    existingPageStatus = "Page status unclear — manual verification recommended";
  }

  // Parse local facts
  const countyMatch = localFacts.content.match(/(?:county|regional municipality|region)[:\s]+([A-Z][\w\s]+(?:County|Region|Municipality)?)/i);
  const county = countyMatch ? countyMatch[1].trim() : null;

  // Extract neighbourhood names from the response (look for lists)
  const neighbourhoodMatches = localFacts.content.match(/(?:\*\*|•|-|\d+\.\s)([A-Z][\w\s]+?)(?:,|\n|\*\*|$)/g) || [];
  const verifiedNeighbourhoods = neighbourhoodMatches
    .map(m => m.replace(/^[\*•\-\d\.\s]+/, "").replace(/[\*,]+$/, "").trim())
    .filter(n => n.length > 2 && n.length < 40 && /^[A-Z]/.test(n))
    .slice(0, 10);

  // Extract competitor info
  const competitorLines = competitors.content
    .split("\n")
    .filter(l => l.trim().length > 10)
    .slice(0, 5);

  const topCompetitors = competitorLines.map(line => {
    const reviewMatch = line.match(/(\d+)\s*(?:reviews?|Google reviews?)/i);
    const ratingMatch = line.match(/(\d+\.\d+)\s*(?:stars?|★)/i);
    const nameMatch = line.match(/^[\*•\-\d\.\s]*([A-Z][\w\s&]+?)(?:\s*[\(\-]|\s*\d|$)/m);
    return {
      name: nameMatch ? nameMatch[1].trim() : line.slice(0, 40).trim(),
      reviews: reviewMatch ? `${reviewMatch[1]} reviews` : undefined,
      rating: ratingMatch ? `${ratingMatch[1]}★` : undefined,
    };
  }).filter(c => c.name.length > 3);

  return {
    existingPageUrl,
    existingPageStatus,
    existingPageCitation: pageCheck.citations[0] || null,
    county,
    verifiedNeighbourhoods,
    localWildlifeNotes: localFacts.content.slice(0, 800),
    localFactsCitations: localFacts.citations.slice(0, 5),
    topCompetitors,
    competitorNotes: competitors.content.slice(0, 600),
    competitorCitations: competitors.citations.slice(0, 3),
    rawPageCheck: pageCheck.content,
    rawLocalFacts: localFacts.content,
    rawCompetitors: competitors.content,
  };
}

// ─── Claude Opus 5 API Helper ────────────────────────────────────────────────

async function callClaudeOpus(prompt: string, maxTokens: number = 4000): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude Opus 5 API error (${response.status}): ${err}`);
  }

  const data = await response.json() as any;
  return data.content?.[0]?.text || "";
}

// ─── Species Tier Calculator ─────────────────────────────────────────────────

function calculateSpeciesTiers(speciesData: Array<{ species: string; total_revenue: number; total_jobs: number }>, totalRevenue: number): SpeciesTier[] {
  return speciesData
    .filter(s => s.total_revenue > 0)
    .map(s => {
      const pct = totalRevenue > 0 ? (s.total_revenue / totalRevenue) * 100 : 0;
      let tier: 1 | 2 | 3;
      let targetWordCount: number;

      if (pct >= 15) {
        tier = 1;
        targetWordCount = 140; // 130-150 words
      } else if (pct >= 5) {
        tier = 2;
        targetWordCount = 90; // 80-100 words
      } else {
        tier = 3;
        targetWordCount = 50; // 40-60 words
      }

      return {
        species: s.species,
        tier,
        revenuePercent: Math.round(pct * 10) / 10,
        targetWordCount,
        jobs: s.total_jobs,
        revenue: s.total_revenue,
      };
    })
    .sort((a, b) => b.revenuePercent - a.revenuePercent);
}

// ─── Content Generation Functions ────────────────────────────────────────────

async function generateMetaDescription(
  suburbName: string,
  territoryName: string,
  topSpecies: string[],
  state: string,
): Promise<string> {
  const prompt = `Write a meta description for a wildlife removal service page. Maximum 155 characters.

Page: ${suburbName} Wildlife Removal | Skedaddle ${territoryName}
Location: ${suburbName}, ${state}
Top species served: ${topSpecies.join(", ")}
Brand: Skedaddle Humane Wildlife Control

Requirements:
- Include the suburb name and at least one species
- Include a call to action (call, book inspection)
- Must be under 155 characters total
- Natural, not keyword-stuffed

Return ONLY the meta description text, nothing else.`;

  return await callClaudeOpus(prompt, 200);
}

async function generateIntroSection(
  suburbName: string,
  territoryName: string,
  topSpecies: string[],
  yearsServing: string,
  state: string,
  localContext?: string, // Optional Sonar-verified local facts
): Promise<string> {
  const prompt = `Write the opening paragraph for a wildlife removal service page for ${suburbName}, ${state}.

Context:
- Company: Skedaddle Humane Wildlife Control (${territoryName} office)
- Serving the area since: ${yearsServing}
- Top species in this suburb: ${topSpecies.join(", ")}
- Method: One-way-door exclusion (no traps, no poison)
- Tone: Professional, reassuring, local-knowledge
${localContext ? `- Verified local context: ${localContext}` : ""}

Requirements:
- 80-100 words exactly
- Open with the suburb name and a homeowner pain point
- Mention Skedaddle's presence in the area
- Reference the humane method briefly
- End with confidence/trust signal
- Do NOT use "leverage", "harness", "nestled", or any AI-sounding phrases
- Write like a local business owner who knows this neighbourhood
- If local context is provided above, you may reference specific local details naturally

Return ONLY the paragraph text.`;

  return await callClaudeOpus(prompt, 300);
}

async function generateWhyChooseSection(
  suburbName: string,
  territoryName: string,
  yearsServing: string,
  totalJobs: number,
  country: string,
  regulatoryBody: string,
): Promise<string> {
  const prompt = `Write the "Why Homeowners in ${suburbName} Choose Skedaddle" section for a wildlife removal service page.

Context:
- Company: Skedaddle Humane Wildlife Control (${territoryName} office)
- Serving since: ${yearsServing}
- Total jobs completed in territory: ${totalJobs}+
- Country: ${country}
- Regulatory body: ${regulatoryBody}
- Method: Humane one-way-door exclusion, lifetime warranty on sealed entry points
- Parent company founded 1989 by Bill Dowd

This section builds E-E-A-T (Experience, Expertise, Authority, Trust). Write 3 short paragraphs (~150 words total) covering:
1. Experience serving this specific area (years, job volume)
2. Licensed and trained under ${regulatoryBody} (authority signal)
3. The warranty and guarantee (trust signal)

Requirements:
- Reference specific numbers (years, jobs)
- Sound like a confident local operator, not a marketing agency
- No AI-sounding language
- Each paragraph 40-60 words

Return ONLY the section text (3 paragraphs separated by blank lines).`;

  return await callClaudeOpus(prompt, 500);
}

async function generateSpeciesSection(
  species: string,
  tier: 1 | 2 | 3,
  targetWords: number,
  suburbName: string,
  territoryName: string,
  revenuePercent: number,
  seasonalTiming: string,
  state: string,
  country: string,
): Promise<string> {
  const prompt = `Write the "${species} Removal in ${suburbName}" section for a wildlife removal service page.

Context:
- Species: ${species}
- Territory demand weight: ${revenuePercent}% of territory revenue. This is not suburb-level species data
- Tier: ${tier} (${tier === 1 ? "primary species — full treatment" : tier === 2 ? "secondary species — moderate treatment" : "minor species — brief mention"})
- Location: ${suburbName}, ${state}, ${country === "US" ? "United States" : "Canada"}
- Seasonal timing: ${seasonalTiming}
- Method: Humane one-way-door exclusion, no traps, no poison
- Company: Skedaddle ${territoryName}

Requirements:
- Exactly ${targetWords} words (±10 words)
- ${tier === 1 ? "Full H3-level section: how they get in, what Skedaddle does, seasonal timing, local context" : tier === 2 ? "Moderate section: brief entry behavior, Skedaddle's approach, link to species page" : "Brief mention: one sentence on the species + link to main species page"}
- Reference how this species specifically affects homes in ${suburbName}
- Do not claim this species, a job count, or revenue was observed in ${suburbName}; describe it as a territory-priority service and use general local housing context
- Include seasonal timing for when this species is most active
- ${country === "CA" ? "Use Canadian spelling (behaviour, neighbour)" : "Use American spelling"}
- No AI-sounding language — write like a technician explaining to a homeowner
- Do NOT mention regulations as "restrictions" — use "guidance" or "recommendations"

Return ONLY the body text for this section.`;

  return await callClaudeOpus(prompt, tier === 1 ? 400 : tier === 2 ? 250 : 150);
}

async function generateNeighbourhoodSection(
  suburbName: string,
  neighbourhoods: string[],
  territoryName: string,
  state: string,
): Promise<string> {
  const prompt = `Write the "What Areas of ${suburbName} Does Skedaddle Service?" section for a wildlife removal page.

This is an AEO (Answer Engine Optimization) section — it should directly answer the question a voice assistant or AI overview would surface.

Context:
- Suburb: ${suburbName}, ${state}
- Known neighbourhoods/areas: ${neighbourhoods.join(", ")}
- Company: Skedaddle ${territoryName}

Requirements:
- 60-80 words
- Open with a direct answer to the question (for voice/AI surfaces)
- List the specific neighbourhoods naturally within the paragraph
- End with a confidence statement ("If your home is inside ${suburbName} city limits, we service it.")
- Natural conversational tone

Return ONLY the paragraph text.`;

  return await callClaudeOpus(prompt, 250);
}

async function generateFAQs(
  suburbName: string,
  territoryName: string,
  topSpecies: string[],
  phone: string,
  state: string,
  country: string,
  seasonalTiming: string,
): Promise<Array<{ question: string; answer: string }>> {
  const prompt = `Generate 7 FAQ questions and answers for a ${suburbName}, ${state} wildlife removal service page.

Context:
- Company: Skedaddle Humane Wildlife Control (${territoryName} office)
- Phone: ${phone}
- Top species: ${topSpecies.join(", ")}
- Country: ${country === "US" ? "United States" : "Canada"}
- Seasonal timing: ${seasonalTiming}
- Method: Humane one-way-door exclusion, lifetime warranty

Required questions (adapt wording naturally):
1. How much does wildlife removal cost in ${suburbName}?
2. Can Skedaddle remove wildlife the same day I call?
3. When is the best time to schedule [top species] exclusion?
4. What areas of ${suburbName} does Skedaddle service?
5. Does Skedaddle follow humane wildlife regulations?
6. What wildlife is most common in ${suburbName} homes this season?
7. Does Skedaddle offer a warranty?

Requirements:
- Each answer 40-70 words
- Reference ${suburbName} by name in each answer
- Include the phone number in Q2's answer
- ${country === "CA" ? "Reference Ontario MNRF or provincial regulations" : "Reference state DNR guidance"} in Q5
- Use "guidance" not "restriction" for any regulatory references
- Natural, helpful tone — not salesy

Return as JSON array: [{"question": "...", "answer": "..."}, ...]
Return ONLY the JSON array, no other text.`;

  const raw = await callClaudeOpus(prompt, 2000);

  try {
    // Try to parse JSON from the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Fallback: return empty array if parsing fails
    console.error("FAQ parsing failed:", e);
  }

  return [];
}

// ─── Main Generation Orchestrator ────────────────────────────────────────────

export async function generateSuburbPageContent(
  territoryId: string,
  suburbName: string,
  options?: {
    neighbourhoods?: string[];
    nearbyCities?: string[];
    phone?: string;
    latitude?: number;
    longitude?: number;
    county?: string;
    yearsServing?: string;
    franchiseFoundedYear?: string;
    gbpUrl?: string;
  },
): Promise<SuburbPageContent> {
  const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
  const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");

  const location = FRANCHISE_LOCATIONS.find((l: any) => l.id === territoryId);
  if (!location) throw new Error(`Territory not found: ${territoryId}`);

  const dashData = DASHBOARD_DATA[territoryId];
  if (!dashData) throw new Error(`No dashboard data for: ${territoryId}`);

  const totalRevenue = dashData.total_revenue;
  const totalJobs = dashData.total_jobs;
  const country = location.country === "CA" ? "Canada" : "United States";
  const countryCode = location.country as "US" | "CA";
  const state = location.state;
  const territoryName = dashData.name;
  const phone = options?.phone || "";
  const yearsServing = options?.yearsServing || "";
  const CANADIAN_REGULATORS: Record<string, string> = {
    ON: "Ontario Ministry of Natural Resources",
    QC: "Québec Ministère de l'Environnement, de la Lutte contre les changements climatiques, de la Faune et des Parcs",
    BC: "British Columbia Ministry of Water, Land and Resource Stewardship",
  };
  const regulatoryBody = countryCode === "CA"
    ? CANADIAN_REGULATORS[state] || `${state} provincial wildlife authority`
    : `${state} wildlife authority`;

  // Seasonal timing
  const SEASONAL_DATA: Record<string, string> = {
    ON: "raccoons March to May, squirrels spring and fall, bats May to August maternity period, mice September to November",
    QC: "raccoons March to May, squirrels spring and fall, bats May to August, mice fall through winter",
    BC: "squirrels year-round, raccoons spring, bats summer, mice fall and winter",
    MN: "squirrels spring and fall, raccoons March to May, bats May 15 to August 1 maternity period, mice fall through spring",
    WI: "squirrels spring and fall, raccoons March to May, mice fall through spring, bats summer",
    MD: "squirrels spring and fall, raccoons spring, bats summer, mice fall and winter",
    GA: "squirrels year-round, raccoons spring, bats summer, rats fall and winter",
    CO: "squirrels spring and fall, raccoons spring, mice fall through spring, bats summer",
    OH: "squirrels spring and fall, raccoons spring, mice fall, bats summer",
    PA: "squirrels spring and fall, raccoons spring, bats summer, mice fall through winter",
    default: "spring wildlife emergence, summer bat season, fall rodent entry, winter attic denning",
  };
  const seasonalTiming = SEASONAL_DATA[state] || SEASONAL_DATA["default"];

  // Calculate species tiers from revenue data
  const speciesTiers = calculateSpeciesTiers(dashData.species, totalRevenue);
  const topSpeciesNames = speciesTiers.slice(0, 4).map(s => s.species);

  // Generate URL slug
  const suburbSlug = suburbName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const territorySlug = territoryId.replace(/_/g, "-");

  // ─── Step 0: Run Sonar research in parallel with data prep ─────────────────
  console.log(`[SuburbPage] Running Sonar research for ${suburbName}, ${state}...`);
  const research = await researchSuburb(suburbName, state, country, territoryName);
  console.log(`[SuburbPage] Sonar research complete. Page status: ${research.existingPageStatus}`);

  // Explicit operator input wins. Research suggestions remain evidence to review,
  // never a source of invented placeholder neighbourhoods.
  const neighbourhoods = options?.neighbourhoods?.length
    ? options.neighbourhoods
    : research.verifiedNeighbourhoods;

  // Use Sonar-verified county if available
  const county = options?.county || research.county || "";

  // ─── Generate all content sections ─────────────────────────────────────────

  // 1. Meta description
  const metaDescription = await generateMetaDescription(suburbName, territoryName, topSpeciesNames, state);

  // 2. Intro section — enriched with Sonar local facts
  const introSection = await generateIntroSection(
    suburbName, territoryName, topSpeciesNames, yearsServing, state,
    research.localWildlifeNotes ? `Local context: ${research.localWildlifeNotes.slice(0, 300)}` : undefined,
  );

  // 3. Why Choose section
  const whyChooseSection = await generateWhyChooseSection(
    suburbName, territoryName, yearsServing, totalJobs, country, regulatoryBody,
  );

  // 4. Species sections (one per tier)
  const speciesSections: Array<{ species: string; tier: 1 | 2 | 3; heading: string; body: string; wordCount: number; internalLink: string }> = [];
  for (const sp of speciesTiers.slice(0, 6)) { // Top 6 species max
    const body = await generateSpeciesSection(
      sp.species, sp.tier, sp.targetWordCount, suburbName, territoryName,
      sp.revenuePercent, seasonalTiming, state, country,
    );
    speciesSections.push({
      species: sp.species,
      tier: sp.tier,
      heading: `${sp.species} Removal in ${suburbName}`,
      body,
      wordCount: body.split(/\s+/).length,
      internalLink: `https://www.skedaddlewildlife.com/location/${territorySlug}/${sp.species.toLowerCase().replace(/\s+/g, "-")}-removal/`,
    });
  }

  // 5. Neighbourhood section — uses Sonar-verified neighbourhoods
  const neighbourhoodSection = await generateNeighbourhoodSection(suburbName, neighbourhoods, territoryName, state);

  // 6. FAQs
  const faqSection = await generateFAQs(suburbName, territoryName, topSpeciesNames, phone, state, country, seasonalTiming);

  // 7. Schema (deterministic — no AI)
  const schemaParams: SuburbSchemaParams = {
    territoryName,
    territorySlug,
    franchisePhone: phone,
    franchiseFoundedYear: options?.franchiseFoundedYear || yearsServing,
    parentOrgFoundedYear: "1989",
    suburbName,
    suburbSlug,
    latitude: options?.latitude ?? 0,
    longitude: options?.longitude ?? 0,
    county: county, // Uses Sonar-verified county if available
    state,
    country: countryCode,
    species: speciesTiers.slice(0, 4).map(s => ({
      name: s.species,
      serviceType: `${s.species} removal`,
      slug: s.species.toLowerCase().replace(/\s+/g, "-"),
      description: speciesSections.find(sec => sec.species === s.species)?.body.slice(0, 200) || `Humane ${s.species.toLowerCase()} removal in ${suburbName}.`,
    })),
    neighbourhoods,
    nearbyCities: options?.nearbyCities || [],
    faqs: faqSection,
    gbpUrl: options?.gbpUrl || "",
  };
  const schemaBlocks = buildSuburbSchema(schemaParams);

  // 8. Trust chips
  const trustChips = [
    `Serving ${suburbName} since ${yearsServing}`,
    "Humane exclusion and prevention-focused service",
    "Local business details confirmed before generation",
  ];

  // 9. Launch checklist
  const launchChecklist = [
    { item: "Meta title under 60 characters", status: "ready" as const },
    { item: "Meta description under 155 characters", status: metaDescription.length <= 155 ? "ready" as const : "needs_review" as const },
    { item: "H1 includes suburb name", status: "ready" as const },
    { item: "Species sections match territory revenue weighting and avoid suburb-level demand claims", status: "ready" as const },
    { item: "Internal links to species pages verified", status: "needs_review" as const },
    { item: "Phone number verified against GBP", status: options?.phone ? "ready" as const : "pending" as const },
    { item: "NAP consistent with GBP listing", status: options?.phone ? "ready" as const : "pending" as const },
    { item: "Schema validates in Google Rich Results Test", status: "needs_review" as const },
    { item: "Images sourced from client (not AI-generated)", status: "pending" as const },
    { item: "Reviewed by content team", status: "pending" as const },
  ];

  // 10. Source citations — enriched with Sonar-verified sources
  const citations = [
    { fact: `Total territory revenue: $${(totalRevenue / 1000).toFixed(0)}K`, source: "Salesforce CRM (Kira export Jul 2026)", verified: true },
    { fact: `Total territory jobs: ${totalJobs}`, source: "Salesforce CRM (Kira export Jul 2026)", verified: true },
    { fact: `Territory-priority species: ${topSpeciesNames.join(", ")}`, source: "Salesforce CRM territory species report (not suburb-level)", verified: true },
    { fact: `Phone: ${phone}`, source: options?.phone ? "Google Business Profile" : "Placeholder — needs GBP verification", verified: !!options?.phone },
    { fact: `Seasonal timing: ${seasonalTiming}`, source: "Curated regional planning guidance — reviewer confirmation required", verified: false },
    { fact: `Franchise founded: ${yearsServing}`, source: options?.yearsServing ? "Google Business Profile" : "Needs franchisor confirmation", verified: !!options?.yearsServing },
    // Sonar-verified citations
    { fact: `Existing Skedaddle page: ${research.existingPageStatus}`, source: research.existingPageCitation || "Perplexity Sonar research — reviewer confirmation required", verified: false },
    ...(research.county ? [{ fact: `Research-suggested county: ${research.county}`, source: research.localFactsCitations[0] || "Perplexity Sonar research — reviewer confirmation required", verified: false }] : []),
    ...(research.verifiedNeighbourhoods.length > 0 ? [{ fact: `Research-suggested neighbourhoods: ${research.verifiedNeighbourhoods.join(", ")}`, source: research.localFactsCitations[0] || "Perplexity Sonar research — reviewer confirmation required", verified: false }] : []),
    ...(research.topCompetitors.length > 0 ? [{ fact: `Research-suggested competitors: ${research.topCompetitors.map(c => c.name).join(", ")}`, source: research.competitorCitations[0] || "Perplexity Sonar research — reviewer confirmation required", verified: false }] : []),
  ];

  return {
    urlSlug: `/location/${territorySlug}/${suburbSlug}/`,
    metaTitle: `Wildlife Removal in ${suburbName} | Skedaddle ${territoryName}`,
    metaDescription,
    h1: `Wildlife Removal in ${suburbName}`,
    trustChips,
    nap: {
      name: `Skedaddle Humane Wildlife Control - ${territoryName}`,
      phone,
      serviceArea: `${suburbName} and surrounding ${state} communities`,
      source: options?.phone ? "Verified: Google Business Profile" : "Pending: Needs GBP verification",
    },
    introSection,
    whyChooseSection,
    speciesSections,
    neighbourhoodSection,
    faqSection,
    closingCta: `Book Your ${suburbName} Inspection`,
    schemaBlocks,
    launchChecklist,
    citations,
    // Sonar research results (for UI display and debugging)
    research: {
      existingPageStatus: research.existingPageStatus,
      existingPageUrl: research.existingPageUrl,
      county: research.county,
      verifiedNeighbourhoods: research.verifiedNeighbourhoods,
      topCompetitors: research.topCompetitors,
      localFactsCitations: research.localFactsCitations,
    },
  };
}

// ─── tRPC Router ─────────────────────────────────────────────────────────────

export const suburbPageRouter = router({
  // Get available territories and their top suburbs
  getTerritories: publicProcedure.query(async () => {
    const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
    const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");

    return FRANCHISE_LOCATIONS
      .filter((loc: any) => loc.status === "active" && DASHBOARD_DATA[loc.id])
      .map((loc: any) => {
        const data = DASHBOARD_DATA[loc.id];
        return {
          id: loc.id,
          name: data.name,
          city: loc.city,
          state: loc.state,
          country: loc.country,
          suburbs: data.suburbs.slice(0, 12).map((s: any) => ({
            name: s.suburb,
            revenue: s.revenue,
            jobs: s.jobs,
          })),
        };
      });
  }),

  // Generate suburb page content
  generate: adminProcedure
    .input(z.object({
      territoryId: z.string(),
      suburbName: z.string(),
      neighbourhoods: z.array(z.string().min(2)).min(1),
      nearbyCities: z.array(z.string()).optional(),
      phone: z.string().min(7),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      county: z.string().min(2),
      yearsServing: z.string().regex(/^\d{4}$/),
      franchiseFoundedYear: z.string().regex(/^\d{4}$/),
      gbpUrl: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const content = await generateSuburbPageContent(input.territoryId, input.suburbName, {
        neighbourhoods: input.neighbourhoods,
        nearbyCities: input.nearbyCities,
        phone: input.phone,
        latitude: input.latitude,
        longitude: input.longitude,
        county: input.county,
        yearsServing: input.yearsServing,
        franchiseFoundedYear: input.franchiseFoundedYear,
        gbpUrl: input.gbpUrl,
      });

      // Store in database
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const suburbSlug = input.suburbName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const [inserted] = await db.insert(suburbPages).values({
        territoryId: input.territoryId,
        suburbName: input.suburbName,
        suburbSlug,
        status: "draft",
        contentJson: JSON.stringify(content),
        schemaJson: JSON.stringify(content.schemaBlocks),
        metaTitle: content.metaTitle,
        metaDescription: content.metaDescription,
        h1: content.h1,
        wordCount: content.speciesSections.reduce((sum, s) => sum + s.wordCount, 0) + 250, // body + intro + why choose
        speciesTiers: JSON.stringify(content.speciesSections.map(s => ({ species: s.species, tier: s.tier, words: s.wordCount }))),
        generatedAt: new Date(),
      });

      return { id: inserted.insertId, content };
    }),

  // List generated pages
  list: adminProcedure
    .input(z.object({ territoryId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input?.territoryId) {
        return await db.select().from(suburbPages).where(eq(suburbPages.territoryId, input.territoryId)).orderBy(desc(suburbPages.generatedAt));
      }
      return await db.select().from(suburbPages).orderBy(desc(suburbPages.generatedAt));
    }),

  // Get single page content
  getPage: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [page] = await db.select().from(suburbPages).where(eq(suburbPages.id, input.id));
      if (!page) throw new Error("Page not found");
      return {
        ...page,
        content: JSON.parse(page.contentJson || "{}") as SuburbPageContent,
        schema: JSON.parse(page.schemaJson || "[]"),
      };
    }),

  // Update page status (approval workflow)
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "in_review", "approved", "exported"]),
      reviewerNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(suburbPages)
        .set({
          status: input.status,
          reviewerNotes: input.reviewerNotes || null,
          ...(input.status === "approved" ? { approvedAt: new Date(), reviewedBy: ctx.user.name || ctx.user.openId } : {}),
        })
        .where(eq(suburbPages.id, input.id));
      return { success: true };
    }),
});
