import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import puppeteer from "puppeteer";
import {
  loadTerritoryCloseRate,
  loadTerritoryReportingAnalytics,
  matchedMonthComparison,
} from "./territoryReportingData";
import { dedicatedSuburbHubMatchesPage } from "../shared/ga4PageClassifier";
import {
  INITIAL_SALES_REPORT_WINDOW,
  previousYearWindow,
  reportingMonthIso,
  reportingWindowLabel,
} from "../shared/reportingPeriod";
import { createReportDraft, getReportDraft, markReportDraftExported } from "./reportDraftStore";

// ─── Types ───────────────────────────────────────────────────────────────────

const strategyConfigSchema = z.object({
  currentGbpPostsPerMonth: z.number().int().nonnegative(),
  currentBlogPostsPerMonth: z.number().int().nonnegative(),
  proposedGbpPostsPerMonth: z.number().int().nonnegative(),
  proposedBlogPostsPerMonth: z.number().int().nonnegative(),
  proposedSuburbPages: z.number().int().nonnegative(),
  proposedSpeciesLocationPages: z.number().int().nonnegative(),
  campaignNotes: z.string().max(3000).default(""),
});
export type StrategyConfig = z.infer<typeof strategyConfigSchema>;

const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  currentGbpPostsPerMonth: 0,
  currentBlogPostsPerMonth: 0,
  proposedGbpPostsPerMonth: 0,
  proposedBlogPostsPerMonth: 0,
  proposedSuburbPages: 0,
  proposedSpeciesLocationPages: 0,
  campaignNotes: "",
};

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
    networkAvgJobValue: number; // Network-wide benchmark for this species
    networkPctRevenue: number; // Network-wide % of total revenue for this species
  }>;
  suburbs: Array<{
    suburb: string;
    revenue: number;
    jobs: number;
    avgJobValue: number;
    pctRevenue: number;
    hasPage: boolean | null; // true = confirmed page, false = confirmed no page, null = unknown
  }>;
  gbp: {
    monthly: Array<{ month: string; searches: number | null; calls: number | null; website_clicks: number | null; sources: string[]; incompleteMetrics: string[] }>;
    totalSearches: number | null;
    totalCalls: number | null;
    totalClicks: number | null;
    peakMonth: string;
    peakCalls: number | null;
    avgMonthlyCalls: number | null;
    avgMonthlyClicks: number | null;
    incompletePeriods: string[];
  };
  gsc: {
    monthly: Array<{ month: string; clicks: number; impressions: number; avg_position: number }>;
    totalClicks: number;
    totalImpressions: number;
    topPages: Array<{ pageUrl: string; clicks: number; impressions: number }>;
    topQueries: Array<{ query: string; clicks: number; impressions: number }>;
  };
  ga4: {
    monthly: Array<{
      year: number;
      month: number;
      sessions: number;
      activeUsers: number;
      priorityPageSessions: number;
      complete: boolean;
      propertiesExpected: number;
      propertiesSucceeded: number;
    }>;
    totalSessions: number;
    totalPriorityPageSessions: number;
    completeMonths: number;
    partialMonths: number;
    topPages: Array<{ pagePath: string; pageType: string; sessions: number; activeUsers: number }>;
    latestImport: {
      year: number;
      month: number;
      status: "complete" | "partial" | "failed";
      propertiesExpected: number;
      propertiesSucceeded: number;
    } | null;
  };
  analyticsSource: {
    gbp: "persisted_business_profile_api" | "legacy_spreadsheet" | "mixed" | "unavailable";
    ga4: "persisted_data_api" | "unavailable";
    gsc: "persisted_search_console" | "historical_snapshot" | "unavailable";
  };
  reportingPeriod: {
    start: string;
    end: string;
    label: string;
  };
  yoy: {
    months: number[];
    ga4: { current: number; previous: number } | null;
    gsc: { current: number; previous: number } | null;
  } | null;
  closeRate: {
    inspections: number;
    closedJobs: number;
    closeRate: number | null;
    periodStart: string;
    periodEnd: string;
    sourceLabel: string;
    networkInspections: number;
    networkClosedJobs: number;
    networkCloseRate: number | null;
  } | null;
  seasonalTiming: string;
  topSpeciesNames: string[];
  topSuburbNames: string[];
  networkAvgJobValue: number; // Network-wide average job value for benchmarking
  subMarkets: string[]; // Sub-locations that roll up under this territory
  gbpSubListings: string[]; // GBP listing names for this territory
  suburbPageStatus: "validated" | "partial" | "unknown"; // Whether page existence data is confirmed
  currentGbpPostVolume: string;
  currentBlogPostVolume: string;
  proposedGbpPostsPerMonth: number;
  proposedBlogPostsPerMonth: number;
  proposedSuburbPages: number;
  proposedSpeciesLocationPages: number;
  campaignNotes: string;
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

// ─── Network Species Benchmarks (calculated from all 19 territories) ────────

const NETWORK_SPECIES_BENCHMARKS: Record<string, { avgJobValue: number; pctRevenue: number }> = {
  "Mice": { avgJobValue: 3207, pctRevenue: 27.5 },
  "Raccoons": { avgJobValue: 2127, pctRevenue: 22.9 },
  "Squirrels": { avgJobValue: 1784, pctRevenue: 21.0 },
  "Bats": { avgJobValue: 2783, pctRevenue: 16.4 },
  "Birds": { avgJobValue: 864, pctRevenue: 3.7 },
  "Skunks": { avgJobValue: 2080, pctRevenue: 2.5 },
  "Rats": { avgJobValue: 2410, pctRevenue: 2.3 },
  "Red Squirrels": { avgJobValue: 2054, pctRevenue: 1.6 },
  "Groundhogs": { avgJobValue: 2258, pctRevenue: 0.5 },
  "Chipmunks": { avgJobValue: 2063, pctRevenue: 0.3 },
  "Pigeons": { avgJobValue: 1861, pctRevenue: 0.2 },
};
const NETWORK_AVG_JOB_VALUE = 2203; // $22.2M / 10,075 jobs

// ─── Known suburb page existence (from curated action plan data) ─────────────
// true = confirmed page exists, false = confirmed NO page

const KNOWN_SUBURB_PAGES: Record<string, Record<string, boolean>> = {
  hamilton: {
    "Guelph": true,
    "St. Catharines": true,
    "Oakville": true,
    "Burlington": true,
    "Stoney Creek": false,
    "Grimsby": false,
  },
  durham: {
    "Pickering": true,
    "Bowmanville": true,
    "Oshawa": true,
    "Whitby": true,
    "Courtice": false,
    "Clarington": false,
  },
  milwaukee: {
    "Wauwatosa": true,
    "New Berlin": true,
    "Waukesha": true,
    "Brookfield": true,
    "Menomonee Falls": false,
    "Mequon": false,
  },
  madison: {
    "Sun Prairie": true,
    "DeForest": true,
    "Middleton": true,
    "Fitchburg": true,
    "Verona": false,
    "Waunakee": false,
  },
};

// ─── Build Territory Data Object ─────────────────────────────────────────────

function dashboardMonthInInitialReport(month: string): boolean {
  const normalized = /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : `${month} 1`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return false;
  const key = parsed.getFullYear() * 100 + parsed.getMonth() + 1;
  return key >= 202507 && key <= 202606;
}

