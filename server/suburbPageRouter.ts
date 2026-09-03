/**
 * Review-only suburb-page content workflow.
 *
 * A draft may use approved territory identity, active Drive-workbook aggregate
 * species context, reviewer-confirmed publishing facts, and cited research
 * suggestions. It must never use static dashboard performance data or infer
 * suburb-level demand, revenue, service coverage, availability, or ownership.
 */

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { suburbPages } from "../drizzle/schema";
import { adminProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { getTerritorySpeciesContext, type TerritorySpeciesContext } from "./suburbContentSources";
import { buildSuburbSchema, type SuburbSchemaParams } from "./templates/suburbPageSchema";
import { getTerritoryCatalogEntry, TERRITORY_CATALOG } from "./territoryCatalog";
import { findSuburbAnalyticsEvidence } from "./territoryReportingData";

type ChecklistStatus = "ready" | "needs_review" | "pending";

export interface SuburbPageContent {
  urlSlug: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  trustChips: string[];
  nap: { name: string; phone: string; serviceArea: string; source: string };
  introSection: string;
  whyChooseSection: string;
  speciesSections: Array<{
    species: string;
    heading: string;
    body: string;
    wordCount: number;
  }>;
  neighbourhoodSection: string;
  faqSection: Array<{ question: string; answer: string }>;
  closingCta: string;
  schemaBlocks: object[];
  launchChecklist: Array<{ item: string; status: ChecklistStatus }>;
  citations: Array<{ fact: string; source: string; verified: boolean }>;
  sourceContext: {
    workbook: {
      status: "complete" | "partial";
      rowsRejected: number;
      scope: "territory_aggregate_work_order_species_only";
    };
    reviewerConfirmedServiceAvailability: true;
    reviewerConfirmedPublishingFacts: true;
    researchSuggestionUrls: string[];
    importedPageEvidence: boolean;
  };
  approval?: { reviewerAttested: true; approvedAt: string; reviewerNotes: string };
}

interface PublishingFacts {
  neighbourhoods: string[];
  phone: string;
  county: string;
  yearsServing: string;
  franchiseFoundedYear: string;
  gbpUrl: string;
  reviewerConfirmedServiceAvailability: true;
  reviewerConfirmedPublishingFacts: true;
}

interface ResearchSuggestion {
  sourceUrls: string[];
  status: "available" | "unavailable";
}

const humanReadableSourceState = (context: TerritorySpeciesContext) => (
  context.activeRun.status === "partial"
    ? "Active Drive-workbook aggregate is partial; row rejections are disclosed and no coverage is inferred."
    : "Active Drive-workbook aggregate is complete for its imported scope."
);

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function wordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function uniqueText(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function assertNarrativeSafety(value: string): void {
  const prohibitedPatterns: Array<[RegExp, string]> = [
    [/\b(?:revenue|jobs?|ranking|conversion|close rate)\b/i, "performance metric"],
    [/\b(?:most common|common in|prevalent|frequent|observed)\b/i, "suburb species observation"],
    [/\b(?:same[- ]day|today|guarantee|warranty|licensed|licen[cs]e|regulation|price|pricing)\b|\$/i, "unsupported operational or commercial claim"],
    [/\b(?:rich results?|AI citations?|AEO|GEO|indexing|traffic|conversions?)\b/i, "outcome guarantee or optimization claim"],
  ];
  for (const [pattern, label] of prohibitedPatterns) {
    if (pattern.test(value)) throw new Error(`The content model introduced a prohibited ${label}. No draft was saved.`);
  }
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw;
  const candidate = fenced.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error("The content model returned no JSON draft.");
  const parsed = JSON.parse(candidate) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The content model returned an invalid draft shape.");
  }
  return parsed as Record<string, unknown>;
}

function requiredText(record: Record<string, unknown>, key: string, maxLength: number): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`The content model returned an invalid ${key} field.`);
  }
  return value.trim();
}

const INTERNAL_SUBURB_DRAFT_MODEL = "gpt-5.5";

