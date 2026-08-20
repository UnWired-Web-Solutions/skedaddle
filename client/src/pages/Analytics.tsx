/**
 * Analytics.tsx — Analytics Dashboard
 * Full analytics dashboard with GA4 sessions + GBP metrics,
 * territory switching, month/year filters, YoY comparisons,
 * automated insights panel, CSV export, and detailed tooltips.
 */

import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Area, AreaChart,
} from "recharts";
import {
  TrendingUp, TrendingDown, Phone, MousePointer, MapPin, Activity,
  Calendar, ChevronDown, ArrowUpRight, ArrowDownRight, Minus,
  AlertTriangle, CheckCircle, Info, Download, Lightbulb, Search, RefreshCw, Globe, BarChart3,
} from "lucide-react";

// ─── Colour Palette (Skedaddle brand) ────────────────────────────────────────
const FOREST = "#1a3a2a";
const SAGE = "#4a7c59";
const GOLD = "#c9a84c";
const CREAM = "#f5f0e8";
const MIST = "#e8ede9";
const SKEDADDLE_GREEN = "#7AC143";
const CHART_COLORS = ["#4a7c59", "#c9a84c", "#b85c38", "#6b8f71", "#d4a843", "#8b4513"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ─── Territory mapping (GBP names → display names) ───────────────────────────
const TERRITORY_DISPLAY: Record<string, string> = {
  "Durham": "Durham Region",
  "York Region/Barrie": "York Region / Barrie",
  "Kitchener/Waterloo": "Kitchener-Waterloo",
  "Atlanta ": "Atlanta",
  "Atlanta": "Atlanta",
};

function displayName(t: string) {
  return TERRITORY_DISPLAY[t] || t;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDelta(current: number, previous: number): { text: string; direction: "up" | "down" | "flat"; color: string } {
  if (!previous || previous === 0) return { text: "N/A", direction: "flat", color: "#888" };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { text: "0%", direction: "flat", color: "#888" };
  return {
    text: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`,
    direction: pct > 0 ? "up" : "down",
    color: pct > 0 ? "#16a34a" : "#dc2626",
  };
}

function DeltaIcon({ direction }: { direction: "up" | "down" | "flat" }) {
  if (direction === "up") return <ArrowUpRight size={14} />;
  if (direction === "down") return <ArrowDownRight size={14} />;
  return <Minus size={14} />;
}

// ─── CSV Export Helper ──────────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, delta, color = SAGE }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  delta?: { text: string; direction: "up" | "down" | "flat"; color: string };
  color?: string;
}) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${MIST}`, borderRadius: 10, padding: "20px 24px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ background: color + "18", borderRadius: 6, padding: 6 }}>
          <Icon size={15} color={color} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#666", fontFamily: "Inter, sans-serif" }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: FOREST, fontFamily: "'Playfair Display', serif" }}>{value}</div>
      {delta && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12, fontWeight: 600, color: delta.color }}>
          <DeltaIcon direction={delta.direction} />
          <span>{delta.text} vs last year</span>
        </div>
      )}
    </div>
  );
}