export async function buildTerritoryData(
  territoryId: string,
  config: StrategyConfig = DEFAULT_STRATEGY_CONFIG,
): Promise<TerritoryDataObject> {
  const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
  const { FRANCHISE_LOCATIONS } = await import("../client/src/data/franchises");
  const { TERRITORY_GROUPS } = await import("../shared/territoryMapping");

  const location = FRANCHISE_LOCATIONS.find((l: any) => l.id === territoryId);
  if (!location) throw new Error(`Territory not found: ${territoryId}`);

  const dashData = DASHBOARD_DATA[territoryId];
  if (!dashData) throw new Error(`No dashboard data for: ${territoryId}`);
  const [reportingAnalytics, priorYearAnalytics, closeRate] = await Promise.all([
    loadTerritoryReportingAnalytics(territoryId, INITIAL_SALES_REPORT_WINDOW),
    loadTerritoryReportingAnalytics(territoryId, previousYearWindow(INITIAL_SALES_REPORT_WINDOW)),
    loadTerritoryCloseRate(territoryId),
  ]);
  const yoy = matchedMonthComparison(reportingAnalytics, priorYearAnalytics);

  const totalRevenue = dashData.total_revenue;
  const totalJobs = dashData.total_jobs;
  const avgJobValue = totalJobs > 0 ? totalRevenue / totalJobs : 0;

  // Get territory group for sub-market context
  const territoryGroup = TERRITORY_GROUPS.find((g: any) => g.id === territoryId);
  const subMarkets = territoryGroup?.ga4Territories || [location.city];
  const gbpSubListings = territoryGroup?.gbpTerritories || [location.city];

  // Enrich species data with network benchmarks
  const species = dashData.species
    .filter((s: any) => s.total_revenue > 0)
    .map((s: any) => {
      const benchmark = NETWORK_SPECIES_BENCHMARKS[s.species];
      return {
        species: s.species,
        total_revenue: s.total_revenue,
        total_jobs: s.total_jobs,
        pctRevenue: totalRevenue > 0 ? (s.total_revenue / totalRevenue) * 100 : 0,
        avgJobValue: s.total_jobs > 0 ? s.total_revenue / s.total_jobs : 0,
        networkAvgJobValue: benchmark?.avgJobValue || NETWORK_AVG_JOB_VALUE,
        networkPctRevenue: benchmark?.pctRevenue || 0,
      };
    });

  // Enrich suburb data with page existence validation
  const knownPages = KNOWN_SUBURB_PAGES[territoryId] || {};
  const suburbs = dashData.suburbs.map((s: any) => {
    // Check if we have validated page data for this suburb
    const pageStatus = knownPages[s.suburb];
    const measuredPageExists = Boolean(
      reportingAnalytics?.gsc.topPages.some(page => dedicatedSuburbHubMatchesPage(page.pageUrl, s.suburb))
      || reportingAnalytics?.ga4.topPages.some(page => dedicatedSuburbHubMatchesPage(page.pagePath, s.suburb)),
    );
    return {
      suburb: s.suburb,
      revenue: s.revenue,
      jobs: s.jobs,
      avgJobValue: s.jobs > 0 ? s.revenue / s.jobs : 0,
      pctRevenue: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
      hasPage: measuredPageExists ? true : pageStatus !== undefined ? pageStatus : null,
    };
  });

  // Determine suburb page validation status
  const measuredOrCuratedCount = suburbs.filter(s => s.hasPage !== null).length;
  const suburbPageStatus: "validated" | "partial" | "unknown" = measuredOrCuratedCount === 0
    ? "unknown"
    : measuredOrCuratedCount === suburbs.length ? "validated" : "partial";

  // GBP aggregation. Incomplete live metrics remain null and never become 0.
  const hasResolvedGbp = Boolean(reportingAnalytics?.gbp.monthly.length);
  const gbpMonthly = hasResolvedGbp
    ? reportingAnalytics!.gbp.monthly.map(row => ({
      month: row.month,
      searches: row.searches,
      calls: row.calls,
      website_clicks: row.website_clicks,
      sources: row.sources,
      incompleteMetrics: row.incompleteMetrics,
    }))
    : (dashData.gbp.monthly || [])
      .filter((row: { month: string }) => dashboardMonthInInitialReport(row.month))
      .map((row: { month: string; searches: number; calls: number; website_clicks: number }) => ({
        ...row,
        sources: ["legacy_spreadsheet"],
        incompleteMetrics: [],
      }));
  const sumKnown = (metric: "searches" | "calls" | "website_clicks") => {
    const values = gbpMonthly.map(row => row[metric]).filter((value): value is number => value !== null);
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  const averageKnown = (metric: "calls" | "website_clicks") => {
    const values = gbpMonthly.map(row => row[metric]).filter((value): value is number => value !== null);
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const totalSearches = sumKnown("searches");
  const totalCalls = sumKnown("calls");
  const totalClicks = sumKnown("website_clicks");
  const callMonths = gbpMonthly.filter((row): row is typeof row & { calls: number } => row.calls !== null);
  const peakMonth = callMonths.length > 0
    ? callMonths.reduce((max, row) => row.calls > max.calls ? row : max, callMonths[0])
    : null;
  const avgMonthlyCalls = averageKnown("calls");
  const avgMonthlyClicks = averageKnown("website_clicks");

  // Engagement does not reveal publishing volume. Campaign volumes are explicit
  // report inputs and remain "not provided" when the operator has not confirmed them.
  const currentGbpPostVolume = config.currentGbpPostsPerMonth > 0
    ? `${config.currentGbpPostsPerMonth} posts/month (confirmed input)`
    : "Not provided";
  const currentBlogPostVolume = config.currentBlogPostsPerMonth > 0
    ? `${config.currentBlogPostsPerMonth} posts/month (confirmed input)`
    : "Not provided";

  // GSC data
  const hasPersistedGsc = Boolean(reportingAnalytics?.gsc.monthly.length);
  const gscMonthly = hasPersistedGsc
    ? reportingAnalytics!.gsc.monthly
    : (dashData.gsc.monthly || []).filter((row: { month: string }) => dashboardMonthInInitialReport(row.month));
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
      peakMonth: peakMonth?.month ?? "N/A",
      peakCalls: peakMonth?.calls ?? null,
      avgMonthlyCalls,
      avgMonthlyClicks,
      incompletePeriods: reportingAnalytics?.gbp.incompletePeriods ?? [],
    },
    gsc: {
      monthly: gscMonthly,
      totalClicks: totalGscClicks,
      totalImpressions,
      topPages: reportingAnalytics?.gsc.topPages ?? [],
      topQueries: reportingAnalytics?.gsc.topQueries ?? [],
    },
    ga4: {
      monthly: reportingAnalytics?.ga4.monthly ?? [],
      totalSessions: reportingAnalytics?.ga4.totalSessions ?? 0,
      totalPriorityPageSessions: reportingAnalytics?.ga4.totalPriorityPageSessions ?? 0,
      completeMonths: reportingAnalytics?.ga4.completeMonths ?? 0,
      partialMonths: reportingAnalytics?.ga4.partialMonths ?? 0,
      topPages: reportingAnalytics?.ga4.topPages ?? [],
      latestImport: reportingAnalytics?.ga4.latestImport
        ? {
          year: reportingAnalytics.ga4.latestImport.year,
          month: reportingAnalytics.ga4.latestImport.month,
          status: reportingAnalytics.ga4.latestImport.status,
          propertiesExpected: reportingAnalytics.ga4.latestImport.propertiesExpected,
          propertiesSucceeded: reportingAnalytics.ga4.latestImport.propertiesSucceeded,
        }
        : null,
    },
    analyticsSource: {
      gbp: !hasResolvedGbp
        ? gbpMonthly.length > 0 ? "legacy_spreadsheet" : "unavailable"
        : reportingAnalytics!.gbp.sources.length > 1
          ? "mixed"
          : reportingAnalytics!.gbp.sources[0] === "persisted_business_profile_api"
            ? "persisted_business_profile_api"
            : reportingAnalytics!.gbp.sources[0] === "legacy_spreadsheet"
              ? "legacy_spreadsheet"
              : "unavailable",
      ga4: reportingAnalytics?.ga4.monthly.length ? "persisted_data_api" : "unavailable",
      gsc: hasPersistedGsc
        ? "persisted_search_console"
        : gscMonthly.length > 0 ? "historical_snapshot" : "unavailable",
    },
    reportingPeriod: {
      start: `${reportingMonthIso(INITIAL_SALES_REPORT_WINDOW.start)}-01`,
      end: "2026-06-30",
      label: reportingWindowLabel(INITIAL_SALES_REPORT_WINDOW),
    },
    yoy,
    closeRate,
    seasonalTiming: SEASONAL_DATA[location.state] || SEASONAL_DATA["default"],
    topSpeciesNames: species.slice(0, 5).map((s: any) => s.species),
    topSuburbNames: suburbs.slice(0, 8).map((s: any) => s.suburb),
    networkAvgJobValue: NETWORK_AVG_JOB_VALUE,
    subMarkets,
    gbpSubListings,
    suburbPageStatus,
    currentGbpPostVolume,
    currentBlogPostVolume,
    proposedGbpPostsPerMonth: config.proposedGbpPostsPerMonth,
    proposedBlogPostsPerMonth: config.proposedBlogPostsPerMonth,
    proposedSuburbPages: config.proposedSuburbPages,
    proposedSpeciesLocationPages: config.proposedSpeciesLocationPages,
    campaignNotes: config.campaignNotes,
  };
}

// ─── Claude API helper ───────────────────────────────────────────────────────

