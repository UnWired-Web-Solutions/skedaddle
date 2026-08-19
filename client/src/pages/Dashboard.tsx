/**
 * Dashboard.tsx — Full in-portal strategy dashboard
 * Design: Skedaddle Field Operations Manual — dark forest green + warm cream
 * Shows real Salesforce + GSC + GBP data for each franchise location
 */

import { useParams, Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from "recharts";
import { DASHBOARD_DATA } from "@/data/dashboardData";
import { trpc } from "@/lib/trpc";
import PortalLayout from "@/components/PortalLayout";
import { NETWORK_OVERALL_CLOSE_RATE, getNetworkBenchmark } from "@shared/closeRateData";
import { ArrowLeft, TrendingUp, DollarSign, Users, Search, Phone, MousePointer, MapPin, AlertCircle } from "lucide-react";

// ─── colour palette ───────────────────────────────────────────────────────────
const FOREST   = "#1a3a2a";
const GOLD     = "#c9a84c";
const CREAM    = "#f5f0e8";
const SAGE     = "#4a7c59";
const RUST     = "#b85c38";
const MIST     = "#e8ede9";
const CHART_COLORS = [SAGE, GOLD, RUST, "#6b8f71", "#d4a843", "#8b4513", "#5a7a6a", "#c8a45a", "#9b6b4a", "#7a9e7e", "#e8b86d"];

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n: number, currency?: "CAD" | "USD") => {
  const suffix = currency ? ` ${currency}` : "";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M${suffix}`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K${suffix}`;
  return `$${n.toFixed(0)}${suffix}`;
};

const fmtN = (n: number) =>
  n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${n}`;

const shortMonth = (m: string) => {
  // "2026-01" → "Jan '26"
  const [y, mo] = m.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(mo) - 1]} '${y.slice(2)}`;
};

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = SAGE }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{ background: CREAM, border: `1px solid ${MIST}`, borderRadius: 8, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ background: color + "20", borderRadius: 6, padding: 6 }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#666" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: FOREST, fontFamily: "'Playfair Display', serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: FOREST, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>{subtitle}</p>}
      <div style={{ width: 32, height: 2, background: GOLD, marginTop: 8 }} />
    </div>
  );
}