async function callInternalSuburbNarrative(prompt: string, maxTokens: number): Promise<string> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Content drafting timed out. No draft was saved.")), 60_000);
  });
  const result = await Promise.race([
    invokeLLM({
      model: INTERNAL_SUBURB_DRAFT_MODEL,
      messages: [{ role: "user", content: prompt }],
      maxTokens,
      reasoning: { effort: "high" },
      responseFormat: { type: "json_object" },
    }),
    timeout,
  ]);
  const content = result.choices[0]?.message.content;
  const text = typeof content === "string"
    ? content.trim()
    : content?.filter((part) => part.type === "text").map((part) => part.text).join("\n").trim();
  if (!text) throw new Error("Content drafting returned an empty response. No draft was saved.");
  return text;
}

async function getResearchSuggestions(suburbName: string, state: string, country: "US" | "CA"): Promise<ResearchSuggestion> {
  const apiKey = process.env.SONAR_API_KEY;
  if (!apiKey) return { status: "unavailable", sourceUrls: [] };

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar-pro",
        max_tokens: 350,
        messages: [{
          role: "user",
          content: `Find public, authoritative sources that a human editor could review for a suburb page about ${suburbName}, ${state}, ${country === "CA" ? "Canada" : "United States"}. Return only source URLs and a short description of what each source may support. Do not make service-coverage, pricing, availability, competitor-review, or ranking claims.`,
        }],
      }),
    });
    if (!response.ok) return { status: "unavailable", sourceUrls: [] };
    const body = await response.json() as { citations?: unknown };
    return {
      status: "available",
      sourceUrls: uniqueText(Array.isArray(body.citations) ? body.citations.filter((url): url is string => typeof url === "string").slice(0, 5) : []),
    };
  } catch {
    return { status: "unavailable", sourceUrls: [] };
  }
}

async function generateNarrative(
  territoryName: string,
  state: string,
  suburbName: string,
  species: string[],
  facts: PublishingFacts,
): Promise<Pick<SuburbPageContent, "introSection" | "whyChooseSection" | "speciesSections" | "neighbourhoodSection" | "faqSection" | "closingCta">> {
  const raw = await callInternalSuburbNarrative(`You are drafting an internal, review-only local service-content package. Return one JSON object and no prose outside the JSON.

Page intent: a homeowner researching wildlife-control service information for ${suburbName}, ${state}.
Brand identity: ${territoryName}.
Reviewer-confirmed publishing facts: service availability for ${suburbName} has been reviewed; phone ${facts.phone}; GBP URL ${facts.gbpUrl}; franchise founded year ${facts.franchiseFoundedYear}; serving-area year ${facts.yearsServing}; county or regional municipality ${facts.county}; reviewer-approved neighbourhood names ${facts.neighbourhoods.join(", ")}.
Territory-level workbook context: ${species.join(", ")}. This is an aggregate work-order species ordering for the territory only. It is not evidence that any species is common in ${suburbName}, and it carries no revenue, job, ranking, trend, conversion, or service-coverage meaning.

Required JSON shape:
{
  "introSection": "80-120 words",
  "whyChooseSection": "100-160 words",
  "speciesSections": [{"species":"exact supplied species name","body":"60-100 words"}],
  "neighbourhoodSection": "60-100 words",
  "faqSection": [{"question":"...","answer":"..."}],
  "closingCta": "one concise sentence"
}

Rules: write naturally, answer the main homeowner question early, and use clear headings implied by the fields. Treat the supplied species only as territory-priority editorial context; call it “territory-level context” if it must be mentioned. Do not say it is common, observed, seasonal, or present in the suburb. Do not introduce a method, price, inspection timing, warranty, licence, regulation, guarantee, years of experience, service area beyond the reviewer confirmation, office address, review, rating, competitor, ranking, or success outcome. Do not promise AEO, GEO, indexing, rich results, AI citations, traffic, or conversions. Do not keyword-stuff. Do not use research suggestions as facts. The neighbourhood paragraph may name only the provided neighbourhoods and must say that final page coverage wording requires editorial review. FAQs must be broadly helpful and must not make unsupported claims.`, 2_800);

  const parsed = parseJsonObject(raw);
  const providedSpecies = new Set(species);
  const rawSpecies = parsed.speciesSections;
  if (!Array.isArray(rawSpecies) || rawSpecies.length !== species.length) {
    throw new Error("The content model returned an incomplete territory-context species section set.");
  }
  const speciesSections = rawSpecies.map((section) => {
    if (!section || typeof section !== "object" || Array.isArray(section)) {
      throw new Error("The content model returned an invalid species section.");
    }
    const record = section as Record<string, unknown>;
    const speciesName = requiredText(record, "species", 80);
    if (!providedSpecies.has(speciesName)) throw new Error("The content model introduced an unapproved species.");
    const body = requiredText(record, "body", 1_200);
    assertNarrativeSafety(body);
    return { species: speciesName, heading: `${speciesName} information for ${suburbName}`, body, wordCount: wordCount(body) };
  });

  const faqValue = parsed.faqSection;
  if (!Array.isArray(faqValue) || faqValue.length < 2 || faqValue.length > 5) {
    throw new Error("The content model returned an invalid FAQ set.");
  }
  const faqSection = faqValue.map((faq) => {
    if (!faq || typeof faq !== "object" || Array.isArray(faq)) throw new Error("The content model returned an invalid FAQ.");
    const record = faq as Record<string, unknown>;
    return { question: requiredText(record, "question", 220), answer: requiredText(record, "answer", 900) };
  });

  const introSection = requiredText(parsed, "introSection", 1_500);
  const whyChooseSection = requiredText(parsed, "whyChooseSection", 2_000);
  const neighbourhoodSection = requiredText(parsed, "neighbourhoodSection", 1_500);
  const closingCta = requiredText(parsed, "closingCta", 280);
  for (const value of [introSection, whyChooseSection, neighbourhoodSection, closingCta, ...faqSection.flatMap((faq) => [faq.question, faq.answer])]) {
    assertNarrativeSafety(value);
  }

  return {
    introSection,
    whyChooseSection,
    speciesSections,
    neighbourhoodSection,
    faqSection,
    closingCta,
  };
}