export async function runReportNarrativeTasks<T>(
  tasks: Array<() => Promise<T>>,
  concurrency = 8,
): Promise<T[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Report narrative concurrency must be a positive integer.");
  }
  const results = new Array<T>(tasks.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (nextIndex < tasks.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

const DIRECT_CLAUDE_TOTAL_BUDGET_MS = 65_000;
const DIRECT_CLAUDE_ATTEMPT_TIMEOUT_MS = 45_000;
const FORGE_CLAUDE_TIMEOUT_MS = 25_000;

async function withReportTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callClaude(prompt: string, model: string = "claude-opus-5", maxTokens: number = 4000): Promise<string> {
  // Primary path: Direct Anthropic API (Claude Opus 5)
  const apiKey = ENV.anthropicApiKey;
  if (apiKey) {
    const directDeadline = Date.now() + DIRECT_CLAUDE_TOTAL_BUDGET_MS;
    for (let attempt = 0; attempt < 2; attempt++) {
      const remainingMs = directDeadline - Date.now();
      if (remainingMs < 1_000) break;
      try {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: AbortSignal.timeout(Math.min(DIRECT_CLAUDE_ATTEMPT_TIMEOUT_MS, remainingMs)),
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

        if (resp.ok) {
          const result = await resp.json() as { content: Array<{ text: string }> };
          const text = result.content[0]?.text || "";
          if (text.trim().length > 20) return text;
          console.warn(`Claude direct API returned near-empty (${text.length} chars), attempt ${attempt + 1}`);
        } else {
          const errText = await resp.text();
          console.error(`Claude direct API error (${model}), attempt ${attempt + 1}:`, resp.status, errText);
        }
      } catch (err) {
        console.error(`Claude direct API fetch error, attempt ${attempt + 1}:`, err);
      }
    }
    console.warn(`Direct Anthropic API failed after 2 attempts — falling back to built-in forge API`);
  }

  // Fallback path: Built-in forge API (has retry/backoff built in)
  try {
    const forgeModel = "claude-opus-4-7"; // Best Claude model available on forge
    console.log(`Using forge API fallback with ${forgeModel}`);
    const result = await withReportTimeout(
      invokeLLM({
        model: forgeModel,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
      }),
      FORGE_CLAUDE_TIMEOUT_MS,
      `Forge ${forgeModel} report request`,
    );
    const content = result.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((p: any) => p.type === "text" ? p.text : "").join("") : "";
    if (text.trim().length > 20) return text;
    console.warn(`Forge API also returned near-empty (${text.length} chars)`);
  } catch (err) {
    console.error(`Forge API fallback error:`, err);
  }

  return "";
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatCurrency(amount: number, symbol: string): string {
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
  return `${symbol}${amount.toFixed(0)}`;
}

function formatNumber(n: number | null): string {
  return n === null ? "Not available" : n.toLocaleString("en-US");
}

function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function gbpSourceLabel(source: TerritoryDataObject["analyticsSource"]["gbp"]): string {
  if (source === "persisted_business_profile_api") return "persisted Google Business Profile API import";
  if (source === "legacy_spreadsheet") return "historical Google Business Profile spreadsheet";
  if (source === "mixed") return "mixed Google Business Profile sources and/or coverage states; see metric-period disclosures";
  return "Google Business Profile data unavailable";
}

function gbpPromptCoverageContext(data: TerritoryDataObject): string {
  const incomplete = data.gbp.incompletePeriods.length > 0
    ? data.gbp.incompletePeriods.join(", ")
    : "none";
  return `GBP source: ${gbpSourceLabel(data.analyticsSource.gbp)}. Incomplete live periods excluded from headline values: ${incomplete}. Do not describe excluded periods as zero, complete, or part of the reported totals.`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  } as Record<string, string>)[character] || character);
}

function narrativeParagraphsHtml(text: string): string {
  return text.split(/\n\n+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => `<p class="narrative">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("\n");
}

// ─── Section Generators ──────────────────────────────────────────────────────

async function generateExecutiveSummary(data: TerritoryDataObject): Promise<string> {
  const gscSourceLabel = data.analyticsSource.gsc === "persisted_search_console"
    ? "persisted Search Console import"
    : data.analyticsSource.gsc === "historical_snapshot"
      ? "historical Search Console snapshot"
      : "unavailable";
  const ga4Evidence = data.ga4.monthly.length
    ? `${formatNumber(data.ga4.totalPriorityPageSessions)} species/location-page sessions across ${data.ga4.monthly.length} imported months (${data.ga4.completeMonths} complete, ${data.ga4.partialMonths} partial)`
    : "No persisted GA4 import available; do not claim GA4 performance";
  const prompt = `You are writing the Executive Summary section of a franchise digital marketing strategy document for Skedaddle Humane Wildlife Control — the "${data.name}" territory (${data.city}, ${data.state}, ${data.country}).

TERRITORY DATA:
- Total closed revenue (${data.reportingPeriod.label}): ${formatCurrency(data.totalRevenue, data.currencySymbol)}
- Total closed jobs: ${formatNumber(data.totalJobs)}
- Average job value: ${formatCurrency(data.avgJobValue, data.currencySymbol)}
- Top species by revenue: ${data.topSpeciesNames.join(", ")}
- Top suburbs/cities by revenue: ${data.topSuburbNames.slice(0, 6).join(", ")}
- GBP total calls (available period): ${formatNumber(data.gbp.totalCalls)}
- GBP total website clicks: ${formatNumber(data.gbp.totalClicks)}
- ${gbpPromptCoverageContext(data)}
- Search Console evidence: ${data.gsc.monthly.length ? `${formatNumber(data.gsc.totalClicks)} organic clicks across ${data.gsc.monthly.length} months (${gscSourceLabel})` : "Unavailable; do not claim Search Console performance"}
- GA4 priority-page evidence: ${ga4Evidence}
- This territory's average job value: ${formatCurrency(data.avgJobValue, data.currencySymbol)}
- Do not compare average job value across CAD and USD territories without an exchange-rate snapshot
- Seasonal timing: ${data.seasonalTiming}

Write a compelling 3-4 paragraph executive summary that:
1. Opens with the territory name and key revenue/jobs metrics
2. Identifies the top 2-3 species driving revenue and the top suburbs generating demand
3. Notes the available GBP, Search Console, and GA4 evidence without implying unavailable data
4. Ends with a clear 2-sentence recommendation: structured local SEO + hub-and-spoke content model to grow organic visibility

STYLE: Professional, data-backed, direct. Written like a senior digital strategist who has studied this territory's numbers. No fluff, no AI-sounding phrases like "leverage" or "harness." Every claim backed by a number from the data above.

Return ONLY the paragraph text (no headings, no HTML tags, no markdown). Use plain text with line breaks between paragraphs.`;

  const text = await callClaude(prompt, "claude-opus-5", 1500);

  // Convert plain text paragraphs to HTML
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length > 0) {
    return narrativeParagraphsHtml(text);
  }

  // Fallback: generate a data-driven executive summary if AI returned empty
  console.warn(`Executive Summary AI returned empty for ${data.name} — using data-driven fallback`);
  const topSpecies = data.topSpeciesNames.slice(0, 3).join(", ");
  const topSuburbs = data.topSuburbNames.slice(0, 3).join(", ");
  return `<p class="narrative">${data.name} is a ${data.totalRevenue > 1000000 ? "proven" : "developing"} Skedaddle market generating ${formatCurrency(data.totalRevenue, data.currencySymbol)} from ${data.reportingPeriod.label} across ${formatNumber(data.totalJobs)} closed jobs, with an average ticket of ${formatCurrency(data.avgJobValue, data.currencySymbol)}. The territory's top revenue species are ${topSpecies}.</p>
<p class="narrative">The available ${gbpSourceLabel(data.analyticsSource.gbp)} recorded ${formatNumber(data.gbp.totalCalls)} calls and ${formatNumber(data.gbp.totalClicks)} website clicks.${data.gbp.incompletePeriods.length ? ` Incomplete live periods excluded from these headline values: ${data.gbp.incompletePeriods.join(", ")}.` : ""}${data.gsc.monthly.length ? ` The available ${data.analyticsSource.gsc === "persisted_search_console" ? "persisted Search Console import" : "historical Search Console snapshot"} recorded ${formatNumber(data.gsc.totalClicks)} organic clicks.` : " No Search Console history is available for this report."}${data.ga4.monthly.length ? ` Persisted GA4 imports recorded ${formatNumber(data.ga4.totalPriorityPageSessions)} species and location-page sessions.` : ""} Geographically, the primary markets are ${topSuburbs}.</p>
<p class="narrative">This report outlines a structured digital marketing program built around local SEO, hub-and-spoke content architecture, and species-specific suburb pages to grow organic visibility and lead volume across the territory.</p>`;
}

async function generateGapAnalysis(data: TerritoryDataObject, priorContext: string): Promise<string> {
  // Separate suburbs by page status
  const confirmedNoPage = data.suburbs.filter(s => s.hasPage === false).slice(0, 10);
  const unknownPageStatus = data.suburbs.filter(s => s.hasPage === null).slice(0, 10);
  const confirmedHasPage = data.suburbs.filter(s => s.hasPage === true);

  let suburbGapList: string;
  let gapFraming: string;

  if (data.suburbPageStatus === "validated" || data.suburbPageStatus === "partial") {
    // We have validated data
    const gapSuburbs = confirmedNoPage.length > 0 ? confirmedNoPage : unknownPageStatus;
    suburbGapList = gapSuburbs
      .map(s => `${s.suburb}: ${formatCurrency(s.revenue, data.currencySymbol)} revenue, ${s.jobs} jobs — ${s.hasPage === false ? "CONFIRMED no dedicated page" : "page status unverified"}`)
      .join("\n");
    if (confirmedHasPage.length > 0) {
      suburbGapList += `\n\nSuburbs WITH confirmed pages: ${confirmedHasPage.map(s => `${s.suburb} (${formatCurrency(s.revenue, data.currencySymbol)})`).join(", ")}`;
    }
    gapFraming = confirmedNoPage.length > 0
      ? `${confirmedNoPage.length} suburbs have been CONFIRMED to have no dedicated page despite generating significant revenue. ${confirmedHasPage.length} suburbs do have pages. Focus the gap analysis on the confirmed missing pages.`
      : `Page status is partially validated. ${unknownPageStatus.length} suburbs have unverified page status. Recommend a content audit to confirm gaps.`;
  } else {
    // Unknown status — be honest about it
    suburbGapList = unknownPageStatus
      .map(s => `${s.suburb}: ${formatCurrency(s.revenue, data.currencySymbol)} revenue, ${s.jobs} jobs — page status NOT YET AUDITED`)
      .join("\n");
    gapFraming = `IMPORTANT: Page existence has NOT been audited for this territory. We cannot confirm which suburbs have pages and which do not. Frame this section as a RECOMMENDED audit and opportunity assessment, not a confirmed gap. Do NOT claim pages don't exist — say they need to be verified.`;
  }

  const prompt = `You are writing the "Content Architecture Gap Analysis" section of a franchise digital marketing strategy document for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT (from earlier sections):
${priorContext}

PAGE VALIDATION STATUS: ${data.suburbPageStatus}
${gapFraming}

SUBURB DATA:
${suburbGapList}

TERRITORY TOTALS:
- Total revenue: ${formatCurrency(data.totalRevenue, data.currencySymbol)}
- Total jobs: ${formatNumber(data.totalJobs)}
- Top species: ${data.topSpeciesNames.join(", ")}

MEASURED SEARCH EVIDENCE:
- Search Console: ${data.gsc.monthly.length ? `${formatNumber(data.gsc.totalClicks)} clicks across ${data.gsc.monthly.length} months (${data.analyticsSource.gsc})` : "Unavailable — do not imply zero performance"}
- GA4 top pages: ${data.ga4.topPages.slice(0, 8).map(page => page.pagePath).join(", ") || "No persisted GA4 page import"}
- GA4 priority-page sessions: ${formatNumber(data.ga4.totalPriorityPageSessions)}
- GA4 import coverage: ${data.ga4.latestImport ? `${data.ga4.latestImport.propertiesSucceeded}/${data.ga4.latestImport.propertiesExpected} properties (${data.ga4.latestImport.status})` : "Unavailable"}

Write 3-4 paragraphs that:
1. ${data.suburbPageStatus === "unknown" ? "Acknowledge that a content audit is needed, then frame the opportunity based on revenue concentration in specific suburbs" : "State the confirmed structural gap: specific suburbs generating revenue have no dedicated pages"}
2. Quantify the opportunity — total revenue from suburbs without confirmed pages (or needing audit)
3. Explain WHY this matters for SEO: no local page = no organic ranking signal for high-intent searches like "[species] removal [suburb]"
4. ${data.suburbPageStatus === "unknown" ? "Recommend a page audit as the first action item, then position the content build as the primary growth opportunity" : "Position this as the primary structural gap and clearest opportunity for organic search growth"}

STYLE: Analytical, revenue-backed, persuasive. Each suburb mentioned must include its actual revenue figure. ${data.suburbPageStatus === "unknown" ? "Be honest that page status is unverified — do NOT claim pages don't exist without confirmation." : "The tone should make it obvious that NOT building these pages is leaving money on the table."}

Return ONLY paragraph text (no headings, no HTML, no markdown).`;

  const text = await callClaude(prompt, "claude-opus-5", 1500);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length > 0) return narrativeParagraphsHtml(text);
  console.warn(`AI section returned empty for ${data.name}`);
  const audited = data.suburbs.filter(suburb => suburb.hasPage !== null);
  const missing = audited.filter(suburb => suburb.hasPage === false);
  const missingRevenue = missing.reduce((sum, suburb) => sum + suburb.revenue, 0);
  return `<p class="narrative">${audited.length ? `${audited.length} revenue-producing suburbs have a documented page status. ${missing.length ? `${missing.length} confirmed gaps represent ${formatCurrency(missingRevenue, data.currencySymbol)} in closed revenue.` : "No dedicated suburb-hub gaps are confirmed in the audited set."}` : "Dedicated suburb-hub coverage has not been audited, so the first action is to verify the highest-revenue markets before describing a page gap."}</p><p class="narrative">Prioritize the audit in revenue order: ${escapeHtml(data.topSuburbNames.slice(0, 5).join(", "))}. A page recommendation becomes approved work only after the hub is verified and the scope is confirmed.</p>`;
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
- Confirmed current GBP posts/month: ${data.currentGbpPostVolume}
- Approved proposed GBP posts/month: ${data.proposedGbpPostsPerMonth || "Not provided"}
- Approved proposed blog posts/month: ${data.proposedBlogPostsPerMonth || "Not provided"}
- Approved suburb-page build: ${data.proposedSuburbPages || "Not provided"}
- Approved species × location build: ${data.proposedSpeciesLocationPages || "Not provided"}
- Campaign notes: ${data.campaignNotes || "None provided"}

