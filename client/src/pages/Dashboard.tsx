/**
 * Dashboard.tsx — Full in-portal strategy dashboard
 * Design: Skedaddle Field Operations Manual — dark forest green + warm cream
 * Shows workbook-backed work-order aggregates alongside separately labelled GSC and GBP data.
 */

import { useParams, Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";
import { DASHBOARD_DATA } from "@/data/dashboardData";
import { trpc } from "@/lib/trpc";
import PortalLayout from "@/components/PortalLayout";
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
  const { data: workbookPerformance } = trpc.salesforceWorkbook.getTerritoryPerformance.useQuery(
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

  const workbookMonths = workbookPerformance?.months.slice(-12) ?? [];
  const workbookSpecies = workbookPerformance?.species ?? [];
  const workbookCities = workbookPerformance?.cities ?? [];
  const workbookCurrencies = Array.from(new Set(workbookMonths.map(row => row.currencyCode)));
  const workbookCurrency = workbookCurrencies.length === 1 ? workbookCurrencies[0] : null;
  const totalWorkbookJobs = workbookMonths.reduce((sum, row) => sum + row.workOrders, 0);
  const totalWorkbookInvoiceValue = workbookMonths.reduce((sum, row) => sum + row.invoicePreTaxAmount, 0);
  const totalWorkbookInvoiceRows = workbookMonths.reduce((sum, row) => sum + row.invoiceValueRows, 0);
  const formatWorkbookMoney = (value: number, currencyCode: string | null = workbookCurrency) =>
    currencyCode === "CAD" || currencyCode === "USD"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(value)
    : "Unavailable";
  const hasGsc     = data.gsc.monthly.length > 0;
  const latestGsc  = hasGsc ? data.gsc.monthly[data.gsc.monthly.length - 1] : null;
  const gscTrend   = data.gsc.monthly.length >= 2
    ? data.gsc.monthly[data.gsc.monthly.length - 1].clicks - data.gsc.monthly[data.gsc.monthly.length - 2].clicks
    : 0;
  const hasGbp     = data.gbp.monthly.length > 0;
  const gbpPeriod = hasGbp
    ? `${data.gbp.monthly[0].month} to ${data.gbp.monthly[data.gbp.monthly.length - 1].month}`
    : "No GBP data";

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
            Salesforce-derived source: Google Drive workbook{workbookPerformance?.activeRun ? ` · active ${workbookPerformance.activeRun.status} snapshot` : " · no active canonical snapshot"}{hasGsc ? " · GSC connected" : ""}{hasGbp ? " · GBP connected" : ""}
          </span>
        </div>

        {/* ── KPI Strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
          <KpiCard icon={DollarSign} label={workbookCurrency ? `Recorded Invoice Value (${workbookCurrency})` : "Recorded Invoice Value"} value={totalWorkbookInvoiceRows > 0 ? formatWorkbookMoney(totalWorkbookInvoiceValue) : "Pending"} sub={totalWorkbookInvoiceRows > 0 ? "Workbook pre-tax amounts; not Salesforce API" : "No canonical workbook amount available"} color={SAGE} />
          <KpiCard icon={Users} label="Workbook Work Orders" value={workbookMonths.length ? totalWorkbookJobs.toLocaleString() : "Pending"} sub={workbookMonths.length ? "Last 12 source months; all statuses" : "No canonical workbook snapshot available"} color={SAGE} />
          <KpiCard icon={TrendingUp} label="Top Species" value={workbookSpecies[0]?.label || "Pending"} sub={workbookSpecies[0] ? `${workbookSpecies[0].workOrders.toLocaleString()} recorded work orders` : "Workbook aggregate unavailable"} color={GOLD} />
          <KpiCard icon={MapPin} label="Top City" value={workbookCities[0]?.label || "Pending"} sub={workbookCities[0] ? `${workbookCities[0].workOrders.toLocaleString()} recorded work orders` : "Workbook aggregate unavailable"} color={GOLD} />
          {hasGsc && <KpiCard icon={Search} label="GSC Clicks" value={fmtN(data.gsc.total_clicks)} sub={`${gscTrend >= 0 ? "+" : ""}${gscTrend} vs prev month`} color={RUST} />}
          <KpiCard icon={Phone} label="GBP Calls" value={fmtN(data.gbp.total_calls)} sub={`${fmtN(data.gbp.total_searches)} searches`} color={RUST} />
        </div>

        {/* ── Workbook species breakdown ── */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}`, marginBottom: 32 }}>
          <SectionHeader title="Work Orders by Species" subtitle="Active Google Drive workbook snapshot; all statuses retained" />
          {workbookSpecies.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><thead><tr style={{ borderBottom: `2px solid ${MIST}` }}><th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontSize: 11 }}>SPECIES</th><th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontSize: 11 }}>WORK ORDERS</th><th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontSize: 11 }}>RECORDED INVOICE VALUE</th></tr></thead><tbody>{workbookSpecies.map((item, index) => <tr key={`${item.currencyCode}-${item.label}`} style={{ borderBottom: `1px solid ${MIST}` }}><td style={{ padding: "10px 12px", color: FOREST, fontWeight: index < 3 ? 600 : 400 }}>{item.label}</td><td style={{ padding: "10px 12px", textAlign: "right", color: "#666" }}>{item.workOrders.toLocaleString()}</td><td style={{ padding: "10px 12px", textAlign: "right", color: FOREST, fontWeight: 600 }}>{item.invoiceValueRows ? formatWorkbookMoney(item.invoicePreTaxAmount, item.currencyCode) : "Unavailable"}</td></tr>)}</tbody></table></div> : <p style={{ color: "#777", fontSize: 13, margin: 0 }}>Species aggregates are unavailable until a canonical workbook snapshot is active for this territory.</p>}
        </div>

        {/* ── Workbook conversion status ── */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}`, marginBottom: 32 }}>
          <SectionHeader
            title="Salesforce-derived Work-Order Status"
            subtitle={workbookPerformance?.activeRun
              ? `Google Drive workbook · ${workbookPerformance.activeRun.status} snapshot · ${workbookPerformance.activeRun.rowsRejected.toLocaleString()} source rows explicitly excluded from canonical territory aggregates`
              : "No active canonical workbook snapshot is available for this territory."}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
            {[
              { label: "Work Orders", value: workbookMonths.length ? totalWorkbookJobs.toLocaleString() : "Pending" },
              { label: "Invoice Amount Rows", value: workbookMonths.length ? totalWorkbookInvoiceRows.toLocaleString() : "Pending" },
              { label: "Inspection Definition", value: "Unavailable" },
              { label: "Closed-Job Definition", value: "Unavailable" },
            ].map(item => (
              <div key={item.label} style={{ background: "#fff", border: `1px solid ${MIST}`, borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: FOREST, marginTop: 4 }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#999", display: "flex", gap: 16 }}>
            <span>The approved workbook preserves exact source statuses, but UWS has not approved a status-to-inspection or status-to-closed-job definition. Close rates and network benchmarks are intentionally unavailable; none are inferred from recorded invoice values.</span>
          </div>
        </div>

        {/* ── Workbook city table ── */}
        <div style={{ background: CREAM, borderRadius: 10, padding: 24, border: `1px solid ${MIST}`, marginBottom: 32 }}>
            <SectionHeader title="Work Orders by City" subtitle="Active Google Drive workbook snapshot; not a suburb-page opportunity ranking" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${MIST}` }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>City</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recorded Work Orders</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recorded Invoice Value</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Work-Order Share</th>
                </tr>
              </thead>
              <tbody>
                {workbookCities.map((s, i) => {
                  const pct = workbookCities[0] ? (s.workOrders / workbookCities[0].workOrders) * 100 : 0;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${MIST}`, background: i % 2 === 0 ? "transparent" : "#faf8f4" }}>
                      <td style={{ padding: "10px 12px", color: FOREST, fontWeight: i < 3 ? 600 : 400 }}>
                        {i < 3 && <span style={{ color: GOLD, marginRight: 6, fontSize: 11 }}>★</span>}
                        {s.label}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#666" }}>{s.workOrders.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: FOREST, fontWeight: 600 }}>{s.invoiceValueRows ? formatWorkbookMoney(s.invoicePreTaxAmount, s.currencyCode) : "Unavailable"}</td>
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
