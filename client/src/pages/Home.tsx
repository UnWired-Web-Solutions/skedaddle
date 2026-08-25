// Skedaddle Franchise Portal — Overview / Home Page
// Shows all franchise locations as cards with status, KPIs, and links to reports

import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { FRANCHISE_LOCATIONS, type FranchiseLocation } from "@/data/franchises";
import { ArrowUpRight, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "wouter";

function StatusBadge({ status }: { status: FranchiseLocation["status"] }) {
  const map = {
    active: { label: "Dashboard Ready", bg: "oklch(0.92 0.06 145)", color: "oklch(0.28 0.09 145)" },
    pending: { label: "In Progress", bg: "oklch(0.95 0.06 80)", color: "oklch(0.50 0.10 80)" },
    coming_soon: { label: "Awaiting Data", bg: "oklch(0.94 0.008 80)", color: "oklch(0.52 0.016 80)" },
  };
  const s = map[status];
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-sm"
      style={{ background: s.bg, color: s.color, fontFamily: "Inter, sans-serif" }}
    >
      {s.label}
    </span>
  );
}

function TrendIcon({ trend }: { trend: FranchiseLocation["kpis"]["sessionsTrend"] }) {
  if (trend === "up") return <TrendingUp size={14} style={{ color: "oklch(0.42 0.12 145)" }} />;
  if (trend === "down") return <TrendingDown size={14} style={{ color: "oklch(0.55 0.20 27)" }} />;
  return <span style={{ color: "oklch(0.65 0.010 80)", fontSize: "12px" }}>→</span>;
}

function activityLabel(loc: FranchiseLocation): string {
  const { sessionsTrend, activityChangePercent } = loc.kpis;
  if (activityChangePercent === null || activityChangePercent === undefined) return "Insufficient data";
  if (sessionsTrend === "up" || sessionsTrend === "down") {
    return `${Math.abs(activityChangePercent).toFixed(0)}%`;
  }
  return "Stable";
}

function LocationCard({ loc }: { loc: FranchiseLocation }) {
  const isReady = loc.status === "active";

  return (
    <div
      className="rounded-sm border transition-shadow hover:shadow-md"
      style={{
        background: "oklch(1 0 0)",
        borderColor: "oklch(0.88 0.012 80)",
        borderLeft: isReady ? "3px solid oklch(0.68 0.20 140)" : "3px solid oklch(0.88 0.012 80)",
      }}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3
              className="text-base font-bold truncate"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
            >
              {loc.name}
            </h3>
            <div
              className="text-xs mt-0.5"
              style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
            >
              {loc.city}, {loc.state} · {loc.country} · {loc.region}
            </div>
          </div>
          <StatusBadge status={loc.status} />
        </div>

        {/* KPI row */}
        {isReady ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
            {/* Revenue */}
            <div>
              <div
                className="text-xs uppercase tracking-wider mb-0.5"
                style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
              >
                T12 Revenue ({loc.country === "CA" ? "CAD" : "USD"})
              </div>
              <div
                className="text-sm font-bold"
                style={{ color: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif" }}
              >
                {loc.kpis.totalRevenue > 0
                  ? loc.kpis.totalRevenue >= 1_000_000
                    ? `$${(loc.kpis.totalRevenue / 1_000_000).toFixed(2)}M`
                    : `$${(loc.kpis.totalRevenue / 1_000).toFixed(0)}K`
                  : "—"}
              </div>
            </div>
            {/* Jobs */}
            <div>
              <div
                className="text-xs uppercase tracking-wider mb-0.5"
                style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
              >
                Total Jobs
              </div>
              <div
                className="text-sm font-bold"
                style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}
              >
                {loc.kpis.totalJobs > 0 ? loc.kpis.totalJobs : "—"}
              </div>
            </div>
            {/* Top Species */}
            <div>
              <div
                className="text-xs uppercase tracking-wider mb-0.5"
                style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
              >
                Top Species
              </div>
              <div
                className="text-sm font-semibold"
                style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}
              >
                {loc.kpis.topSpecies}
              </div>
            </div>
            {/* Digital activity */}
            <div>
              <div
                className="text-xs uppercase tracking-wider mb-0.5"
                style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
              >
                {loc.kpis.activityMetric ?? "Digital activity"}
              </div>
              <div
                className="flex items-center gap-1"
                title={loc.kpis.activityComparison ?? "No comparison available"}
              >
                <TrendIcon trend={loc.kpis.sessionsTrend} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}
                >
                  {activityLabel(loc)}
                </span>
              </div>
              <div
                className="text-[10px] mt-0.5 truncate"
                style={{ color: "oklch(0.58 0.012 80)", fontFamily: "Inter, sans-serif" }}
                title={loc.kpis.activityComparison ?? "No comparison available"}
              >
                {loc.kpis.activityComparison ?? "No comparison available"}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="mt-3 text-sm"
            style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
          >
            <Clock size={13} className="inline mr-1.5 mb-0.5" />
            Dashboard will be generated once Salesforce data is received from this location.
          </div>
        )}
      </div>

      {/* Card footer */}
      <div
        className="px-5 py-3 flex items-center justify-between border-t"
        style={{ borderColor: "oklch(0.93 0.008 80)" }}
      >
        <Link
          href={`/location/${loc.id}`}
          className="text-xs font-semibold flex items-center gap-1 transition-colors"
          style={{ color: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif" }}
        >
          View Details <ArrowUpRight size={12} />
        </Link>

        {isReady && (
          <Link
            href={`/trigger/${loc.id}`}
            className="text-xs flex items-center gap-1 transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            Monthly Trigger Brief <ArrowUpRight size={11} />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  // Show all territories with complete dashboards
  const completeLocations = FRANCHISE_LOCATIONS.filter((f) => f.tags?.includes("full-data"));

  const visibleLocations =
    user?.role === "admin"
      ? completeLocations
      : FRANCHISE_LOCATIONS.filter((f) => f.id === user?.locationId);

  const activeCount = visibleLocations.filter((f) => f.status === "active").length;
  const totalCount = visibleLocations.length;

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-6xl">
        {/* Page header */}
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
          >
            {user?.role === "admin" ? "Network Overview" : "Your Dashboard"}
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            {user?.role === "admin" ? "Franchise Locations" : `${user?.locationId?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Dashboard`}
          </h1>
          <div
            className="text-sm"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            {activeCount} location{activeCount !== 1 ? "s" : ""} with complete dashboards
            {user?.role === "admin" && " · Skedaddle Humane Wildlife Control network"}
          </div>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.68 0.20 140)", width: "48px" }} />
        </div>

        {/* Location grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleLocations.map((loc) => (
            <LocationCard key={loc.id} loc={loc} />
          ))}
        </div>

        {/* Admin note */}
        {user?.role === "admin" && (
          <div
            className="mt-8 p-4 rounded-sm border text-sm"
            style={{
              background: "oklch(0.97 0.012 80)",
              borderColor: "oklch(0.88 0.012 80)",
              color: "oklch(0.52 0.016 80)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            <strong style={{ color: "oklch(0.68 0.20 140)" }}>Admin note:</strong> {completeLocations.length} of {FRANCHISE_LOCATIONS.length} territories have a current dashboard snapshot. Analytics coverage varies by source and territory; locations still awaiting data remain listed on the Network page.
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