Write 4-5 paragraphs describing the proposed full program across these four areas:
1. GBP Optimization & Post Program: Use only the approved proposed volume above; if none is provided, recommend confirming capacity instead of inventing a number
2. Website Content Architecture: Use the approved page counts above and prioritize them in revenue order
3. Blog Content Reorientation: Use only the approved blog volume above; distinguish a content recommendation from an agreed deliverable
4. Local SEO Foundation: Schema markup, NAP citation audit, internal linking, rank tracking

For each area, be specific about what changes and why, referencing the territory's actual suburbs and species.

STYLE: Strategic and specific. Reference actual suburb names and species. Written like a recommendation from someone who has spent weeks analyzing this territory's data. No generic marketing language.

Return ONLY paragraph text (no headings, no HTML, no markdown). Separate the 4 areas with double line breaks.`;

  const text = await callClaude(prompt, "claude-opus-5", 2500);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length > 0) return narrativeParagraphsHtml(text);
  console.warn(`AI section returned empty for ${data.name}`);
  return `<p class="narrative">The proposed program begins with measurement and a verified content audit. GBP and blog publishing remain at ${data.proposedGbpPostsPerMonth || "an unconfirmed"} and ${data.proposedBlogPostsPerMonth || "an unconfirmed"} posts per month respectively until capacity is approved.</p><p class="narrative">Phase 1 prioritizes up to ${data.proposedSuburbPages || "the approved number of"} dedicated suburb hubs in revenue order, beginning with ${escapeHtml(data.topSuburbNames.slice(0, 3).join(", "))}. Phase 2 adds up to ${data.proposedSpeciesLocationPages || "the approved number of"} species-by-location pages beneath verified hubs, weighted toward ${escapeHtml(data.topSpeciesNames.slice(0, 3).join(", "))}. Schema, citations, internal links, and rank tracking are audit recommendations—not claims about the current campaign.</p>`;
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
3. Mandatory phase order: Phase 1 builds Tier 1 suburb hub pages in revenue order; Phase 2 builds species×suburb pages beneath those approved hubs. Never reverse these phases
4. Species page priority weighting (Tier 1, Tier 2, Tier 3 based on revenue/job volume)
5. Blog reorientation strategy: from generic educational → conversion-oriented, suburb-specific, species×suburb×season combinations

STYLE: Detailed and prescriptive. This section should read like a content strategist's build plan — specific enough that a developer could start building pages from it. Reference actual suburb names and revenue figures.

Return ONLY paragraph text (no headings, no HTML, no markdown). Use double line breaks between subsections.`;

  const text = await callClaude(prompt, "claude-opus-5", 3000);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length > 0) return narrativeParagraphsHtml(text);
  console.warn(`AI section returned empty for ${data.name}`);
  return `<p class="narrative">Use the main ${escapeHtml(data.name)} location page as the territory hub. In Phase 1, verify and then build approved suburb hubs in revenue order, beginning with ${escapeHtml(data.topSuburbNames.slice(0, 4).join(", "))}. Each hub should answer local service intent and link back to the territory hub.</p><p class="narrative">Only after those hubs are approved should Phase 2 add species-by-suburb pages, led by ${escapeHtml(data.topSpeciesNames.slice(0, 3).join(", "))}. Conversion-oriented seasonal articles can support these permanent pages, but they do not replace them and do not prove that a hub exists.</p>`;
}

