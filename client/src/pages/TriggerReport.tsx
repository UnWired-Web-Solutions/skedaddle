/**
 * TriggerReport.tsx — Monthly Trigger Report
 * Exactly replicates the original HTML report design inside the portal.
 * Design: cream background, Georgia serif, dark forest green accents — matching the original.
 * Route: /trigger/:id
 */

import { useParams, Link } from "wouter";
import { DASHBOARD_DATA, type LocationDashboard } from "@/data/dashboardData";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n: number, currency?: "CAD" | "USD") => {
  const suffix = currency ? ` ${currency}` : "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M${suffix}`;
  if (n >= 1_000)     return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}${suffix}`;
  return `$${n.toFixed(0)}${suffix}`;
};

// Determine season from current month
function getSeason(month = new Date().getMonth() + 1): { emoji: string; name: string; note: string } {
  const m = month - 1;
  if (m >= 2 && m <= 4)  return { emoji: "🌱", name: "Spring",      note: "Peak denning season for raccoons and squirrels. Bat maternity colonies forming. Highest call volume period." };
  if (m >= 5 && m <= 7)  return { emoji: "🌿", name: "Mid-Summer",  note: "Continued bat maternity season. Squirrel and mouse activity building toward fall. Pre-fall content now." };
  if (m >= 8 && m <= 10) return { emoji: "🍂", name: "Fall",        note: "Mice and squirrel entry season begins. Highest urgency for exclusion content. GBP posts should focus on prevention." };
  return                          { emoji: "❄️", name: "Winter",     note: "Mouse activity peaks indoors. Squirrel attic activity high. Focus content on warmth-seeking species." };
}

// Generate action cards from data
function generateActions(data: LocationDashboard, season: ReturnType<typeof getSeason>, yoy: any) {
  const actions: Array<{ priority: string; priorityColor: string; title: string; detail: string }> = [];
  const topSpecies = data.species[0];
  const topSuburb = data.suburbs[0];

  const value = (rows: any[] | undefined, key: string, kind: "pageType" | "metricType") =>
    Number(rows?.find(row => row[kind] === key)?.sessions ?? rows?.find(row => row[kind] === key)?.value ?? 0);
  const currentSessions = value(yoy?.ga4.current, "species_pages", "pageType") + value(yoy?.ga4.current, "location_page", "pageType");
  const previousSessions = value(yoy?.ga4.previous, "species_pages", "pageType") + value(yoy?.ga4.previous, "location_page", "pageType");
  const currentCalls = value(yoy?.gbp.current, "calls", "metricType");
  const previousCalls = value(yoy?.gbp.previous, "calls", "metricType");

  if (previousSessions > 0) {
    const change = ((currentSessions - previousSessions) / previousSessions) * 100;
    actions.push({
      priority: change < 0 ? "⚠ Performance" : "✓ Performance",
      priorityColor: change < 0 ? "#b85c38" : "#1a7a3e",
      title: `${change < 0 ? "Investigate" : "Build on"} ${Math.abs(change).toFixed(0)}% YoY change in priority-page sessions`,
      detail: `Species and location pages recorded ${currentSessions.toLocaleString()} sessions versus ${previousSessions.toLocaleString()} in the same month last year. Review page-level changes before assigning corrective work.`,
    });
  }

  if (previousCalls > 0) {
    const change = ((currentCalls - previousCalls) / previousCalls) * 100;
    actions.push({
      priority: change < 0 ? "⚠ GBP" : "✓ GBP",
      priorityColor: change < 0 ? "#b85c38" : "#1a7a3e",
      title: `${change < 0 ? "Review" : "Sustain"} GBP call performance`,
      detail: `GBP generated ${currentCalls.toLocaleString()} calls versus ${previousCalls.toLocaleString()} in the same month last year (${change >= 0 ? "+" : ""}${change.toFixed(0)}%). Confirm profile activity and call tracking before changing volume.`,
    });
  }

  actions.push({
    priority: topSpecies && topSuburb ? "🎯 Demand Priority" : "📅 Seasonal",
    priorityColor: "#4a7c59",
    title: topSpecies && topSuburb ? `Validate ${topSpecies.species} coverage in ${topSuburb.suburb}` : `Plan the ${season.name} content cycle`,
    detail: topSpecies && topSuburb
      ? `${topSpecies.species} and ${topSuburb.suburb} lead the verified T12 demand snapshot. Audit current pages and local facts before creating content. Seasonal context: ${season.note}`
      : season.note,
  });

  if (actions.length < 3) {
    actions.unshift({
      priority: "ℹ Data",
      priorityColor: "#666",
      title: "Complete the monthly analytics import",
      detail: "A valid same-month year-over-year comparison is not available yet. Import and verify GA4 and GBP data before describing movement as a trend.",
    });
  }
  if (actions.length < 3) {
    actions.push({
      priority: "📅 Seasonal",
      priorityColor: "#4a7c59",
      title: `Prepare the ${season.name} measurement plan`,
      detail: `${season.note} Define the page, GBP, and call metrics that will determine whether the work succeeded.`,
    });
  }
  return actions.slice(0, 3);
}

// ─── styles (matching original HTML report exactly) ──────────────────────────
const S = {
  page: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "40px 32px",
    fontFamily: "Georgia, serif",
    background: "#f8f6f0",
    color: "#1a1a1a",
    fontSize: 15,
    lineHeight: 1.6,
  } as React.CSSProperties,
  brand: {
    fontSize: 11,
    fontFamily: "Arial, sans-serif",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#1a4a2e",
    fontWeight: 700,
  },
  reportTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: "6px 0 2px",
    fontFamily: "Georgia, serif",
  },
  reportMeta: {
    fontSize: 13,
    color: "#666",
    fontFamily: "Arial, sans-serif",
  },
  seasonBanner: {
    background: "#1a4a2e",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 4,
    fontSize: 13,
    fontFamily: "Arial, sans-serif",
    marginBottom: 28,
  },
  kpiStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 32,
  } as React.CSSProperties,
  kpi: {
    background: "#fff",
    border: "1px solid #e0ddd5",
    borderRadius: 6,
    padding: 16,
  },
  kpiLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#888",
    fontFamily: "Arial, sans-serif",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a1a1a",
  },
  kpiChange: {
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
    marginTop: 2,
    color: "#888",
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: "#1a4a2e",
    fontWeight: 700,
    fontFamily: "Arial, sans-serif",
    borderBottom: "1px solid #e0ddd5",
    paddingBottom: 6,
    marginBottom: 14,
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginBottom: 32,
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontFamily: "Arial, sans-serif",
    fontSize: 13,
  },
  th: {
    textAlign: "left" as const,
    padding: "8px 10px",
    background: "#f0ede5",
    color: "#444",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  td: {
    padding: "8px 10px",
    borderBottom: "1px solid #f0ede5",
  },
  actionCard: {
    background: "#fff",
    border: "1px solid #e0ddd5",
    borderLeft: "4px solid #1a4a2e",
    borderRadius: 4,
    padding: "16px 18px",
    marginBottom: 12,
  },
  footer: {
    borderTop: "1px solid #e0ddd5",
    paddingTop: 16,
    marginTop: 32,
    fontSize: 11,
    color: "#aaa",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    justifyContent: "space-between",
  } as React.CSSProperties,
};

// ─── main component ───────────────────────────────────────────────────────────
export default function TriggerReport() {
  const params = useParams<{ id: string }>();
  const id = params.id?.toLowerCase() || "";
  const data = DASHBOARD_DATA[id];
  const latestPeriodQuery = trpc.analytics.getLatestPeriod.useQuery();
  const latestPeriod = latestPeriodQuery.data?.latest;
  const reportYear = latestPeriod?.year ?? new Date().getFullYear();
  const reportMonth = latestPeriod?.month ?? new Date().getMonth() + 1;
  const yoyQuery = trpc.analytics.getYoYComparison.useQuery(
    { territoryId: id, year: reportYear, month: reportMonth },
    { enabled: Boolean(data && latestPeriod) },
  );
  const season = getSeason(reportMonth);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const monthYear = new Date(reportYear, reportMonth - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  useEffect(() => {
    if (data) document.title = `Monthly Trigger Report — ${data.name} — ${monthYear}`;
    return () => { document.title = "Skedaddle Franchise Strategy Dashboards"; };
  }, [data, monthYear]);

  if (!data) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontFamily: "Arial, sans-serif" }}>
        <p>Report not available for this location.</p>
        <br />
        <Link href="/" style={{ color: "#1a4a2e" }}>← Back to portal</Link>
      </div>
    );
  }

  const actions = generateActions(data, season, yoyQuery.data);
  const topSuburbs = data.suburbs.slice(0, 5);
  const prioritySuburbs = data.suburbs.slice(0, 3);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @page { margin: 15mm 12mm; }
        tr.trending td { background: #f0fff4; }
        tr.declining td { background: #fff5f5; }
      `}</style>

      {/* Print/Back bar */}
      <div
        className="no-print"
        style={{
          background: "#1a4a2e", padding: "12px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10,
        }}
      >
        <Link href={`/location/${id}`} style={{ color: "#c9a84c", fontSize: 13, textDecoration: "none" }}>
          ← Back to Location
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            background: "#c9a84c", color: "#1a4a2e", border: "none",
            borderRadius: 4, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Save as PDF / Print
        </button>
      </div>

      {/* Report body — matches original HTML exactly */}
      <div style={{ background: "#f8f6f0", minHeight: "100vh" }}>
        <div style={S.page}>

          {/* Header */}
          <div style={{ borderBottom: "3px solid #1a4a2e", paddingBottom: 20, marginBottom: 32 }}>
            <div style={S.brand}>Skedaddle Franchise Intelligence</div>
            <div style={S.reportTitle}>Monthly Trigger Report — {data.name}</div>
            <div style={S.reportMeta}>{monthYear} · Generated {today}</div>
          </div>

          {/* Season banner */}
          <div style={S.seasonBanner}>
            {season.emoji} {season.name} &nbsp;|&nbsp; {season.note}
          </div>

          {/* KPI strip */}
          <div style={S.kpiStrip}>
            <div style={S.kpi}>
              <div style={S.kpiLabel}>Total Revenue ({data.currency})</div>
              <div style={S.kpiValue}>{fmt$(data.total_revenue, data.currency)}</div>
              <div style={S.kpiChange}>Trailing 12 months</div>
            </div>
            <div style={S.kpi}>
              <div style={S.kpiLabel}>Total Jobs</div>
              <div style={S.kpiValue}>{data.total_jobs}</div>
              <div style={S.kpiChange}>Completed service calls</div>
            </div>
            <div style={S.kpi}>
              <div style={S.kpiLabel}>Top Species</div>
              <div style={S.kpiValue}>{data.species[0]?.species}</div>
              <div style={S.kpiChange}>{fmt$(data.species[0]?.total_revenue || 0, data.currency)} revenue</div>
            </div>
            <div style={S.kpi}>
              <div style={S.kpiLabel}>Top Suburb</div>
              <div style={S.kpiValue}>{data.suburbs[0]?.suburb}</div>
              <div style={S.kpiChange}>{fmt$(data.suburbs[0]?.revenue || 0, data.currency)} revenue</div>
            </div>
          </div>

          {/* Two-column: Species Trends + Suburb Intelligence */}
          <div style={S.twoCol}>

            {/* Species demand */}
            <div style={{ marginBottom: 0 }}>
              <div style={S.sectionTitle}>Species Demand — T12 Snapshot</div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Species</th>
                    <th style={S.th}>Revenue</th>
                    <th style={S.th}>Jobs</th>
                    <th style={S.th}>Revenue Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.species.map((s, i) => (
                    <tr key={i}>
                      <td style={S.td}>{s.species}</td>
                      <td style={S.td}>{fmt$(s.total_revenue, data.currency)}</td>
                      <td style={S.td}>{s.total_jobs || "—"}</td>
                      <td style={{ ...S.td, color: "#1a4a2e", fontWeight: 600 }}>
                        {data.total_revenue > 0 ? `${((s.total_revenue / data.total_revenue) * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: "#aaa", fontFamily: "Arial, sans-serif", marginTop: 6 }}>
                Ranked by verified trailing-12-month revenue; this table does not imply month-over-month movement.
              </p>
            </div>

            {/* Suburb Intelligence */}
            <div>
              <div style={S.sectionTitle}>Top Suburbs This Period</div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Suburb</th>
                    <th style={S.th}>Revenue</th>
                    <th style={S.th}>Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {topSuburbs.map((s, i) => (
                    <tr key={i}>
                      <td style={S.td}>{s.suburb}</td>
                      <td style={S.td}>{fmt$(s.revenue, data.currency)}</td>
                      <td style={S.td}>{s.jobs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ ...S.sectionTitle, marginTop: 16 }}>Priority Suburbs — T12 Demand</div>
              <ul style={{ paddingLeft: 18, fontFamily: "Arial, sans-serif", fontSize: 13 }}>
                {prioritySuburbs.map((s, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <strong>{s.suburb}</strong> — {fmt$(s.revenue, data.currency)} across {s.jobs} closed jobs
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3 Actions */}
          <div style={{ marginBottom: 32 }}>
            <div style={S.sectionTitle}>3 Actions for This Month</div>
            {actions.map((a, i) => (
              <div key={i} style={{ ...S.actionCard, borderLeftColor: a.priorityColor }}>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", fontWeight: 700, color: a.priorityColor, marginBottom: 4 }}>
                  {a.priority}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, fontFamily: "Georgia, serif" }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 13, color: "#444", fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}>
                  {a.detail}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={S.footer}>
            <span>Skedaddle Franchise Portal · skedaddle.manus.space</span>
            <span>{latestPeriod ? `Sources: Salesforce T12 demand snapshot · GA4/GBP YoY through ${monthYear}` : "Source: Salesforce T12 demand snapshot · Analytics comparison unavailable"}</span>
          </div>

        </div>
      </div>
    </>
  );
}
