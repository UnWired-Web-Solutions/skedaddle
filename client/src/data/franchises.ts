// Skedaddle Franchise Portal — Location Data
// Last updated: July 28, 2026 — rebuilt from verified Salesforce exports (Kira Dowd, Jul 24).
// Revenue data: Jul 2025 - Jun 2026 trailing 12 months. NO fabricated data.
import { DASHBOARD_DATA, type LocationDashboard } from "./dashboardData";

export interface FranchiseLocation {
  id: string;
  name: string;
  city: string;
  state: string;
  country: "US" | "CA";
  region: string;
  driveUrl: string;
  reportPdfUrl?: string;
  triggerPdfUrl?: string;
  triggerReportUrl?: string;
  fullReportUrl?: string;
  combinedReportUrl?: string;
  status: "active" | "pending" | "coming_soon";
  lastUpdated: string;
  kpis: {
    totalRevenue: number;
    totalJobs: number;
    avgJobValue?: number;
    topSpecies: string;
    gbpRating: number | null;
    sessionsTrend: "up" | "down" | "flat";
    /** Human-readable source used for the overview activity trend. */
    activityMetric?: "Organic clicks" | "GBP interactions";
    /** Percent change for the displayed comparison, when enough data exists. */
    activityChangePercent?: number | null;
    /** Explicit period used for the displayed comparison. */
    activityComparison?: string;
    networkRank: number | null;
    networkTotal: number;
  };
  tags: string[];
}