async function generateGbpStrategy(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const prompt = `You are writing the "Google Business Profile Strategy" section of a franchise digital marketing strategy for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT:
${priorContext}

GBP DATA:
- Total calls (available period): ${formatNumber(data.gbp.totalCalls)}
- Total website clicks: ${formatNumber(data.gbp.totalClicks)}
- Peak month: ${data.gbp.peakMonth} (${data.gbp.peakCalls} calls)
- Average monthly calls: ${data.gbp.avgMonthlyCalls === null ? "Unavailable" : Math.round(data.gbp.avgMonthlyCalls)}
- Average monthly clicks: ${data.gbp.avgMonthlyClicks === null ? "Unavailable" : Math.round(data.gbp.avgMonthlyClicks)}
- Months of data: ${data.gbp.monthly.length}
- ${gbpPromptCoverageContext(data)}
- Confirmed current publishing volume: ${data.currentGbpPostVolume}
- Approved proposed publishing volume: ${data.proposedGbpPostsPerMonth || "Not provided"}

TERRITORY CONTEXT:
- Top species: ${data.topSpeciesNames.join(", ")}
- Top suburbs: ${data.topSuburbNames.slice(0, 6).join(", ")}
- Seasonal timing: ${data.seasonalTiming}

Write a detailed GBP strategy section covering:
1. Current GBP performance baseline (use the actual numbers above)
2. A four-stream post framework sized to the approved proposed volume above. Do not invent a volume when it is not provided
3. Species focus by month calendar (which species to emphasize in which months based on the seasonal timing)
4. Suburb rotation schedule (rotate through top suburbs in posts to build local relevance)
5. GBP and website alignment: posts should link to corresponding suburb/species pages once built

STYLE: Tactical and specific. This should read like a monthly playbook a marketing coordinator could execute from. Reference actual species names, suburb names, and seasonal timing for this territory.

Return ONLY paragraph text (no headings, no HTML, no markdown). Use double line breaks between subsections.`;

  const text = await callClaude(prompt, "claude-opus-5", 3000);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  if (paragraphs.length > 0) return narrativeParagraphsHtml(text);
  console.warn(`AI section returned empty for ${data.name}`);
  return `<p class="narrative">The available ${gbpSourceLabel(data.analyticsSource.gbp)} records ${formatNumber(data.gbp.totalCalls)} calls and ${formatNumber(data.gbp.totalClicks)} website clicks.${data.gbp.incompletePeriods.length ? ` Incomplete live periods excluded from these values: ${data.gbp.incompletePeriods.join(", ")}.` : ""} The approved publishing target is ${data.proposedGbpPostsPerMonth ? `${data.proposedGbpPostsPerMonth} posts per month` : "not yet provided"}; no volume is inferred from engagement.</p><p class="narrative">Rotate posts through ${escapeHtml(data.topSuburbNames.slice(0, 4).join(", "))} and lead with ${escapeHtml(data.topSpeciesNames.slice(0, 3).join(", "))} according to ${escapeHtml(data.seasonalTiming)}. Link posts to verified destination pages and review calls and clicks monthly.</p>`;
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

Write a focused month-by-month 90-day plan. Each month must contain 3-5 total priorities, not a long backlog. Every priority must include an owner role, a concrete deliverable, and a measurable outcome.

MONTH 1 should focus on: measurement baseline, confirmed technical gaps, and Phase 1 Tier 1 suburb hub pages in revenue order

MONTH 2 should focus on: Phase 2 species×suburb pages beneath the approved Month 1 hubs, review velocity, and seasonal content aligned to the territory's wildlife calendar

MONTH 3 should focus on: optimization (review Month 1-2 data, build remaining suburb pages, species×location variants, identify best-performing content, prepare next quarter's strategy)

Tasks should reference actual suburb names and species from this territory, but must not claim a page is missing unless its status is confirmed.

STYLE: Actionable and specific. Each task should be concrete enough that someone could check it off a list. No vague "optimize content" — instead "Publish dedicated suburb page for ${data.topSuburbNames[0]} targeting [species] removal [suburb] keywords."

Return ONLY the text content. Format as:
Month 1 — Foundation
Priorities: [3-5 tasks separated by semicolons; each includes owner, deliverable, outcome]

Month 2 — Expansion
[same format]

Month 3 — Optimization
[same format]`;

  const text = await callClaude(prompt, "claude-opus-5", 4000);
  if (text.trim().length > 50) return text;
  console.warn(`AI section returned near-empty for ${data.name}`);
  return `Month 1 — Foundation\nPriorities: Analytics owner — verify GA4, Search Console, GBP, and Salesforce coverage — produce an approved baseline; Content lead — audit dedicated hubs for ${data.topSuburbNames.slice(0, 3).join(", ")} — document confirmed gaps; SEO lead — prepare the approved Phase 1 hub briefs — obtain scope sign-off\n\nMonth 2 — Expansion\nPriorities: Content lead — publish only approved Phase 1 suburb hubs — establish measurable local landing pages; GBP owner — run the approved monthly post schedule around ${data.topSpeciesNames.slice(0, 2).join(" and ")} — link every post to a verified destination; Analyst — review complete-month traffic and search evidence — record early movement\n\nMonth 3 — Optimization\nPriorities: Analyst — compare matched complete months — identify evidence-backed winners; Content lead — propose Phase 2 species-by-suburb pages beneath approved hubs — obtain approval before production; Strategy owner — document the next 90-day plan — align capacity, seasonality, and measurement`;
}

async function generateRisksAndMitigations(data: TerritoryDataObject, priorContext: string): Promise<string> {
  const prompt = `You are writing the "Delivery Dependencies and Mitigations" section of a franchise digital marketing strategy for Skedaddle Humane Wildlife Control — the "${data.name}" territory.

PRIOR CONTEXT:
${priorContext}

TERRITORY DATA:
- Total revenue: ${formatCurrency(data.totalRevenue, data.currencySymbol)}
- Top species: ${data.topSpeciesNames.join(", ")}
- Top suburbs: ${data.topSuburbNames.slice(0, 6).join(", ")}
- GBP calls: ${formatNumber(data.gbp.totalCalls)}
- ${gbpPromptCoverageContext(data)}

Identify 4-6 delivery dependencies and data gaps. Do not characterize revenue concentration as fragility and do not discuss territory close rate because territory proposal/appointment counts are unavailable. Focus on page-status verification, approved production capacity, tracking coverage, local-fact review, seasonal timing, and ownership.

For each risk, provide: the risk statement, its potential impact, and a specific mitigation action.

STYLE: Neutral, direct, and practical. Do not manufacture negative performance claims.

Return as plain text in this format (one per line):
RISK: [risk statement] | IMPACT: [impact] | MITIGATION: [mitigation action]`;

  const text = await callClaude(prompt, "claude-opus-5", 2000);
  if (text.trim().length > 50) return text;
  console.warn(`AI section returned near-empty for ${data.name}`);
  return `RISK: Dedicated suburb-hub coverage is not fully verified | IMPACT: Page recommendations may duplicate existing work | MITIGATION: Complete and document the URL audit before approving Phase 1\nRISK: Publishing capacity is not confirmed | IMPACT: Proposed volume may be undeliverable | MITIGATION: Approve monthly GBP and blog counts before scheduling\nRISK: Partial GA4 imports exist | IMPACT: Incomplete traffic may be mistaken for a decline | MITIGATION: Use only complete months in headline totals and disclose coverage\nRISK: Local facts require franchise review | IMPACT: Content may contain inaccurate service-area detail | MITIGATION: Require territory-owner review before publishing\nRISK: Seasonal timing can shift | IMPACT: Planned topics may miss local demand | MITIGATION: Recheck complete-month GBP and search evidence each month`;
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

  const text = await callClaude(prompt, "claude-opus-5", 1500);
  if (text.trim().length > 50) return text;
  console.warn(`AI section returned near-empty for ${data.name}`);
  return `1. Audit dedicated suburb hubs in revenue order, beginning with ${data.topSuburbNames.slice(0, 3).join(", ")}, before approving new pages.\n2. Establish the measurement baseline using only complete GA4 months and territory-filtered Search Console data.\n3. Keep the ${data.name} territory page as the central search and GBP destination.\n4. Weight approved content toward ${data.topSpeciesNames.slice(0, 2).join(" and ")}, the leading revenue species.\n5. Recheck seasonal demand monthly before changing the production calendar.\n6. Set GBP volume from approved capacity and rotate verified suburb and species themes.\n7. Build approved permanent suburb hubs before species-by-suburb pages or supporting articles.\n8. Use closed revenue, jobs, inspections, close rate, and matched-month digital evidence to set the next priorities.`;
}

// ─── Deterministic Template Sections ─────────────────────────────────────────

function buildCurrentCampaignHtml(data: TerritoryDataObject): string {
  // Determine suburb page status text based on validated data
  const confirmedPages = data.suburbs.filter(s => s.hasPage === true);
  const confirmedNoPages = data.suburbs.filter(s => s.hasPage === false);

  let suburbPageText: string;
  let suburbPageVolume: string;
  if (data.suburbPageStatus === "validated" || data.suburbPageStatus === "partial") {
    suburbPageText = confirmedPages.length > 0
      ? `${confirmedPages.length} confirmed (${confirmedPages.map(s => s.suburb).join(", ")})`
      : "None confirmed";
    suburbPageVolume = `${confirmedPages.length} existing${confirmedNoPages.length > 0 ? `, ${confirmedNoPages.length} confirmed missing` : ""}`;
  } else {
    suburbPageText = "Not yet audited";
    suburbPageVolume = "Unknown \u2014 audit required";
  }

  // Sub-market context
  const subMarketNote = data.subMarkets.length > 1
    ? `<p class="narrative"><strong>Configured territory mapping:</strong> ${data.subMarkets.length} GA4 sub-markets are mapped: ${data.subMarkets.map(escapeHtml).join(", ")}. ${data.gbpSubListings.length > 1 ? `Configured GBP mappings: ${data.gbpSubListings.map(escapeHtml).join(", ")}.` : `One GBP mapping is configured.`} This is configuration evidence, not a live listing audit.</p>`
    : "";

  return `
    ${subMarketNote}
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
          <td>${data.gbpSubListings.length} configured mapping${data.gbpSubListings.length === 1 ? "" : "s"}; live status not audited</td>
          <td>Format not audited</td>
          <td>${data.currentGbpPostVolume}</td>
        </tr>
        <tr>
          <td>Blog</td>
          <td>Campaign input</td>
          <td>Confirm format and purpose</td>
          <td>${data.currentBlogPostVolume}</td>
        </tr>
        <tr>
          <td>Static Pages</td>
          <td>Not audited</td>
          <td>Species/service coverage to verify</td>
          <td>Unknown</td>
        </tr>
        <tr>
          <td>Suburb/City Pages</td>
          <td>${suburbPageText}</td>
          <td>${confirmedPages.length > 0 ? "Location-specific service pages" : "\u2014"}</td>
          <td>${suburbPageVolume}</td>
        </tr>
        <tr>
          <td>Schema Markup</td>
          <td>Not yet audited</td>
          <td>Confirm current implementation</td>
          <td>Unknown</td>
        </tr>
        <tr>
          <td>Citation/NAP</td>
          <td>Unknown / unaudited</td>
          <td>\u2014</td>
          <td>Audit required</td>
        </tr>
      </tbody>
    </table>
    <p class="narrative">The confirmed campaign inputs are ${data.currentGbpPostVolume} for GBP and ${data.currentBlogPostVolume} for blog content. During ${data.reportingPeriod.label}, average GBP calls were ${formatNumber(data.gbp.avgMonthlyCalls === null ? null : Math.round(data.gbp.avgMonthlyCalls))} and average website clicks were ${formatNumber(data.gbp.avgMonthlyClicks === null ? null : Math.round(data.gbp.avgMonthlyClicks))} per month; engagement is not used to infer publishing volume. ${confirmedNoPages.length > 0 ? `${confirmedNoPages.length} suburbs generating significant revenue (${confirmedNoPages.map(s => s.suburb).join(", ")}) are confirmed without dedicated pages.` : data.suburbPageStatus === "unknown" ? "Suburb page coverage has not been audited; page recommendations remain provisional until the audit is complete." : "Existing suburb pages provide a foundation, with remaining confirmed gaps shown above."} ${data.campaignNotes ? `Campaign notes: ${escapeHtml(data.campaignNotes)}` : ""}</p>`;
}

function buildSpeciesTableHtml(data: TerritoryDataObject): string {
  const rows = data.species.slice(0, 12).map(s => {
    return `
        <tr>
          <td>${s.species}</td>
          <td class="num">${formatNumber(s.total_jobs)}</td>
          <td class="num">${formatCurrency(s.total_revenue, data.currencySymbol)}</td>
          <td class="num">${formatPct(s.pctRevenue)}</td>
          <td class="num">${formatCurrency(s.avgJobValue, data.currencySymbol)}</td>
        </tr>`;
  }).join("");

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
  const rows = data.suburbs.slice(0, 20).map(s => {
    let pageStatusHtml: string;
    if (s.hasPage === true) {
      pageStatusHtml = `<td class="highlight">Yes</td>`;
    } else if (s.hasPage === false) {
      pageStatusHtml = `<td class="status-none">No</td>`;
    } else {
      pageStatusHtml = `<td style="color:#999;font-style:italic">Unknown</td>`;
    }
    return `
        <tr>
          <td>${s.suburb}</td>
          <td class="num">${formatCurrency(s.revenue, data.currencySymbol)}</td>
          <td class="num">${formatNumber(s.jobs)}</td>
          <td class="num">${formatCurrency(s.avgJobValue, data.currencySymbol)}</td>
          <td class="num">${formatPct(s.pctRevenue)}</td>
          ${pageStatusHtml}
        </tr>`;
  }).join("");

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
          <td class="num">${m.calls !== null && m.website_clicks !== null ? formatNumber(m.calls + m.website_clicks) : "Not available"}</td>
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
          <td class="num"><strong>${data.gbp.totalCalls !== null && data.gbp.totalClicks !== null ? formatNumber(data.gbp.totalCalls + data.gbp.totalClicks) : "Not available"}</strong></td>
        </tr>
      </tbody>
    </table>
    <p class="narrative">${data.gbp.peakCalls === null ? "A peak call month is not available." : `Peak call month: <strong>${data.gbp.peakMonth}</strong> with ${formatNumber(data.gbp.peakCalls)} calls.`} Average monthly combined activity (calls + website clicks): ${data.gbp.avgMonthlyCalls !== null && data.gbp.avgMonthlyClicks !== null ? formatNumber(Math.round(data.gbp.avgMonthlyCalls + data.gbp.avgMonthlyClicks)) : "Not available"}.${data.gbp.incompletePeriods.length ? ` Incomplete live periods excluded from headline totals: ${data.gbp.incompletePeriods.join(", ")}.` : ""}</p>`;
}

function buildOrganicAnalyticsHtml(data: TerritoryDataObject): string {
  const ga4Period = data.ga4.monthly.length > 0
    ? `${data.ga4.monthly[0].year}-${String(data.ga4.monthly[0].month).padStart(2, "0")} to ${data.ga4.monthly.at(-1)!.year}-${String(data.ga4.monthly.at(-1)!.month).padStart(2, "0")}`
    : "not imported";
  const gscPeriod = data.gsc.monthly.length > 0
    ? `${data.gsc.monthly[0].month} to ${data.gsc.monthly.at(-1)!.month}`
    : "not available";
  const ga4Coverage = data.ga4.latestImport
    ? `${data.ga4.completeMonths}/${data.ga4.monthly.length} imported months complete · latest successful import ${data.ga4.latestImport.propertiesSucceeded}/${data.ga4.latestImport.propertiesExpected} mapped properties`
    : "No persisted GA4 import";
  const topPageRows = data.ga4.topPages.slice(0, 25).map(page => `
      <tr>
        <td>${escapeHtml(page.pagePath)}</td>
        <td>${escapeHtml(page.pageType.replaceAll("_", " "))}</td>
        <td class="num">${formatNumber(page.sessions)}</td>
      </tr>`).join("");
  const gscPageRows = data.gsc.topPages.slice(0, 25).map(page => `<tr><td>${escapeHtml(page.pageUrl)}</td><td class="num">${formatNumber(page.clicks)}</td><td class="num">${formatNumber(page.impressions)}</td></tr>`).join("");
  const gscQueryRows = data.gsc.topQueries.slice(0, 25).map(row => `<tr><td>${escapeHtml(row.query)}</td><td class="num">${formatNumber(row.clicks)}</td><td class="num">${formatNumber(row.impressions)}</td></tr>`).join("");
  const change = (current: number, previous: number) => previous > 0 ? `${((current - previous) / previous * 100).toFixed(1)}%` : "Unavailable";
  const yoyRows = data.yoy && (data.yoy.ga4 || data.yoy.gsc)
    ? `${data.yoy.ga4 ? `<tr><td>GA4 sessions</td><td class="num">${formatNumber(data.yoy.ga4.current)}</td><td class="num">${formatNumber(data.yoy.ga4.previous)}</td><td class="num">${change(data.yoy.ga4.current, data.yoy.ga4.previous)}</td></tr>` : ""}${data.yoy.gsc ? `<tr><td>Search Console clicks</td><td class="num">${formatNumber(data.yoy.gsc.current)}</td><td class="num">${formatNumber(data.yoy.gsc.previous)}</td><td class="num">${change(data.yoy.gsc.current, data.yoy.gsc.previous)}</td></tr>` : ""}`
    : "";
  const gscRows = data.gsc.monthly.length > 0
    ? `<tr><td>Organic clicks</td><td class="num">${formatNumber(data.gsc.totalClicks)}</td><td>${escapeHtml(data.analyticsSource.gsc.replaceAll("_", " "))} · ${gscPeriod}</td></tr>
        <tr><td>Search impressions</td><td class="num">${formatNumber(data.gsc.totalImpressions)}</td><td>${escapeHtml(data.analyticsSource.gsc.replaceAll("_", " "))} · ${gscPeriod}</td></tr>`
    : `<tr><td>Search Console</td><td class="num">Unavailable</td><td>No persisted import or historical snapshot</td></tr>`;
  const ga4Rows = data.ga4.monthly.length > 0
    ? `<tr><td>GA4 sessions</td><td class="num">${formatNumber(data.ga4.totalSessions)}</td><td>${ga4Period} · ${ga4Coverage}</td></tr>
        <tr><td>Species + location-page sessions</td><td class="num">${formatNumber(data.ga4.totalPriorityPageSessions)}</td><td>${ga4Period} · ${ga4Coverage}</td></tr>`
    : `<tr><td>Google Analytics 4</td><td class="num">Unavailable</td><td>No persisted GA4 import</td></tr>`;
  return `
    <h3>Organic Search and On-Site Performance</h3>
    <table class="data-table">
      <thead><tr><th>Metric</th><th>Value</th><th>Source / Coverage</th></tr></thead>
      <tbody>
        ${gscRows}
        ${ga4Rows}
      </tbody>
    </table>
    <h3>Inspection-to-Sale Performance</h3>
    ${data.closeRate ? `<table class="data-table"><thead><tr><th>Inspections</th><th>Closed Jobs</th><th>Territory Close Rate</th><th>Network Close Rate</th><th>Period / Source</th></tr></thead><tbody><tr><td class="num">${formatNumber(data.closeRate.inspections)}</td><td class="num">${formatNumber(data.closeRate.closedJobs)}</td><td class="num">${data.closeRate.closeRate === null ? "Unavailable" : formatPct(data.closeRate.closeRate)}</td><td class="num">${data.closeRate.networkCloseRate === null ? "Unavailable" : formatPct(data.closeRate.networkCloseRate)}</td><td>${escapeHtml(data.closeRate.periodStart)} to ${escapeHtml(data.closeRate.periodEnd)} · ${escapeHtml(data.closeRate.sourceLabel)}</td></tr></tbody></table>` : `<p class="narrative">Territory inspection and close-rate data is unavailable for this report.</p>`}
    <h3>Matched-Month Year-over-Year</h3>
    ${yoyRows ? `<p class="narrative">Comparison uses only complete months present in both years: ${data.yoy!.months.map(month => new Date(2026, month - 1, 1).toLocaleDateString("en-US", { month: "short" })).join(", ")}.</p><table class="data-table"><thead><tr><th>Metric</th><th>Current</th><th>Prior Year</th><th>YoY Change</th></tr></thead><tbody>${yoyRows}</tbody></table>` : `<p class="narrative">Matched-month YoY is unavailable because no comparable complete current/prior-year months were imported.</p>`}
    ${topPageRows ? `<h3>Top 25 Imported GA4 Pages (Complete Months Only)</h3><table class="data-table"><thead><tr><th>Page</th><th>Type</th><th>Sessions</th></tr></thead><tbody>${topPageRows}</tbody></table>` : `<p class="narrative">No complete-month GA4 page import is available. GA4 page claims are intentionally omitted.</p>`}
    ${gscPageRows ? `<h3>Top 25 Search Console Pages</h3><table class="data-table"><thead><tr><th>Page</th><th>Clicks</th><th>Impressions</th></tr></thead><tbody>${gscPageRows}</tbody></table>` : ""}
    ${gscQueryRows ? `<h3>Top 25 Search Terms</h3><table class="data-table"><thead><tr><th>Query</th><th>Clicks</th><th>Impressions</th></tr></thead><tbody>${gscQueryRows}</tbody></table>` : ""}
    ${data.ga4.partialMonths > 0 ? `<p class="narrative"><strong>Coverage warning:</strong> ${data.ga4.partialMonths} GA4 month${data.ga4.partialMonths === 1 ? " is" : "s are"} partial and excluded from headline totals, rankings, YoY, and AI context. ${data.ga4.monthly.filter(row => !row.complete).map(row => `${reportingMonthIso(row)} (${row.propertiesSucceeded}/${row.propertiesExpected} properties)`).join(", ")}.</p>` : ""}`;
}

function buildScaleComparisonHtml(data: TerritoryDataObject): string {
  const existingPages = data.suburbs.filter(s => s.hasPage === true).length;
  const currentSuburbText = data.suburbPageStatus === "unknown"
    ? "Unknown (audit needed)"
    : `${existingPages} confirmed`;

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
          <td>${data.currentGbpPostVolume}</td>
          <td>${data.proposedGbpPostsPerMonth || "Not provided"}</td>
          <td class="highlight">${data.proposedGbpPostsPerMonth ? "Approved input" : "Confirm capacity"}</td>
        </tr>
        <tr>
          <td>Blog Posts / Month</td>
          <td>${data.currentBlogPostVolume}</td>
          <td>${data.proposedBlogPostsPerMonth || "Not provided"}</td>
          <td>${data.proposedBlogPostsPerMonth ? "Approved input" : "Confirm scope"}</td>
        </tr>
        <tr>
          <td>Suburb/City Pages</td>
          <td>${currentSuburbText}</td>
          <td>${data.proposedSuburbPages || "Not provided"}</td>
          <td class="highlight">${data.proposedSuburbPages ? "Approved build count" : "Audit, then confirm scope"}</td>
        </tr>
        <tr>
          <td>Species × Location Pages</td>
          <td>Unknown</td>
          <td>${data.proposedSpeciesLocationPages || "Not provided"}</td>
          <td class="highlight">${data.proposedSpeciesLocationPages ? "Approved build count" : "Confirm scope"}</td>
        </tr>
        <tr>
          <td>Schema Markup</td>
          <td>Not audited</td>
          <td>Audit, then approve applicable schema</td>
          <td>Scope not confirmed</td>
        </tr>
        <tr>
          <td>Citation/NAP Audit</td>
          <td>Not audited</td>
          <td>Audit and correction if approved</td>
          <td>Scope not confirmed</td>
        </tr>
        <tr>
          <td>Rank Tracking</td>
          <td>Not audited</td>
          <td>Confirm cadence and ownership</td>
          <td>Scope not confirmed</td>
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
      background: #69BE28;
    }

    .cover-logo {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28pt;
      color: #69BE28;
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
      background: #69BE28;
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
      color: #69BE28;
      font-weight: 700;
    }

    .page-header-territory {
      font-size: 8.5pt;
      color: #666;
    }

    .section {
      margin-bottom: 28px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    h2 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 14pt;
      color: #69BE28;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 2px solid #69BE28;
      page-break-after: avoid;
      break-after: avoid;
    }

    .section-num {
      font-family: 'Inter', sans-serif;
      font-size: 10pt;
      font-weight: 700;
      color: #69BE28;
      margin-right: 8px;
      opacity: 0.7;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #2d2d2d;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid;
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
      page-break-inside: auto;
    }

    .data-table th {
      background: #69BE28;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .data-table thead {
      display: table-header-group;
    }

    .data-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
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
      border-top: 2px solid #69BE28;
    }

    .data-table .highlight {
      color: #69BE28;
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
      border-left: 4px solid #69BE28;
      border-radius: 4px;
      padding: 14px 18px;
      margin: 16px 0;
      font-size: 9.5pt;
      color: #2d5a3f;
    }

    .callout-box strong {
      color: #69BE28;
    }

    .action-plan-month {
      margin-bottom: 24px;
    }

    .action-plan-month h3 {
      color: #69BE28;
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
      color: #69BE28;
      content: "▪ ";
    }

    .risk-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9pt;
    }

    .risk-table th {
      background: #69BE28;
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
      background: #69BE28;
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
  <div class="cover-title">Initial Franchise Sales<br>& Digital Marketing Strategy</div>
  <div class="cover-subtitle">${data.name} Territory — ${data.city}, ${data.state}</div>
  <div class="cover-meta">
    <strong>Prepared by:</strong> Unwired Web Solutions<br>
    <strong>Generated:</strong> ${dateStr}<br>
    <strong>Reporting period:</strong> ${data.reportingPeriod.start} through ${data.reportingPeriod.end}<br>
    <strong>Territory Revenue:</strong> ${formatCurrency(data.totalRevenue, data.currencySymbol)}<br>
    <strong>Closed Jobs:</strong> ${formatNumber(data.totalJobs)}<br>
    <strong>Data Sources:</strong> Salesforce CRM, ${gbpSourceLabel(data.analyticsSource.gbp)}${data.gsc.monthly.length > 0 ? data.analyticsSource.gsc === "persisted_search_console" ? ", persisted Google Search Console import" : ", historical Google Search Console snapshot" : ""}${data.ga4.monthly.length > 0 ? ", persisted Google Analytics 4 Data API import" : ""}
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
            html += `<li>${escapeHtml(task.replace(/^[-•▪]\s*/, ""))}</li>`;
          });
          html += `</ul></div>`;
        }
      }
    } else {
      // Fallback: just list all tasks
      const tasks = monthContent.split(/[;\n]/).map(t => t.trim()).filter(t => t && t.length > 10);
      html += `<div class="action-category"><ul>`;
      tasks.slice(0, 12).forEach(task => {
        html += `<li>${escapeHtml(task.replace(/^[-•▪]\s*/, "").replace(/^—\s*/, ""))}</li>`;
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
          html += `<tr><td>${escapeHtml(parts[0])}</td><td>${escapeHtml(parts[1])}</td><td>${escapeHtml(parts[2])}</td></tr>`;
        } else {
          html += `<tr><td colspan="3">${escapeHtml(risk.trim())}</td></tr>`;
        }
      });
      html += `</tbody></table>`;
      return html;
    }
    return `<p class="narrative">${escapeHtml(rawText).replaceAll("\n", "<br>")}</p>`;
  }

  let html = `<table class="risk-table"><thead><tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr></thead><tbody>`;
  lines.forEach(line => {
    const riskMatch = line.match(/RISK:\s*(.+?)\s*\|\s*IMPACT:\s*(.+?)\s*\|\s*MITIGATION:\s*(.+)/i);
    if (riskMatch) {
      html += `<tr><td>${escapeHtml(riskMatch[1])}</td><td>${escapeHtml(riskMatch[2])}</td><td>${escapeHtml(riskMatch[3])}</td></tr>`;
    }
  });
  html += `</tbody></table>`;
  return html;
}