// ─── custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: FOREST, border: `1px solid ${GOLD}40`, borderRadius: 6, padding: "10px 14px", fontSize: 12 }}>
      <div style={{ color: GOLD, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: CREAM, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span>{p.name}: {formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const params = useParams<{ id: string }>();
  const id = params.id?.toLowerCase() || "";
  const data = DASHBOARD_DATA[id];
  const { data: closeRateSnapshot } = trpc.analytics.getTerritoryCloseRate.useQuery(
    { territoryId: id },
    { enabled: Boolean(data) },
  );

  if (!data) {
    return (
      <PortalLayout>
        <div style={{ padding: 48, textAlign: "center", color: FOREST }}>
          <AlertCircle size={40} style={{ margin: "0 auto 16px", color: RUST }} />
          <h2 style={{ fontFamily: "'Playfair Display', serif" }}>Dashboard not available</h2>
          <p style={{ color: "#666", marginBottom: 24 }}>Data for this location hasn't been loaded yet.</p>
          <Link href={`/location/${id}`} style={{ color: SAGE, textDecoration: "underline" }}>← Back to location</Link>
        </div>
      </PortalLayout>
    );
  }

  const topSpecies = data.species[0];
  const topSuburb  = data.suburbs[0];
  const hasGsc     = data.gsc.monthly.length > 0;
  const latestGsc  = hasGsc ? data.gsc.monthly[data.gsc.monthly.length - 1] : null;
  const gscTrend   = data.gsc.monthly.length >= 2
    ? data.gsc.monthly[data.gsc.monthly.length - 1].clicks - data.gsc.monthly[data.gsc.monthly.length - 2].clicks
    : 0;
  const hasGbp     = data.gbp.monthly.length > 0;
  const gbpPeriod = hasGbp
    ? `${data.gbp.monthly[0].month} to ${data.gbp.monthly[data.gbp.monthly.length - 1].month}`
    : "No GBP data";

  // Pie chart data — top 6 species
  const pieData = data.species.slice(0, 6).map(s => ({
    name: s.species,
    value: s.total_revenue,
  }));

  // GBP monthly for chart — last 12 months
  const gbpChart = data.gbp.monthly.slice(-12);

  return (
    <PortalLayout>
      <div style={{ background: "#f9f7f3", minHeight: "100vh" }}>
      <div style={{ padding: "32px 32px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginBottom: 20 }}>
          <Link href={`/location/${id}`} style={{ color: SAGE, display: "flex", alignItems: "center", gap: 6, fontSize: 13, textDecoration: "none" }}>
            <ArrowLeft size={14} /> Back to {data.name}
          </Link>
          <span style={{ color: "#888", fontSize: 11 }}>
            Salesforce snapshot: Jul 24, 2026{hasGsc ? " · GSC connected" : ""}{hasGbp ? " · GBP connected" : ""}
          </span>
        </div>

        {/* ── KPI Strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
          <KpiCard icon={DollarSign} label={`Total Revenue (${data.currency})`} value={fmt$(data.total_revenue, data.currency)} sub="Trailing 12 months" color={SAGE} />
          <KpiCard icon={Users} label="Total Jobs" value={`${data.total_jobs}`} sub="Completed service calls" color={SAGE} />
          <KpiCard icon={TrendingUp} label="Top Species" value={topSpecies?.species || "—"} sub={topSpecies ? fmt$(topSpecies.total_revenue, data.currency) : ""} color={GOLD} />
          <KpiCard icon={MapPin} label="Top Suburb" value={topSuburb?.suburb || "—"} sub={topSuburb ? fmt$(topSuburb.revenue, data.currency) : ""} color={GOLD} />
          {hasGsc && <KpiCard icon={Search} label="GSC Clicks" value={fmtN(data.gsc.total_clicks)} sub={`${gscTrend >= 0 ? "+" : ""}${gscTrend} vs prev month`} color={RUST} />}
          <KpiCard icon={Phone} label="GBP Calls" value={fmtN(data.gbp.total_calls)} sub={`${fmtN(data.gbp.total_searches)} searches`} color={RUST} />
        </div>

        {/* ── Row 1: Revenue by Species (bar) + Species breakdown (pie) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, marginBottom: 32 }}>

          {/* Species bar chart */}
          <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}` }}>
            <SectionHeader title={`Revenue by Species (${data.currency})`} subtitle="Trailing 12 months — sorted by total revenue" />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.species} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0dbd0" />
                <XAxis dataKey="species" tick={{ fontSize: 11, fill: "#555" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tickFormatter={v => fmt$(v, data.currency)} tick={{ fontSize: 11, fill: "#555" }} width={70} />
                <Tooltip content={<ChartTooltip formatter={(v: number) => fmt$(v, data.currency)} />} />
                <Bar dataKey="total_revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                  {data.species.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Species pie */}
          <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}` }}>
            <SectionHeader title="Revenue Mix" subtitle="Top 6 species by share" />
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={fmt$} />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 8 }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i], flexShrink: 0 }} />
                  <span style={{ color: FOREST, flex: 1 }}>{d.name}</span>
                  <span style={{ color: "#666", fontWeight: 600 }}>{fmt$(d.value, data.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Territory vs network close rate ── */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}`, marginBottom: 32 }}>
          <SectionHeader
            title="Inspection-to-Sale Performance"
            subtitle={closeRateSnapshot
              ? `${closeRateSnapshot.periodStart} to ${closeRateSnapshot.periodEnd} · ${closeRateSnapshot.sourceLabel}`
              : "Territory inspections are pending a verified Salesforce performance import; network rates remain visible as context."}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              { label: "Territory Inspections", value: closeRateSnapshot?.total.inspections.toLocaleString() || "Pending" },
              { label: "Territory Closed Jobs", value: closeRateSnapshot?.total.closedJobs.toLocaleString() || "Pending" },
              { label: "Territory Close Rate", value: closeRateSnapshot?.total.closeRate == null ? "Pending" : `${closeRateSnapshot.total.closeRate.toFixed(1)}%` },
              { label: "Network Close Rate", value: `${NETWORK_OVERALL_CLOSE_RATE.toFixed(1)}%` },
            ].map(item => (
              <div key={item.label} style={{ background: "#fff", border: `1px solid ${MIST}`, borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: FOREST, marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${MIST}` }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Species</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Territory Revenue</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Inspections</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Closed Jobs</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Territory Close Rate</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Network Close Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.species.map((s, i) => {
                  const benchmark = getNetworkBenchmark(s.species);
                  const territory = closeRateSnapshot?.species.find(row => row.species.toLowerCase() === s.species.toLowerCase());
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${MIST}`, background: i % 2 === 0 ? "transparent" : "#faf8f4" }}>
                      <td style={{ padding: "10px 12px", color: FOREST, fontWeight: i < 3 ? 600 : 400 }}>
                        {i < 3 && <span style={{ color: GOLD, marginRight: 6, fontSize: 11 }}>★</span>}
                        {s.species}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: FOREST, fontWeight: 600 }}>{fmt$(s.total_revenue, data.currency)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#666" }}>{territory?.inspections.toLocaleString() || "—"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#666" }}>{territory?.closedJobs.toLocaleString() || s.total_jobs.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: FOREST, fontWeight: 700 }}>
                        {territory?.closeRate == null ? "—" : `${territory.closeRate.toFixed(1)}%`}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {benchmark !== null ? (
                          <span style={{
                            fontWeight: 700,
                            color: benchmark >= 55 ? SAGE : benchmark >= 45 ? GOLD : RUST,
                          }}>
                            {benchmark.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: "#bbb", fontSize: 11 }}>No data</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#999", display: "flex", gap: 16 }}>
            <span>Inspections are Salesforce Primary Actions Sought (PAS). Blank territory cells mean the verified import does not include that species; no values are inferred from revenue.</span>
          </div>
        </div>

        {/* ── Row 2: Top Suburbs table ── */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}`, marginBottom: 32 }}>
            <SectionHeader title={`Revenue by Suburb (${data.currency})`} subtitle="Top 20 suburbs — sorted by total revenue" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${MIST}` }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Suburb</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Jobs</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg/Job</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue Bar</th>
                </tr>
              </thead>
              <tbody>
                {data.suburbs.map((s, i) => {
                  const pct = (s.revenue / data.suburbs[0].revenue) * 100;
                  const avgJob = s.jobs > 0 ? s.revenue / s.jobs : 0;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${MIST}`, background: i % 2 === 0 ? "transparent" : "#faf8f4" }}>
                      <td style={{ padding: "10px 12px", color: FOREST, fontWeight: i < 3 ? 600 : 400 }}>
                        {i < 3 && <span style={{ color: GOLD, marginRight: 6, fontSize: 11 }}>★</span>}
                        {s.suburb}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: FOREST, fontWeight: 600 }}>{fmt$(s.revenue, data.currency)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#666" }}>{s.jobs}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#666" }}>{avgJob > 0 ? fmt$(avgJob, data.currency) : "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ background: MIST, borderRadius: 3, height: 8, width: "100%" }}>
                          <div style={{ background: CHART_COLORS[i % 3], borderRadius: 3, height: 8, width: `${pct}%`, transition: "width 0.5s ease" }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Row 3: GSC Trends ── */}
        {hasGsc && <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}`, marginBottom: 32 }}>
          <SectionHeader title="Google Search Console — Organic Traffic" subtitle="Monthly clicks and impressions" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Clicks per month</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.gsc.monthly.map(m => ({ ...m, month: shortMonth(m.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0dbd0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#555" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#555" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="clicks" name="Clicks" stroke={SAGE} strokeWidth={2} dot={{ fill: SAGE, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Average position (lower = better)</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.gsc.monthly.map(m => ({ ...m, month: shortMonth(m.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0dbd0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#555" }} />
                  <YAxis reversed tick={{ fontSize: 10, fill: "#555" }} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="avg_position" name="Avg Position" stroke={RUST} strokeWidth={2} dot={{ fill: RUST, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
            {[
              { label: "Total Clicks (period)", value: fmtN(data.gsc.total_clicks) },
              { label: "Total Impressions", value: fmtN(data.gsc.total_impressions) },
              { label: "Recent 3-Month Clicks", value: fmtN(data.gsc.recent_clicks) },
            ].map((item, i) => (
              <div key={i} style={{ background: FOREST + "08", borderRadius: 6, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: FOREST, fontFamily: "'Playfair Display', serif", marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>}

        {/* ── Row 4: GBP Performance ── */}
        {hasGbp && <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}` }}>
          <SectionHeader title="Google Business Profile Performance" subtitle={`Searches, calls, and website clicks — ${gbpPeriod}`} />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={gbpChart} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0dbd0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#555" }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#555" }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="searches" name="Searches" fill={SAGE} radius={[3, 3, 0, 0]} />
              <Bar dataKey="calls" name="Calls" fill={GOLD} radius={[3, 3, 0, 0]} />
              <Bar dataKey="website_clicks" name="Website Clicks" fill={RUST} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 20 }}>
            {[
              { label: "Total GBP Searches", value: fmtN(data.gbp.total_searches), icon: Search, color: SAGE },
              { label: "Total Calls", value: fmtN(data.gbp.total_calls), icon: Phone, color: GOLD },
              { label: "Website Clicks", value: fmtN(data.gbp.total_clicks), icon: MousePointer, color: RUST },
            ].map((item, i) => (
              <div key={i} style={{ background: item.color + "12", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <item.icon size={20} color={item.color} />
                <div>
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: FOREST, fontFamily: "'Playfair Display', serif" }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>}

      </div>
      </div>
    </PortalLayout>
  );
}