// ─── Enhanced Chart Tooltip ─────────────────────────────────────────────────
function EnhancedTooltip({ active, payload, label, chartType }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${MIST}`,
      borderRadius: 8,
      padding: "12px 16px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      minWidth: 180,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: FOREST, marginBottom: 8, borderBottom: `1px solid ${MIST}`, paddingBottom: 6 }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: 12, color: "#444", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "3px 0" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color, display: "inline-block" }} />
            <span style={{ fontWeight: 500 }}>{p.name}</span>
          </span>
          <span style={{ fontWeight: 700, color: FOREST, fontFamily: "Inter, sans-serif" }}>
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <div style={{ fontSize: 11, color: "#888", marginTop: 6, paddingTop: 6, borderTop: `1px solid ${MIST}`, display: "flex", justifyContent: "space-between" }}>
          <span>Total</span>
          <span style={{ fontWeight: 600 }}>
            {payload.reduce((sum: number, p: any) => sum + (typeof p.value === "number" ? p.value : 0), 0).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Insights Panel (Collapsible) ───────────────────────────────────────────
function InsightsPanel({ insights, isLoading, territoryName }: { insights: any[] | undefined; isLoading: boolean; territoryName: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 13 }}>
          <Lightbulb size={16} />
          Analyzing data for anomalies...
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: SAGE, fontSize: 13, fontWeight: 600 }}>
          <CheckCircle size={16} />
          No significant anomalies detected for this period.
        </div>
      </div>
    );
  }

  const warningCount = insights.filter(i => i.type === "warning").length;
  const growthCount = insights.filter(i => i.type === "success").length;

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "20px 24px", marginBottom: 24 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <Lightbulb size={16} color={GOLD} />
        <span style={{ fontSize: 13, fontWeight: 700, color: FOREST, fontFamily: "Inter, sans-serif" }}>
          {territoryName} Insights
        </span>
        <span style={{ fontSize: 11, color: "#888", marginLeft: 4 }}>
          {warningCount > 0 && <span style={{ color: "#dc2626", fontWeight: 600 }}>{warningCount} warning{warningCount !== 1 ? "s" : ""}</span>}
          {warningCount > 0 && growthCount > 0 && " · "}
          {growthCount > 0 && <span style={{ color: "#16a34a", fontWeight: 600 }}>{growthCount} growth signal{growthCount !== 1 ? "s" : ""}</span>}
        </span>
        <ChevronDown
          size={14}
          color="#888"
          style={{
            marginLeft: "auto",
            transition: "transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {isOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${MIST}` }}>
          {insights.map((insight, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                background: insight.type === "warning" ? "#fef2f2" : insight.type === "success" ? "#f0fdf4" : "#f8fafc",
                border: `1px solid ${insight.type === "warning" ? "#fecaca" : insight.type === "success" ? "#bbf7d0" : "#e2e8f0"}`,
              }}
            >
              {insight.type === "warning" ? (
                <AlertTriangle size={15} color="#dc2626" style={{ marginTop: 1, flexShrink: 0 }} />
              ) : insight.type === "success" ? (
                <TrendingUp size={15} color="#16a34a" style={{ marginTop: 1, flexShrink: 0 }} />
              ) : (
                <Info size={15} color="#64748b" style={{ marginTop: 1, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: insight.type === "warning" ? "#991b1b" : insight.type === "success" ? "#166534" : "#334155" }}>
                  {insight.message}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {insight.metric === "sessions" ? "GA4 Sessions" : "GBP Metric"} · {Math.abs(insight.changePercent).toFixed(0)}% {insight.changePercent > 0 ? "increase" : "decrease"} YoY
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Analytics() {
  const [selectedTerritory, setSelectedTerritory] = useState("hamilton");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonMonth, setComparisonMonth] = useState(new Date().getMonth() + 1);

  // Fetch territories (19 parent territories)
  const { data: territories } = trpc.analytics.getTerritories.useQuery();
  const { data: latestPeriod } = trpc.analytics.getLatestPeriod.useQuery();
  const { data: dateRange } = trpc.analytics.getDateRange.useQuery();

  useEffect(() => {
    if (latestPeriod?.latest) {
      setSelectedYear(latestPeriod.latest.year);
      setComparisonMonth(latestPeriod.latest.month);
    }
  }, [latestPeriod]);

  // Fetch insights — territory-specific when a territory is selected
  const { data: insights, isLoading: insightsLoading } = trpc.analytics.getInsights.useQuery({
    year: selectedYear,
    month: comparisonMonth,
    territoryId: selectedTerritory,
  });

  // Fetch GA4 trend data (aggregated across sub-locations)
  const { data: ga4Trend, isLoading: ga4Loading } = trpc.analytics.getMonthlyTrend.useQuery({
    territoryId: selectedTerritory,
    startYear: selectedYear - 1,
    endYear: selectedYear,
    dataSource: "ga4",
  });

  // Fetch GBP trend data (aggregated across sub-locations)
  const { data: gbpTrend, isLoading: gbpLoading } = trpc.analytics.getMonthlyTrend.useQuery({
    territoryId: selectedTerritory,
    startYear: selectedYear - 1,
    endYear: selectedYear,
    dataSource: "gbp",
  });

  // Fetch YoY comparison
  const { data: yoyData } = trpc.analytics.getYoYComparison.useQuery({
    territoryId: selectedTerritory,
    year: selectedYear,
    month: comparisonMonth,
  });

  // Fetch summary KPIs
  const { data: summaryKPIs } = trpc.analytics.getSummaryKPIs.useQuery({
    territoryId: selectedTerritory,
    year: selectedYear,
    month: comparisonMonth,
  });

  const { data: searchConsole, isLoading: searchConsoleLoading } = trpc.analytics.getSearchConsoleOverview.useQuery({
    territoryId: selectedTerritory,
    year: selectedYear,
    month: comparisonMonth,
  });
  const { data: searchConsoleScope } = trpc.analytics.getSearchConsoleScope.useQuery({
    territoryId: selectedTerritory,
  });

  // GSC YTD comparison (DashThis replacement)
  const { data: gscYTD } = trpc.analytics.getSearchConsoleYTD.useQuery({
    territoryId: selectedTerritory,
    year: selectedYear,
  });

  // GSC monthly trend (DashThis replacement)
  const { data: gscMonthlyTrend } = trpc.analytics.getSearchConsoleMonthlyTrend.useQuery({
    territoryId: selectedTerritory,
    startYear: selectedYear - 1,
    endYear: selectedYear,
  });

  const trpcUtils = trpc.useUtils();
  const [searchConsoleSyncMessage, setSearchConsoleSyncMessage] = useState<string | null>(null);
  const searchConsoleSync = trpc.analytics.syncSearchConsoleTerritory.useMutation({
    onSuccess: async (result) => {
      setSearchConsoleSyncMessage(
        `Live import complete: ${result.pageCount.toLocaleString()} pages and ${result.queryCount.toLocaleString()} queries.`,
      );
      await trpcUtils.analytics.getSearchConsoleOverview.invalidate({
        territoryId: selectedTerritory,
        year: selectedYear,
        month: comparisonMonth,
      });
      await trpcUtils.analytics.getDateRange.invalidate();
    },
    onError: (error) => setSearchConsoleSyncMessage(error.message),
  });
  const currentUtcPeriod = new Date().getUTCFullYear() * 100 + new Date().getUTCMonth() + 1;
  const selectedSearchConsolePeriod = selectedYear * 100 + comparisonMonth;
  const isCompletedSearchConsolePeriod = selectedSearchConsolePeriod < currentUtcPeriod;

  // ─── Transform GSC monthly trend for chart ─────────────────────────────────
  const gscChartData = useMemo(() => {
    if (!gscMonthlyTrend || !Array.isArray(gscMonthlyTrend) || gscMonthlyTrend.length === 0) return [];
    return gscMonthlyTrend.map((row: any) => ({
      name: `${MONTHS[row.month - 1]} '${String(row.year).slice(2)}`,
      year: row.year,
      month: row.month,
      Clicks: row.clicks,
      Impressions: row.impressions,
      CTR: row.ctr,
    }));
  }, [gscMonthlyTrend]);

  // ─── GSC YTD KPI deltas ────────────────────────────────────────────────────
  const gscYTDDeltas = useMemo(() => {
    if (!gscYTD) return null;
    return {
      clicks: formatDelta(gscYTD.clicks.current, gscYTD.clicks.previous),
      impressions: formatDelta(gscYTD.impressions.current, gscYTD.impressions.previous),
      ctr: formatDelta(gscYTD.ctr.current, gscYTD.ctr.previous),
    };
  }, [gscYTD]);

  // Get display name for selected territory
  const selectedTerritoryName = useMemo(() => {
    const t = territories?.territories.find((t: any) => t.id === selectedTerritory);
    return t?.name || selectedTerritory;
  }, [territories, selectedTerritory]);

  // ─── Transform GA4 data for chart ───────────────────────────────────────────
  const ga4ChartData = useMemo(() => {
    if (!ga4Trend || !Array.isArray(ga4Trend)) return [];

    // Group by year-month, pivot page types into columns
    // Focus on Species + Suburb pages only (exclude Total, Blog, Service to avoid inflation)
    const INCLUDED_PAGE_TYPES = new Set(["species_pages", "location_page"]);
    const grouped: Record<string, any> = {};
    for (const row of ga4Trend as any[]) {
      if (!INCLUDED_PAGE_TYPES.has(row.pageType)) continue;
      const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
      if (!grouped[key]) {
        grouped[key] = { name: `${MONTHS[row.month - 1]} '${String(row.year).slice(2)}`, year: row.year, month: row.month };
      }
      const pt = row.pageType === "species_pages" ? "Species Pages" :
        row.pageType === "location_page" ? "Location Pages" : row.pageType;
      grouped[key][pt] = (grouped[key][pt] || 0) + Number(row.sessions);
    }

    return Object.values(grouped).sort((a: any, b: any) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
  }, [ga4Trend]);

  // ─── Transform GBP data for chart ──────────────────────────────────────────
  const gbpChartData = useMemo(() => {
    if (!gbpTrend || !Array.isArray(gbpTrend)) return [];

    const grouped: Record<string, any> = {};
    for (const row of gbpTrend as any[]) {
      const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
      if (!grouped[key]) {
        grouped[key] = { name: `${MONTHS[row.month - 1]} '${String(row.year).slice(2)}`, year: row.year, month: row.month };
      }
      const mt = row.metricType === "calls" ? "Calls" :
        row.metricType === "website_clicks" ? "Website Clicks" :
        row.metricType === "directions" ? "Directions" :
        row.metricType === "bookings" ? "Bookings" :
        row.metricType === "total" ? "Total" : row.metricType;
      if (mt !== "Total") {
        grouped[key][mt] = (grouped[key][mt] || 0) + Number(row.value);
      }
    }

    return Object.values(grouped).sort((a: any, b: any) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
  }, [gbpTrend]);

  // ─── YoY KPI calculations ──────────────────────────────────────────────────
  const yoyKPIs = useMemo(() => {
    if (!yoyData) return null;

    const getCurrent = (arr: any[], key: string) => {
      const found = arr.find((r: any) => r.metricType === key || r.pageType === key);
      return found ? Number(found.value || found.sessions || 0) : 0;
    };
    const getPrev = (arr: any[], key: string) => {
      const found = arr.find((r: any) => r.metricType === key || r.pageType === key);
      return found ? Number(found.value || found.sessions || 0) : 0;
    };

    const currentCalls = getCurrent(yoyData.gbp.current, "calls");
    const prevCalls = getPrev(yoyData.gbp.previous, "calls");
    const currentClicks = getCurrent(yoyData.gbp.current, "website_clicks");
    const prevClicks = getPrev(yoyData.gbp.previous, "website_clicks");
    const currentDirections = getCurrent(yoyData.gbp.current, "directions");
    const prevDirections = getPrev(yoyData.gbp.previous, "directions");

    // Sum species + suburb page sessions (not total, to match chart focus)
    const getSum = (arr: any[], keys: string[]) =>
      keys.reduce((sum, k) => {
        const found = arr.find((r: any) => r.pageType === k);
        return sum + (found ? Number(found.sessions || 0) : 0);
      }, 0);
    const currentSessions = getSum(yoyData.ga4.current, ["species_pages", "location_page"]);
    const prevSessions = getSum(yoyData.ga4.previous, ["species_pages", "location_page"]);

    return {
      calls: { current: currentCalls, previous: prevCalls, delta: formatDelta(currentCalls, prevCalls) },
      clicks: { current: currentClicks, previous: prevClicks, delta: formatDelta(currentClicks, prevClicks) },
      directions: { current: currentDirections, previous: prevDirections, delta: formatDelta(currentDirections, prevDirections) },
      sessions: { current: currentSessions, previous: prevSessions, delta: formatDelta(currentSessions, prevSessions) },
    };
  }, [yoyData]);

  // ─── CSV Export handlers ───────────────────────────────────────────────────
  const handleExportYoY = useCallback(() => {
    if (!yoyKPIs) return;
    const headers = ["Metric", `${MONTHS[comparisonMonth - 1]} ${selectedYear - 1}`, `${MONTHS[comparisonMonth - 1]} ${selectedYear}`, "Change %"];
    const rows = Object.entries(yoyKPIs).map(([key, data]) => [
      key === "clicks" ? "Website Clicks" : key.charAt(0).toUpperCase() + key.slice(1),
      String(data.previous),
      String(data.current),
      data.delta.text,
    ]);
    downloadCSV(`yoy_${selectedTerritoryName}_${MONTHS[comparisonMonth - 1]}_${selectedYear}.csv`, headers, rows);
  }, [yoyKPIs, selectedTerritoryName, selectedYear, comparisonMonth]);

  const handleExportGA4 = useCallback(() => {
    if (!ga4ChartData.length) return;
    const headers = ["Month", "Species Pages", "Location Pages"];
    const rows = ga4ChartData.map((d: any) => [
      d.name,
      String(d["Species Pages"] || 0),
      String(d["Location Pages"] || 0),
    ]);
    downloadCSV(`ga4_sessions_${selectedTerritoryName}_${selectedYear - 1}-${selectedYear}.csv`, headers, rows);
  }, [ga4ChartData, selectedTerritoryName, selectedYear]);

  const handleExportGBP = useCallback(() => {
    if (!gbpChartData.length) return;
    const headers = ["Month", "Calls", "Website Clicks", "Directions"];
    const rows = gbpChartData.map((d: any) => [
      d.name,
      String(d.Calls || 0),
      String(d["Website Clicks"] || 0),
      String(d.Directions || 0),
    ]);
    downloadCSV(`gbp_metrics_${selectedTerritoryName}_${selectedYear - 1}-${selectedYear}.csv`, headers, rows);
  }, [gbpChartData, selectedTerritoryName, selectedYear]);

  const handleExportSearchConsole = useCallback(() => {
    if (!searchConsole?.dataAvailable) return;
    const rows = [
      ...searchConsole.topPages.map((row: any) => ["Page", row.pageUrl, String(row.clicks), String(row.impressions), `${row.ctr.toFixed(2)}%`, row.position.toFixed(2)]),
      ...searchConsole.topQueries.map((row: any) => ["Query", row.query, String(row.clicks), String(row.impressions), `${row.ctr.toFixed(2)}%`, row.position.toFixed(2)]),
    ];
    downloadCSV(
      `gsc_${selectedTerritoryName}_${selectedYear}-${String(comparisonMonth).padStart(2, "0")}.csv`,
      ["Type", "Page or query", "Clicks", "Impressions", "CTR", "Position"],
      rows,
    );
  }, [searchConsole, selectedTerritoryName, selectedYear, comparisonMonth]);

  // ─── Available years ────────────────────────────────────────────────────────
  const minYear = Math.min(
    dateRange?.ga4.minYear || selectedYear,
    dateRange?.gbp.minYear || selectedYear,
    dateRange?.gsc.minYear || selectedYear,
  );
  const maxYear = Math.max(
    dateRange?.ga4.maxYear || selectedYear,
    dateRange?.gbp.maxYear || selectedYear,
    dateRange?.gsc.maxYear || selectedYear,
  );
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);

  // Territory list from the 19 parent territories
  const territoryList = territories?.territories || [];

  return (
    <PortalLayout>
      <div style={{ padding: "32px 28px", maxWidth: 1200, fontFamily: "Inter, sans-serif" }}>
        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: SKEDADDLE_GREEN, marginBottom: 4 }}>
            Performance Analytics
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: FOREST, fontFamily: "'Playfair Display', serif", margin: 0 }}>
            Analytics Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
            GA4, Google Business Profile, and territory-filtered Search Console performance.
          </p>
          <div style={{ marginTop: 10, borderTop: `2px solid ${SKEDADDLE_GREEN}`, width: 48 }} />
        </div>

        {/* ─── Filters Bar ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24, padding: "16px 20px", background: "#fff", borderRadius: 10, border: `1px solid ${MIST}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888" }}>Territory</label>
            <select value={selectedTerritory} onChange={(event) => setSelectedTerritory(event.target.value)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${MIST}`, fontSize: 13, fontWeight: 500, color: FOREST, background: CREAM, cursor: "pointer", minWidth: 200 }}>
              {territoryList.map((territory: any) => <option key={territory.id} value={territory.id}>{territory.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888" }}>Year</label>
            <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${MIST}`, fontSize: 13, fontWeight: 500, color: FOREST, background: CREAM, cursor: "pointer" }}>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888" }}>Compare Month</label>
            <select value={comparisonMonth} onChange={(event) => setComparisonMonth(Number(event.target.value))} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${MIST}`, fontSize: 13, fontWeight: 500, color: FOREST, background: CREAM, cursor: "pointer" }}>
              {FULL_MONTHS.map((monthName, index) => <option key={index + 1} value={index + 1}>{monthName}</option>)}
            </select>
          </div>
        </div>

        {/* ─── Search Console: top pages and queries ─────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "24px 20px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: FOREST, marginBottom: 4, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 7 }}>
                <Search size={15} color={SAGE} /> Organic Search Performance
              </h2>
              <p style={{ fontSize: 12, color: "#888" }}>
                Main domain property filtered to {searchConsole?.pathPrefix || `${selectedTerritoryName}'s approved URL path`} · {FULL_MONTHS[comparisonMonth - 1]} {selectedYear}
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
              {searchConsoleScope?.status === "ready" && (
                <button
                  onClick={() => {
                    setSearchConsoleSyncMessage(null);
                    searchConsoleSync.mutate({ territoryId: selectedTerritory, year: selectedYear, month: comparisonMonth });
                  }}
                  disabled={!isCompletedSearchConsolePeriod || searchConsoleSync.isPending}
                  title={isCompletedSearchConsolePeriod ? "Refresh the selected completed month from Google Search Console" : "Only completed calendar months can be imported"}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: "1px solid #69BE28", background: "#69BE28", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", opacity: !isCompletedSearchConsolePeriod || searchConsoleSync.isPending ? 0.55 : 1 }}
                >
                  <RefreshCw size={12} className={searchConsoleSync.isPending ? "animate-spin" : ""} />
                  {searchConsoleSync.isPending ? "Refreshing…" : "Refresh live data"}
                </button>
              )}
              <button
                onClick={handleExportSearchConsole}
                disabled={!searchConsole?.dataAvailable}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: `1px solid ${MIST}`, background: CREAM, fontSize: 11, fontWeight: 600, color: SAGE, cursor: "pointer", opacity: searchConsole?.dataAvailable ? 1 : 0.5 }}
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>
          {searchConsoleScope?.status !== "ready" && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 7, background: "#fff5e8", border: "1px solid #f0d3a6", color: "#765526", fontSize: 12 }}>
              Live import is blocked for this territory until its URL scope is confirmed. {searchConsoleScope?.notes}
            </div>
          )}
          {searchConsoleSyncMessage && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 7, background: searchConsoleSync.isError ? "#fff0ee" : "#eef8e8", border: `1px solid ${searchConsoleSync.isError ? "#efb7b0" : "#b8df9e"}`, color: searchConsoleSync.isError ? "#9d3024" : "#316e18", fontSize: 12 }}>
              {searchConsoleSyncMessage}
            </div>
          )}
          {searchConsoleLoading ? (
            <div style={{ padding: 32, color: "#aaa", textAlign: "center" }}>Loading Search Console data...</div>
          ) : !searchConsole?.dataAvailable ? (
            <div style={{ padding: "22px 18px", background: CREAM, borderRadius: 7, color: "#666", fontSize: 12 }}>
              {selectedSearchConsolePeriod < 202504
                ? "Verified territory-filtered Search Console history begins in April 2025. Earlier months were not returned by Google and are shown as unavailable rather than estimated."
                : `No territory-filtered Search Console import is available for this month. ${searchConsoleScope?.status === "ready" ? "Use Refresh live data for this completed month." : "This territory remains blocked until its approved URL scope is confirmed."}`}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Organic Clicks", value: searchConsole.summary.clicks.toLocaleString() },
                  { label: "Impressions", value: searchConsole.summary.impressions.toLocaleString() },
                  { label: "CTR", value: `${searchConsole.summary.ctr.toFixed(2)}%` },
                  { label: "Average Position", value: searchConsole.summary.averagePosition.toFixed(2) },
                ].map(item => (
                  <div key={item.label} style={{ background: CREAM, borderRadius: 7, padding: "12px 14px" }}>
                    <div style={{ color: "#888", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                    <div style={{ color: FOREST, fontWeight: 700, fontSize: 20, marginTop: 4 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 22 }}>
                {[
                  { title: "Top 25 Performing Pages", rows: searchConsole.topPages, keyName: "pageUrl" },
                  { title: "Top 25 Search Queries", rows: searchConsole.topQueries, keyName: "query" },
                ].map(group => (
                  <div key={group.title} style={{ minWidth: 0, overflowX: "auto" }}>
                    <h3 style={{ fontSize: 12, color: FOREST, marginBottom: 8 }}>{group.title}</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${MIST}`, color: "#777" }}>
                          <th style={{ textAlign: "left", padding: "7px 8px" }}>{group.keyName === "pageUrl" ? "Page" : "Query"}</th>
                          <th style={{ textAlign: "right", padding: "7px 8px" }}>Clicks</th>
                          <th style={{ textAlign: "right", padding: "7px 8px" }}>Impr.</th>
                          <th style={{ textAlign: "right", padding: "7px 8px" }}>CTR</th>
                          <th style={{ textAlign: "right", padding: "7px 8px" }}>Pos.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row: any, index: number) => (
                          <tr key={`${row[group.keyName]}-${index}`} style={{ borderBottom: `1px solid ${MIST}` }}>
                            <td title={row[group.keyName]} style={{ padding: "7px 8px", color: FOREST, maxWidth: 310, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row[group.keyName]}</td>
                            <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 600 }}>{row.clicks.toLocaleString()}</td>
                            <td style={{ padding: "7px 8px", textAlign: "right", color: "#666" }}>{row.impressions.toLocaleString()}</td>
                            <td style={{ padding: "7px 8px", textAlign: "right", color: "#666" }}>{row.ctr.toFixed(1)}%</td>
                            <td style={{ padding: "7px 8px", textAlign: "right", color: "#666" }}>{row.position.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 10, color: "#888" }}>
                Source: {searchConsole.sourceProperty}. Rankings are from the configured domain-property path filter, not personalized browser searches.
              </div>
            </>
          )}
        </div>

        {/* ─── GSC YTD KPI Cards (DashThis replacement) ──────────────────────── */}
        {gscYTD && gscYTD.monthsCovered > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: FOREST, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Search size={15} color={SAGE} />
              {selectedYear} Year-to-Date Organic Search
              <span style={{ fontSize: 11, fontWeight: 400, color: "#888", marginLeft: 4 }}>
                ({gscYTD.monthsCovered} month{gscYTD.monthsCovered !== 1 ? "s" : ""} imported{gscYTD.prevMonthsCovered > 0 ? ` · vs ${gscYTD.prevYear} same period` : ""})
              </span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <KpiCard
                icon={MousePointer}
                label="YTD Organic Clicks"
                value={gscYTD.clicks.current.toLocaleString()}
                delta={gscYTDDeltas?.clicks}
                color={SAGE}
              />
              <KpiCard
                icon={Activity}
                label="YTD Impressions"
                value={gscYTD.impressions.current.toLocaleString()}
                delta={gscYTDDeltas?.impressions}
                color={GOLD}
              />
              <KpiCard
                icon={TrendingUp}
                label="Avg CTR"
                value={`${gscYTD.ctr.current.toFixed(2)}%`}
                delta={gscYTDDeltas?.ctr}
                color="#6b8f71"
              />
            </div>
          </div>
        )}

        {/* ─── GSC Monthly Trend Chart (DashThis replacement) ─────────────────── */}
        {gscChartData.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "24px 20px", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: FOREST, marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>
                  Organic Search Trend
                </h2>
                <p style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
                  Monthly clicks and impressions from Google Search Console — {selectedTerritoryName} ({selectedYear - 1}–{selectedYear})
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={gscChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip content={<EnhancedTooltip chartType="gsc" />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="Clicks" stroke={SAGE} strokeWidth={2.5} dot={{ r: 3 }} name="Clicks" />
                <Line yAxisId="right" type="monotone" dataKey="Impressions" stroke={GOLD} strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Impressions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ─── YoY KPI Cards ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: FOREST, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={15} color={SAGE} />
            {FULL_MONTHS[comparisonMonth - 1]} {selectedYear} vs {FULL_MONTHS[comparisonMonth - 1]} {selectedYear - 1}
            <span style={{ fontSize: 11, fontWeight: 400, color: "#888", marginLeft: 4 }}>({selectedTerritoryName})</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <KpiCard
              icon={Activity}
              label="Species + Location Sessions"
              value={yoyKPIs?.sessions.current.toLocaleString() || "—"}
              delta={yoyKPIs?.sessions.delta}
              color={SAGE}
            />
            <KpiCard
              icon={Phone}
              label="GBP Calls"
              value={yoyKPIs?.calls.current.toLocaleString() || "—"}
              delta={yoyKPIs?.calls.delta}
              color={GOLD}
            />
            <KpiCard
              icon={MousePointer}
              label="Website Clicks"
              value={yoyKPIs?.clicks.current.toLocaleString() || "—"}
              delta={yoyKPIs?.clicks.delta}
              color="#b85c38"
            />
            <KpiCard
              icon={MapPin}
              label="Directions"
              value={yoyKPIs?.directions.current.toLocaleString() || "—"}
              delta={yoyKPIs?.directions.delta}
              color="#6b8f71"
            />
          </div>
        </div>

        {/* ─── GA4 Sessions Chart ──────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "24px 20px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: FOREST, marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>
                Species & Location Page Sessions
              </h2>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
                GA4 sessions for species and location pages — {selectedTerritoryName} ({selectedYear - 1}–{selectedYear})
              </p>
            </div>
            <button
              onClick={handleExportGA4}
              disabled={ga4ChartData.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                borderRadius: 6, border: `1px solid ${MIST}`, background: CREAM,
                fontSize: 11, fontWeight: 600, color: SAGE, cursor: "pointer",
                opacity: ga4ChartData.length === 0 ? 0.5 : 1,
                transition: "opacity 0.15s",
              }}
              title="Export GA4 data as CSV"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
          {ga4Loading ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>Loading...</div>
          ) : ga4ChartData.length === 0 ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>No data available for this territory</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={ga4ChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip content={<EnhancedTooltip chartType="ga4" />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Species Pages" stroke={SAGE} fill={SAGE + "30"} strokeWidth={2} name="Species Pages" />
                <Area type="monotone" dataKey="Location Pages" stroke={GOLD} fill={GOLD + "20"} strokeWidth={1.5} name="Location Pages" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>


        {/* ─── Live GA4: Top Pages (from GA4 Data API) ─────────────────────────── */}
        <GA4LiveTopPages territoryId={selectedTerritory} year={selectedYear} />

        {/* ─── Live GA4: Top Cities + Channel Breakdown ───────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
          <GA4LiveTopCities territoryId={selectedTerritory} year={selectedYear} />
          <GA4LiveChannelBreakdown territoryId={selectedTerritory} year={selectedYear} />
        </div>
        {/* ─── GBP Metrics Chart ───────────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "24px 20px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: FOREST, marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>
                Google Business Profile
              </h2>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
                Monthly GBP interactions — {selectedTerritoryName} ({selectedYear - 1}–{selectedYear})
              </p>
            </div>
            <button
              onClick={handleExportGBP}
              disabled={gbpChartData.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                borderRadius: 6, border: `1px solid ${MIST}`, background: CREAM,
                fontSize: 11, fontWeight: 600, color: SAGE, cursor: "pointer",
                opacity: gbpChartData.length === 0 ? 0.5 : 1,
                transition: "opacity 0.15s",
              }}
              title="Export GBP data as CSV"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
          {gbpLoading ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>Loading...</div>
          ) : gbpChartData.length === 0 ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>No data available for this territory</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={gbpChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip content={<EnhancedTooltip chartType="gbp" />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Calls" fill={SAGE} radius={[3, 3, 0, 0]} name="Calls" />
                <Bar dataKey="Website Clicks" fill={GOLD} radius={[3, 3, 0, 0]} name="Website Clicks" />
                <Bar dataKey="Directions" fill="#6b8f71" radius={[3, 3, 0, 0]} name="Directions" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, fontSize: 11, color: "#92400e", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠ Note:</span>
            <span>GBP data is available for select territories only. Territories without a connected Google Business Profile listing will show no data. Coverage: Hamilton, Kitchener/Waterloo, Durham, Ottawa, Belleville, Peterborough, London, Windsor, Montreal, Milwaukee, Minneapolis.</span>
          </div>
        </div>

        {/* ─── YoY Comparison Table ────────────────────────────────────────────── */}
        {yoyData && (
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "24px 20px", marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: FOREST, marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>
                  Year-over-Year Detail
                </h2>
                <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
                  {FULL_MONTHS[comparisonMonth - 1]} {selectedYear} vs {FULL_MONTHS[comparisonMonth - 1]} {selectedYear - 1} — {selectedTerritoryName}
                </p>
              </div>
              <button
                onClick={handleExportYoY}
                disabled={!yoyKPIs}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                  borderRadius: 6, border: `1px solid ${MIST}`, background: CREAM,
                  fontSize: 11, fontWeight: 600, color: SAGE, cursor: "pointer",
                  opacity: !yoyKPIs ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}
                title="Export YoY comparison as CSV"
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${MIST}` }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#666", fontSize: 11, textTransform: "uppercase" }}>Metric</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#666", fontSize: 11, textTransform: "uppercase" }}>{MONTHS[comparisonMonth - 1]} {selectedYear - 1}</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#666", fontSize: 11, textTransform: "uppercase" }}>{MONTHS[comparisonMonth - 1]} {selectedYear}</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "#666", fontSize: 11, textTransform: "uppercase" }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {yoyKPIs && Object.entries(yoyKPIs).map(([key, data]) => (
                  <tr key={key} style={{ borderBottom: `1px solid ${MIST}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500, color: FOREST, textTransform: "capitalize" }}>{key === "clicks" ? "Website Clicks" : key}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#666" }}>{data.previous.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: FOREST }}>{data.current.toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: data.delta.color, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                      <DeltaIcon direction={data.delta.direction} />
                      {data.delta.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Automated Insights Panel (Collapsible, below charts) ──────────── */}
        <InsightsPanel insights={insights} isLoading={insightsLoading} territoryName={selectedTerritoryName} />

        {/* ─── Data Source Note ─────────────────────────────────────────────────── */}
        <div style={{ padding: "14px 18px", background: CREAM, borderRadius: 8, border: `1px solid ${MIST}`, fontSize: 12, color: "#666" }}>
          <strong style={{ color: SAGE }}>Data Sources:</strong> GA4 sessions, Google Business Profile metrics stored by month for long-term YoY reporting, and Search Console pages/queries from the main domain property when a territory-scoped import is available.
        </div>
      </div>
    </PortalLayout>
  );
}