export async function generateSuburbPageContent(
  territoryId: string,
  suburbName: string,
  facts: PublishingFacts,
): Promise<SuburbPageContent> {
  const territory = getTerritoryCatalogEntry(territoryId);
  if (!territory) throw new Error("The selected territory is not in the approved identity mapping.");

  const workbookContext = await getTerritorySpeciesContext(territoryId);
  if (!workbookContext) {
    throw new Error("No active Drive-workbook aggregate is available for this territory. No draft was generated.");
  }
  const species = workbookContext.species.map((item) => item.name);
  const territorySlug = slugify(territoryId);
  const suburbSlug = slugify(suburbName);
  if (!suburbSlug) throw new Error("The suburb name cannot produce a valid review URL slug.");

  const [narrative, research, pageEvidence] = await Promise.all([
    generateNarrative(territory.name, territory.state, suburbName, species, facts),
    getResearchSuggestions(suburbName, territory.state, territory.country),
    findSuburbAnalyticsEvidence(territoryId, suburbName),
  ]);
  const importedPageEvidence = pageEvidence.gscPages.length > 0 || pageEvidence.ga4Pages.length > 0;
  const serviceArea = `${suburbName}, ${territory.state}`;
  const metaDescription = `Review-required wildlife service information for ${suburbName} from ${territory.name}. Call ${facts.phone} to discuss your property.`.slice(0, 155);

  // Structured data must mirror visible, reviewer-approved facts. The schema
  // builder receives only these visible draft fields and confirmed inputs.
  const schemaParams: SuburbSchemaParams = {
    territoryName: territory.name,
    territorySlug,
    franchisePhone: facts.phone,
    suburbName,
    suburbSlug,
    species: narrative.speciesSections.map((section) => ({
      name: section.species,
      serviceType: `${section.species} information`,
      slug: slugify(section.species),
      description: section.body,
    })),
    faqs: narrative.faqSection,
    gbpUrl: facts.gbpUrl,
    visibleBusinessDescription: narrative.introSection,
    reviewerConfirmedServiceAvailability: true,
  };
  const schemaBlocks = buildSuburbSchema(schemaParams);

  const partialDisclosure = workbookContext.activeRun.status === "partial"
    ? "Active workbook source is partial; the territory context does not represent complete coverage."
    : "Active workbook source is complete for its imported scope; the species context remains territory-level only.";
  const launchChecklist: Array<{ item: string; status: ChecklistStatus }> = [
    { item: "Reviewer-confirmed publishing facts were supplied for this draft", status: "ready" },
    { item: "Reviewer-confirmed service availability was supplied for this draft", status: "ready" },
    { item: "Active Drive-workbook aggregate source is disclosed as complete or partial", status: "ready" },
    { item: "Territory-level species context is not presented as suburb evidence", status: "ready" },
    { item: "Visible draft and JSON-LD facts have been compared for parity", status: "needs_review" },
    { item: "Research suggestions and any local statements have been independently verified", status: "needs_review" },
    { item: "Existing-page evidence and proposed URL have been reviewed", status: "needs_review" },
    { item: "Internal links, page status, and final publishing approval have been recorded", status: "needs_review" },
  ];

  return {
    urlSlug: `/location/${territorySlug}/${suburbSlug}/`,
    metaTitle: `Wildlife Service Information in ${suburbName} | ${territory.name}`.slice(0, 60),
    metaDescription,
    h1: `Wildlife service information for ${suburbName}`,
    trustChips: ["Review-only draft", "Reviewer-confirmed publishing facts", workbookContext.activeRun.status === "partial" ? "Partial workbook source disclosed" : "Active workbook source disclosed"],
    nap: {
      name: territory.name,
      phone: facts.phone,
      serviceArea,
      source: "Reviewer-confirmed publishing facts; live GBP data has not been queried.",
    },
    ...narrative,
    schemaBlocks,
    launchChecklist,
    citations: [
      { fact: `Territory species context: ${species.join(", ")}`, source: "Active UWS Drive-workbook aggregate; territory work-order species ordering only", verified: true },
      { fact: partialDisclosure, source: `Active UWS Drive-workbook import run (${workbookContext.activeRun.status})`, verified: true },
      { fact: `Reviewer-confirmed phone, GBP URL, years, county, neighbourhoods, and service availability for ${suburbName}`, source: "Reviewer-provided publishing facts", verified: true },
      { fact: importedPageEvidence ? "Imported GSC/GA4 has matching page evidence; current page state still requires editorial review." : "No matching imported GSC/GA4 page evidence was found; this is not proof that no page exists.", source: "Imported analytics evidence", verified: importedPageEvidence },
      ...(research.sourceUrls.map((url) => ({ fact: "Research suggestion requiring independent editorial verification", source: url, verified: false }))),
      ...(research.status === "unavailable" ? [{ fact: "No live research suggestion was retrieved; no local research facts were used in this draft.", source: "Research service unavailable", verified: false }] : []),
    ],
    sourceContext: {
      workbook: {
        status: workbookContext.activeRun.status,
        rowsRejected: workbookContext.activeRun.rowsRejected,
        scope: "territory_aggregate_work_order_species_only",
      },
      reviewerConfirmedServiceAvailability: true,
      reviewerConfirmedPublishingFacts: true,
      researchSuggestionUrls: research.sourceUrls,
      importedPageEvidence,
    },
  };
}