// ─── Recommendations formatter ───────────────────────────────────────────────

function formatRecommendationsHtml(rawText: string): string {
  const items = rawText.split(/\d+\.\s+/).filter(i => i.trim());
  if (items.length === 0) return `<p class="narrative">${escapeHtml(rawText).replaceAll("\n", "<br>")}</p>`;

  let html = `<ol class="recommendations-list">`;
  items.slice(0, 8).forEach(item => {
    html += `<li>${escapeHtml(item.trim())}</li>`;
  });
  html += `</ol>`;
  return html;
}

// ─── Main Generation Orchestrator ────────────────────────────────────────────

export async function generateStrategyReport(
  territoryId: string,
  config: StrategyConfig = DEFAULT_STRATEGY_CONFIG,
  onProgress?: (section: string, pct: number) => void
): Promise<{ html: string; pdfUrl?: string; sections: SectionResult[]; data: TerritoryDataObject }> {
  onProgress?.("Building territory data...", 5);
  const data = await buildTerritoryData(territoryId, config);

  onProgress?.("Building Current Campaign section...", 18);
  const currentCampaignHtml = buildCurrentCampaignHtml(data);

  onProgress?.("Building Species Revenue Analysis...", 25);
  const speciesTableHtml = buildSpeciesTableHtml(data);
  const topSpecies = data.species[0];
  const secondSpecies = data.species[1];
  const speciesNarrative = `<p class="narrative">${topSpecies?.species || "Primary species"} leads with ${formatCurrency(topSpecies?.total_revenue || 0, data.currencySymbol)} in closed revenue (${formatPct(topSpecies?.pctRevenue || 0)} of total), followed by ${secondSpecies?.species || "secondary species"} at ${formatCurrency(secondSpecies?.total_revenue || 0, data.currencySymbol)}. The top ${Math.min(data.species.length, 3)} species account for ${formatPct(data.species.slice(0, 3).reduce((sum, s) => sum + s.pctRevenue, 0))} of closed revenue, so content prioritization should follow this territory demand mix. Average job value is shown descriptively in ${data.currency}; it is not used as a close-rate proxy or compared across currencies.</p>`;

  onProgress?.("Building Suburb Revenue Analysis...", 32);
  const suburbTableHtml = buildSuburbTableHtml(data);
  const confirmedNoPage = data.suburbs.filter(s => s.hasPage === false);
  const confirmedHasPage = data.suburbs.filter(s => s.hasPage === true);
  let suburbNarrativeText: string;
  if (data.suburbPageStatus === "validated" || data.suburbPageStatus === "partial") {
    if (confirmedNoPage.length > 0) {
      suburbNarrativeText = `${data.suburbs[0]?.suburb || "Primary market"} leads with ${formatCurrency(data.suburbs[0]?.revenue || 0, data.currencySymbol)} in closed revenue across ${data.suburbs[0]?.jobs || 0} jobs. The top 5 suburbs account for ${formatPct(data.suburbs.slice(0, 5).reduce((sum, s) => sum + s.pctRevenue, 0))} of total territory revenue. ${confirmedHasPage.length} suburbs have confirmed dedicated pages (${confirmedHasPage.map(s => s.suburb).join(", ")}), while ${confirmedNoPage.length} revenue-generating suburbs (${confirmedNoPage.map(s => s.suburb).join(", ")}) have no dedicated page — representing a clear content gap.`;
    } else {
      suburbNarrativeText = `${data.suburbs[0]?.suburb || "Primary market"} leads with ${formatCurrency(data.suburbs[0]?.revenue || 0, data.currencySymbol)} in closed revenue across ${data.suburbs[0]?.jobs || 0} jobs. The top 5 suburbs account for ${formatPct(data.suburbs.slice(0, 5).reduce((sum, s) => sum + s.pctRevenue, 0))} of total territory revenue. All audited suburbs have confirmed dedicated pages — the focus should shift to content quality and optimization.`;
    }
  } else {
    suburbNarrativeText = `${data.suburbs[0]?.suburb || "Primary market"} leads with ${formatCurrency(data.suburbs[0]?.revenue || 0, data.currencySymbol)} in closed revenue across ${data.suburbs[0]?.jobs || 0} jobs. The top 5 suburbs account for ${formatPct(data.suburbs.slice(0, 5).reduce((sum, s) => sum + s.pctRevenue, 0))} of total territory revenue. Page coverage for these suburbs has not yet been audited — a content audit is recommended to identify which revenue-generating suburbs lack dedicated pages.`;
  }
  const suburbNarrative = `<p class="narrative">${suburbNarrativeText}</p>`;
  const pageGapContext = data.suburbPageStatus === "unknown"
    ? `Page status unknown for most suburbs (audit needed).`
    : `${confirmedNoPage.length} suburbs confirmed without pages (${confirmedNoPage.map(s => s.suburb).join(", ")}). ${confirmedHasPage.length} have confirmed pages.`;

  onProgress?.("Building GBP Performance section...", 38);
  const performanceHtml = buildGbpDataHtml(data) + buildOrganicAnalyticsHtml(data);
  const scaleHtml = buildScaleComparisonHtml(data);
  const priorContext = [
    `Executive Summary facts: ${data.name} territory, ${formatCurrency(data.totalRevenue, data.currencySymbol)} revenue, ${formatNumber(data.totalJobs)} jobs.`,
    `Top species: ${data.species.slice(0, 3).map(s => `${s.species} (${formatPct(s.pctRevenue)})`).join(", ")}.`,
    `Top suburbs: ${data.suburbs.slice(0, 5).map(s => `${s.suburb} (${formatCurrency(s.revenue, data.currencySymbol)})`).join(", ")}. ${pageGapContext}`,
    `GBP available values: ${formatNumber(data.gbp.totalCalls)} calls, ${formatNumber(data.gbp.totalClicks)} clicks across ${data.gbp.monthly.length} represented months. ${gbpPromptCoverageContext(data)}`,
  ].join(" ");

  onProgress?.("Writing narrative sections...", 45);
  const [
    execSummaryHtml,
    gapHtml,
    proposedHtml,
    contentArchHtml,
    gbpStrategyHtml,
    ninetyDayRaw,
    risksRaw,
    recsRaw,
  ] = await runReportNarrativeTasks([
    () => generateExecutiveSummary(data),
    () => generateGapAnalysis(data, priorContext),
    () => generateProposedProgram(data, priorContext),
    () => generateContentArchitecture(data, priorContext),
    () => generateGbpStrategy(data, priorContext),
    () => generateNinetyDayPlan(data, priorContext),
    () => generateRisksAndMitigations(data, priorContext),
    () => generateRecommendations(data, priorContext),
  ]);

  const sections: SectionResult[] = [
    { id: "executive_summary", title: "Executive Summary", html: execSummaryHtml, isAiGenerated: true },
    { id: "current_campaign", title: "What's Running Now — Current Campaign", html: currentCampaignHtml, isAiGenerated: false },
    { id: "species_analysis", title: "Sales & Species Analysis — Revenue by Species", html: speciesTableHtml + speciesNarrative, isAiGenerated: false },
    { id: "suburb_revenue", title: "Revenue by City — Top Markets", html: suburbTableHtml + suburbNarrative, isAiGenerated: false },
    { id: "data_foundation", title: "Digital Performance — GBP, Search Console & GA4", html: performanceHtml, isAiGenerated: false },
    { id: "gap_analysis", title: "Content Architecture Gap — The Opportunity", html: gapHtml, isAiGenerated: true },
    { id: "proposed_program", title: "Proposed Program — Full Build", html: proposedHtml, isAiGenerated: true },
    { id: "scale_comparison", title: "Scale Comparison — Current vs. Proposed", html: scaleHtml, isAiGenerated: false },
    { id: "content_architecture", title: "Website Content Architecture", html: contentArchHtml, isAiGenerated: true },
    { id: "gbp_strategy", title: "Google Business Profile Strategy", html: gbpStrategyHtml, isAiGenerated: true },
    { id: "ninety_day_plan", title: "90-Day Action Plan", html: formatNinetyDayPlanHtml(ninetyDayRaw), isAiGenerated: true },
    { id: "risks", title: "Delivery Dependencies and Mitigations", html: formatRisksHtml(risksRaw), isAiGenerated: true },
    { id: "recommendations", title: "Summary of Recommendations", html: formatRecommendationsHtml(recsRaw), isAiGenerated: true },
  ];

  onProgress?.("Assembling document...", 97);
  const fullHtml = buildFullReportHtml(data, sections);

  onProgress?.("Complete", 100);
  return { html: fullHtml, sections, data };
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

export async function runStrategyPdfRenderAttempt<T>(render: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await render();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const detachedExecutionContext =
        message.includes("Execution context is not available in detached frame") &&
        message.includes('"about:blank"');
      if (!detachedExecutionContext || attempt === 1) throw error;
    }
  }
  throw new Error("Strategy PDF rendering exhausted its retry budget.");
}