// ─── Live GA4 Sub-Components (use territory-aggregated API) ─────────────────

function GA4LiveTopPages({ territoryId, year }: { territoryId: string; year: number }) {
  const { data, isLoading } = trpc.analytics.getGA4TerritoryTopPages.useQuery(
    { territoryId, startDate: `${year}-01-01`, endDate: `${year}-12-31`, limit: 15 },
    { enabled: !!territoryId },
  );

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "24px 20px", marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: FOREST, marginBottom: 4, fontFamily: "'Playfair Display', serif", display: "flex", alignItems: "center", gap: 8 }}>
        <Globe size={16} color={SAGE} /> Live GA4: Top Pages by Sessions
      </h2>
      <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Real-time data from Google Analytics 4 — {year} YTD</p>
      {isLoading ? (
        <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>Loading live GA4 data...</div>
      ) : !data || data.length === 0 ? (
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa" }}>No GA4 data available for this territory</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${MIST}` }}>
                <th style={{ textAlign: "left", padding: "8px 10px", color: SAGE, fontWeight: 700 }}>#</th>
                <th style={{ textAlign: "left", padding: "8px 10px", color: SAGE, fontWeight: 700 }}>Page Path</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: SAGE, fontWeight: 700 }}>Sessions</th>
                <th style={{ textAlign: "right", padding: "8px 10px", color: SAGE, fontWeight: 700 }}>Users</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.pagePath} style={{ borderBottom: `1px solid ${MIST}`, background: i % 2 === 0 ? "#fff" : CREAM }}>
                  <td style={{ padding: "6px 10px", color: "#888" }}>{i + 1}</td>
                  <td style={{ padding: "6px 10px", color: FOREST, fontFamily: "monospace", fontSize: 11, maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.pagePath}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: FOREST }}>{row.sessions.toLocaleString()}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", color: "#666" }}>{row.activeUsers.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GA4LiveTopCities({ territoryId, year }: { territoryId: string; year: number }) {
  const { data, isLoading } = trpc.analytics.getGA4TerritoryTopCities.useQuery(
    { territoryId, startDate: `${year}-01-01`, endDate: `${year}-12-31`, limit: 10 },
    { enabled: !!territoryId },
  );

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "20px 18px" }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: FOREST, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <MapPin size={14} color={SAGE} /> Top Cities
      </h3>
      {isLoading ? (
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 12 }}>Loading...</div>
      ) : !data || data.length === 0 ? (
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 12 }}>No data</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.slice(0, 10).map((row, i) => (
            <div key={row.city} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: i < 9 ? `1px solid ${MIST}` : "none" }}>
              <span style={{ fontSize: 12, color: FOREST }}>{row.city}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: SAGE }}>{row.sessions.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GA4LiveChannelBreakdown({ territoryId, year }: { territoryId: string; year: number }) {
  const { data, isLoading } = trpc.analytics.getGA4TerritoryChannelBreakdown.useQuery(
    { territoryId, startDate: `${year}-01-01`, endDate: `${year}-12-31` },
    { enabled: !!territoryId },
  );

  const total = useMemo(() => data?.reduce((sum, r) => sum + r.sessions, 0) || 0, [data]);

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${MIST}`, padding: "20px 18px" }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: FOREST, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <BarChart3 size={14} color={SAGE} /> Traffic Channels
      </h3>
      {isLoading ? (
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 12 }}>Loading...</div>
      ) : !data || data.length === 0 ? (
        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 12 }}>No data</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.slice(0, 8).map((row) => {
            const pct = total > 0 ? (row.sessions / total) * 100 : 0;
            return (
              <div key={row.channel}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: FOREST }}>{row.channel}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: SAGE }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height: 6, background: MIST, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: SAGE, borderRadius: 3, transition: "width 0.3s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