const generationInput = z.object({
  territoryId: z.string().min(1).max(64),
  suburbName: z.string().trim().min(2).max(100),
  neighbourhoods: z.array(z.string().trim().min(2).max(100)).min(1).max(20),
  phone: z.string().trim().min(7).max(40),
  county: z.string().trim().min(2).max(160),
  yearsServing: z.string().regex(/^\d{4}$/),
  franchiseFoundedYear: z.string().regex(/^\d{4}$/),
  gbpUrl: z.string().url().max(2_000),
  reviewerConfirmedServiceAvailability: z.literal(true),
  reviewerConfirmedPublishingFacts: z.literal(true),
});

export const suburbPageRouter = router({
  getTerritories: adminProcedure.query(() => TERRITORY_CATALOG),

  getTerritoryContext: adminProcedure
    .input(z.object({ territoryId: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const territory = getTerritoryCatalogEntry(input.territoryId);
      if (!territory) return { territory: null, source: "unavailable" as const, activeRun: null, species: [] };
      const context = await getTerritorySpeciesContext(input.territoryId);
      if (!context) return { territory, source: "unavailable" as const, activeRun: null, species: [] };
      return {
        territory,
        source: "salesforce_drive_workbook" as const,
        activeRun: {
          status: context.activeRun.status,
          rowsRejected: context.activeRun.rowsRejected,
          sourceNote: humanReadableSourceState(context),
        },
        species: context.species.map((item) => item.name),
      };
    }),

  generate: adminProcedure
    .input(generationInput)
    .mutation(async ({ input }) => {
      const content = await generateSuburbPageContent(input.territoryId, input.suburbName, input);
      const db = await getDb();
      if (!db) throw new Error("Database not available. No draft was saved.");
      const [inserted] = await db.insert(suburbPages).values({
        territoryId: input.territoryId,
        suburbName: input.suburbName,
        suburbSlug: slugify(input.suburbName),
        status: "draft",
        contentJson: JSON.stringify(content),
        schemaJson: JSON.stringify(content.schemaBlocks),
        metaTitle: content.metaTitle,
        metaDescription: content.metaDescription,
        h1: content.h1,
        wordCount: wordCount([content.introSection, content.whyChooseSection, content.neighbourhoodSection, content.closingCta, ...content.speciesSections.map((section) => section.body), ...content.faqSection.map((faq) => faq.answer)].join(" ")),
        speciesTiers: JSON.stringify(content.speciesSections.map((section) => ({ species: section.species, source: "territory_aggregate_work_order_context" }))),
        generatedAt: new Date(),
      });
      return { id: inserted.insertId, content };
    }),

  list: adminProcedure
    .input(z.object({ territoryId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input?.territoryId) return db.select().from(suburbPages).where(eq(suburbPages.territoryId, input.territoryId)).orderBy(desc(suburbPages.generatedAt));
      return db.select().from(suburbPages).orderBy(desc(suburbPages.generatedAt));
    }),

  getPage: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [page] = await db.select().from(suburbPages).where(eq(suburbPages.id, input.id));
      if (!page) throw new Error("Page not found");
      return { ...page, content: JSON.parse(page.contentJson || "{}") as SuburbPageContent, schema: JSON.parse(page.schemaJson || "[]") };
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["draft", "in_review", "approved", "exported"]),
      reviewerNotes: z.string().trim().max(4_000).optional(),
      reviewerApprovalAttestation: z.literal(true).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [page] = await db.select().from(suburbPages).where(eq(suburbPages.id, input.id));
      if (!page) throw new Error("Page not found");

      let content = JSON.parse(page.contentJson || "{}") as SuburbPageContent;
      if (input.status === "approved") {
        if (input.reviewerApprovalAttestation !== true || !input.reviewerNotes || input.reviewerNotes.length < 12) {
          throw new Error("Approval requires reviewer attestation and concise notes confirming source, schema, local-claim, link, and publishing review.");
        }
        if (!content.sourceContext?.reviewerConfirmedPublishingFacts || !content.sourceContext?.reviewerConfirmedServiceAvailability || !content.sourceContext?.workbook) {
          throw new Error("This legacy or incomplete draft cannot be approved without source-safe review context.");
        }
        content = { ...content, approval: { reviewerAttested: true, approvedAt: new Date().toISOString(), reviewerNotes: input.reviewerNotes } };
      }
      if (input.status === "exported" && page.status !== "approved") {
        throw new Error("Only an approved, reviewed draft may be exported.");
      }
      await db.update(suburbPages).set({
        status: input.status,
        reviewerNotes: input.reviewerNotes || page.reviewerNotes,
        contentJson: JSON.stringify(content),
        ...(input.status === "approved" ? { approvedAt: new Date(), reviewedBy: "portal-reviewer" } : {}),
      }).where(eq(suburbPages.id, input.id));
      return { success: true };
    }),
});