async function generatePdf(html: string): Promise<Buffer> {
  return runStrategyPdfRenderAttempt(async () => {
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
  });
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
  preview: publicProcedure
    .input(z.object({ territoryId: z.string(), config: strategyConfigSchema }))
    .mutation(async ({ input }) => {
      const result = await generateStrategyReport(input.territoryId, input.config);
      const dataSnapshot = result.data;
      const draftId = await createReportDraft({
        reportType: "strategy",
        territoryId: input.territoryId,
        reportStart: dataSnapshot.reportingPeriod.start,
        reportEnd: dataSnapshot.reportingPeriod.end,
        config: input.config,
        dataSnapshot,
        sections: result.sections,
        html: result.html,
      });
      return { draftId, html: result.html, sectionCount: result.sections.length };
    }),

  // Backward-compatible PDF action; it only accepts an existing saved draft.
  generate: publicProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { DASHBOARD_DATA } = await import("../client/src/data/dashboardData");
      const draft = await getReportDraft(input.draftId, "strategy");
      const dashData = DASHBOARD_DATA[draft.territoryId];
      if (!dashData) throw new Error(`No data for territory: ${draft.territoryId}`);
      const pdfBuffer = await generatePdf(draft.html);
      const filename = `strategy-reports/${draft.territoryId}_strategy_report_${Date.now()}.pdf`;
      const { url } = await storagePut(filename, pdfBuffer, "application/pdf");
      await markReportDraftExported(draft.id, url);
      const sections = Array.isArray(draft.sectionsJson) ? draft.sectionsJson : [];

      return {
        url,
        draftId: draft.id,
        html: draft.html,
        territoryName: dashData.name,
        sectionCount: sections.length,
        generatedAt: new Date().toISOString(),
      };
    }),

  // Render the exact reviewed HTML instead of re-running every AI section.
  exportPdf: publicProcedure
    .input(z.object({ draftId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const draft = await getReportDraft(input.draftId, "strategy");
      const pdfBuffer = await generatePdf(draft.html);
      const filename = `strategy-reports/${draft.territoryId}_strategy_report_${Date.now()}.pdf`;
      const { url } = await storagePut(filename, pdfBuffer, "application/pdf");
      await markReportDraftExported(draft.id, url);
      return { url, generatedAt: new Date().toISOString() };
    }),
});