const LOCATION_METADATA: FranchiseLocation[] = [
  { id: "hamilton", name: "Skedaddle Hamilton", city: "Hamilton", state: "ON", country: "CA", region: "Ontario", driveUrl: "", fullReportUrl: "/manus-storage/hamilton_strategy_dashboard_a818c861.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 4205749.92, totalJobs: 2000, avgJobValue: 2103, topSpecies: "Raccoons", gbpRating: null, sessionsTrend: "up", networkRank: 1, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "durham", name: "Skedaddle Durham", city: "Whitby", state: "ON", country: "CA", region: "Ontario", driveUrl: "", fullReportUrl: "/manus-storage/durham_strategy_dashboard_0d2eb5b0.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 4083486.61, totalJobs: 1463, avgJobValue: 2791, topSpecies: "Mice", gbpRating: null, sessionsTrend: "flat", networkRank: 2, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "ottawa", name: "Skedaddle Ottawa", city: "Ottawa", state: "ON", country: "CA", region: "Ontario", driveUrl: "", fullReportUrl: "/manus-storage/ottawa_strategy_dashboard_aad8be27.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 2999469.45, totalJobs: 1399, avgJobValue: 2144, topSpecies: "Mice", gbpRating: null, sessionsTrend: "flat", networkRank: 3, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "minneapolis", name: "Skedaddle Minneapolis", city: "Minneapolis", state: "MN", country: "US", region: "Midwest", driveUrl: "", fullReportUrl: "/manus-storage/minneapolis_strategy_dashboard_fd2c96bd.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 1946510.66, totalJobs: 802, avgJobValue: 2427, topSpecies: "Mice", gbpRating: null, sessionsTrend: "up", networkRank: 4, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "montreal", name: "Skedaddle Montreal", city: "Montreal", state: "QC", country: "CA", region: "Quebec", driveUrl: "", fullReportUrl: "/manus-storage/montreal_strategy_dashboard_a86acfb8.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 1223667.46, totalJobs: 740, avgJobValue: 1654, topSpecies: "Mice", gbpRating: null, sessionsTrend: "flat", networkRank: 5, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "london", name: "Skedaddle London", city: "London", state: "ON", country: "CA", region: "Ontario", driveUrl: "", fullReportUrl: "/manus-storage/london_strategy_dashboard_d75fd7df.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 1053476.8, totalJobs: 380, avgJobValue: 2772, topSpecies: "Mice", gbpRating: null, sessionsTrend: "flat", networkRank: 6, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "madison", name: "Skedaddle Madison", city: "Madison", state: "WI", country: "US", region: "Midwest", driveUrl: "https://drive.google.com/file/d/1vr_dMB5c5YRCbKVAVk2vB9EsHJxEVbSN/view", reportPdfUrl: "https://drive.google.com/file/d/1m4QQ-9hQfqtI2xqGG31gPngz2oJxTE0m/view", triggerReportUrl: "/manus-storage/madison_trigger_202607_7c93d33a.html", fullReportUrl: "/manus-storage/madison_strategy_dashboard_23918390.html", combinedReportUrl: "/manus-storage/wisconsin_combined_dashboard_2ccfa5ef.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 975778.15, totalJobs: 333, avgJobValue: 2930, topSpecies: "Mice", gbpRating: null, sessionsTrend: "up", networkRank: 7, networkTotal: 19 }, tags: ["dashboard-ready", "full-data", "trigger-report"] },
  { id: "milwaukee", name: "Skedaddle Milwaukee", city: "Milwaukee", state: "WI", country: "US", region: "Midwest", driveUrl: "https://drive.google.com/file/d/1wEL923rGDt4iIDZiR4Ik-OBc9Vd-EO35/view", reportPdfUrl: "https://drive.google.com/file/d/1EH56hmudujaWJRg8If2DtYG-zSdp0hSb/view", triggerPdfUrl: "https://drive.google.com/file/d/1cwLsO5CkRSqfwyIdEfr9kPHFZgUc-iRr/view", triggerReportUrl: "/manus-storage/milwaukee_trigger_202607_d0ba4849.html", fullReportUrl: "/manus-storage/milwaukee_strategy_dashboard_8a72dc6d.html", combinedReportUrl: "/manus-storage/wisconsin_combined_dashboard_2ccfa5ef.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 972941.35, totalJobs: 413, avgJobValue: 2356, topSpecies: "Squirrels", gbpRating: null, sessionsTrend: "up", networkRank: 8, networkTotal: 19 }, tags: ["dashboard-ready", "full-data", "trigger-report"] },
  { id: "maryland-central", name: "Skedaddle Maryland Central", city: "Annapolis", state: "MD", country: "US", region: "Mid-Atlantic", driveUrl: "", fullReportUrl: "/manus-storage/maryland-central_strategy_dashboard_6bf02809.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 849720.45, totalJobs: 395, avgJobValue: 2151, topSpecies: "Mice", gbpRating: null, sessionsTrend: "flat", networkRank: 9, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "co-denver", name: "Skedaddle Denver", city: "Denver", state: "CO", country: "US", region: "Mountain West", driveUrl: "", fullReportUrl: "/manus-storage/co-denver_strategy_dashboard_8688c84f.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 785517.35, totalJobs: 505, avgJobValue: 1555, topSpecies: "Mice", gbpRating: null, sessionsTrend: "flat", networkRank: 10, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "oh-columbus", name: "Skedaddle Columbus", city: "Columbus", state: "OH", country: "US", region: "Midwest", driveUrl: "", fullReportUrl: "/manus-storage/oh-columbus_strategy_dashboard_c5f7ed11.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 619959.55, totalJobs: 353, avgJobValue: 1756, topSpecies: "Raccoons", gbpRating: null, sessionsTrend: "flat", networkRank: 11, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "md-baltimore", name: "Skedaddle Baltimore", city: "Baltimore", state: "MD", country: "US", region: "Mid-Atlantic", driveUrl: "", fullReportUrl: "/manus-storage/md-baltimore_strategy_dashboard_9519bb3e.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 598711.0, totalJobs: 326, avgJobValue: 1837, topSpecies: "Squirrels", gbpRating: null, sessionsTrend: "up", networkRank: 12, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "pa-pittsburgh", name: "Skedaddle Pittsburgh", city: "Pittsburgh", state: "PA", country: "US", region: "Mid-Atlantic", driveUrl: "", fullReportUrl: "/manus-storage/pa-pittsburgh_strategy_dashboard_dbb11e22.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 422471.75, totalJobs: 166, avgJobValue: 2545, topSpecies: "Bats", gbpRating: null, sessionsTrend: "flat", networkRank: 13, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "orangeville", name: "Skedaddle Orangeville", city: "Orangeville", state: "ON", country: "CA", region: "Ontario", driveUrl: "", fullReportUrl: "/manus-storage/orangeville_strategy_dashboard_689651dd.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 371548.17, totalJobs: 210, avgJobValue: 1769, topSpecies: "Bats", gbpRating: null, sessionsTrend: "flat", networkRank: 14, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "atlanta-north", name: "Skedaddle Atlanta North", city: "Atlanta", state: "GA", country: "US", region: "Southeast", driveUrl: "", fullReportUrl: "/manus-storage/atlanta-north_strategy_dashboard_79705e13.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 366117.75, totalJobs: 258, avgJobValue: 1419, topSpecies: "Squirrels", gbpRating: null, sessionsTrend: "up", networkRank: 15, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "okanagan", name: "Skedaddle Okanagan", city: "Kelowna", state: "BC", country: "CA", region: "British Columbia", driveUrl: "", fullReportUrl: "/manus-storage/okanagan_strategy_dashboard_615cf372.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 340178.55, totalJobs: 205, avgJobValue: 1659, topSpecies: "Rats", gbpRating: null, sessionsTrend: "flat", networkRank: 16, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "coquitlam", name: "Skedaddle Coquitlam", city: "Coquitlam", state: "BC", country: "CA", region: "British Columbia", driveUrl: "", fullReportUrl: "/manus-storage/coquitlam_strategy_dashboard_a7d402c7.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 292248.16, totalJobs: 80, avgJobValue: 3653, topSpecies: "Mice", gbpRating: null, sessionsTrend: "flat", networkRank: 17, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "l-windsor", name: "Skedaddle Windsor", city: "Windsor", state: "ON", country: "CA", region: "Ontario", driveUrl: "", fullReportUrl: "/manus-storage/l-windsor_strategy_dashboard_2c4a01f3.html", status: "active", lastUpdated: "2026-07-28", kpis: { totalRevenue: 89868.6, totalJobs: 47, avgJobValue: 1912, topSpecies: "Raccoons", gbpRating: null, sessionsTrend: "flat", networkRank: 18, networkTotal: 19 }, tags: ["dashboard-ready", "full-data"] },
  { id: "barrie-north", name: "Skedaddle Barrie North", city: "Barrie", state: "ON", country: "CA", region: "Ontario", driveUrl: "", fullReportUrl: "/manus-storage/barrie-north_strategy_dashboard_81f140c8.html", status: "pending", lastUpdated: "2026-07-28", kpis: { totalRevenue: 0, totalJobs: 0, avgJobValue: 0, topSpecies: "Unknown", gbpRating: null, sessionsTrend: "up", networkRank: 19, networkTotal: 19 }, tags: ["awaiting-data"] },
];

type ActivityTrend = "up" | "down" | "flat";

interface ActivityPoint {
  year: number;
  month: number;
  label: string;
  value: number;
}

export interface ActivityTrendSummary {
  trend: ActivityTrend;
  metric: "Organic clicks" | "GBP interactions";
  changePercent: number | null;
  comparison: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseMonthLabel(value: string): { year: number; month: number; label: string } | null {
  const isoMatch = /^(\d{4})-(\d{1,2})$/.exec(value.trim());
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    if (month >= 1 && month <= 12) return { year, month, label: `${MONTH_NAMES[month - 1]} ${year}` };
  }

  const namedMatch = /^([A-Za-z]{3,9})\s+(\d{4})$/.exec(value.trim());
  if (namedMatch) {
    const monthIndex = MONTH_NAMES.findIndex(month => month.toLowerCase() === namedMatch[1].slice(0, 3).toLowerCase());
    const year = Number(namedMatch[2]);
    if (monthIndex >= 0) return { year, month: monthIndex + 1, label: `${MONTH_NAMES[monthIndex]} ${year}` };
  }

  return null;
}

function classifyActivityChange(changePercent: number | null): ActivityTrend {
  if (changePercent === null) return "flat";
  if (changePercent >= 5) return "up";
  if (changePercent <= -5) return "down";
  return "flat";
}

function average(points: ActivityPoint[]): number {
  return points.reduce((sum, point) => sum + point.value, 0) / points.length;
}

/**
 * Produce an overview trend that is explainable and resistant to seasonality.
 * Prefer matched-month YoY; only fall back to three-month averages when a
 * same-month prior-year comparison is not available. The old implementation
 * compared the final two months, which made an ordinary seasonal dip look like
 * a durable decline across the entire network.
 */
export function deriveActivityTrend(data?: LocationDashboard): ActivityTrendSummary {
  const hasOrganicData = Boolean(data?.gsc.monthly.length);
  const metric = hasOrganicData ? "Organic clicks" : "GBP interactions";
  const rawSeries = hasOrganicData
    ? (data?.gsc.monthly ?? []).map(month => ({ label: month.month, value: month.clicks }))
    : (data?.gbp.monthly ?? []).map(month => ({ label: month.month, value: month.calls + month.website_clicks }));
  const points = rawSeries
    .map(point => {
      const parsed = parseMonthLabel(point.label);
      return parsed ? { ...parsed, value: point.value } : null;
    })
    .filter((point): point is ActivityPoint => point !== null)
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

  if (points.length < 2) {
    return { trend: "flat", metric, changePercent: null, comparison: "Insufficient monthly data" };
  }

  const latest = points[points.length - 1];
  const priorYear = points.find(point => point.year === latest.year - 1 && point.month === latest.month);

  let currentValue: number;
  let previousValue: number;
  let comparison: string;

  if (priorYear) {
    currentValue = latest.value;
    previousValue = priorYear.value;
    comparison = `${latest.label} vs ${priorYear.label} · YoY`;
  } else if (points.length >= 6) {
    const currentWindow = points.slice(-3);
    const previousWindow = points.slice(-6, -3);
    currentValue = average(currentWindow);
    previousValue = average(previousWindow);
    comparison = `${currentWindow[0].label}–${currentWindow[2].label} vs prior 3 months`;
  } else {
    currentValue = latest.value;
    previousValue = points[points.length - 2].value;
    comparison = `${latest.label} vs ${points[points.length - 2].label} · MoM`;
  }

  const changePercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : null;
  return {
    trend: classifyActivityChange(changePercent),
    metric,
    changePercent,
    comparison,
  };
}

/**
 * Territory metadata lives here; performance values always come from the same
 * dashboard snapshot used by dashboards and reports. This prevents overview
 * cards, rankings, and detail pages from silently drifting apart.
 */
export const FRANCHISE_LOCATIONS: FranchiseLocation[] = LOCATION_METADATA.map(location => {
  const data = DASHBOARD_DATA[location.id];
  if (!data) return location;

  const activity = deriveActivityTrend(data);

  return {
    ...location,
    kpis: {
      ...location.kpis,
      totalRevenue: data.total_revenue,
      totalJobs: data.total_jobs,
      avgJobValue: data.total_jobs > 0 ? Math.round(data.total_revenue / data.total_jobs) : 0,
      topSpecies: data.species[0]?.species || "Unknown",
      sessionsTrend: activity.trend,
      activityMetric: activity.metric,
      activityChangePercent: activity.changePercent,
      activityComparison: activity.comparison,
    },
  };
});

export const REGIONS = Array.from(new Set(FRANCHISE_LOCATIONS.map((f) => f.region))).sort();

export function getLocationById(id: string): FranchiseLocation | undefined {
  return FRANCHISE_LOCATIONS.find((f) => f.id === id);
}
