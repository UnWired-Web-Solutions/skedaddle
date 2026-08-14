// Skedaddle Franchise Portal — Network Page
// Shows all franchise locations in a table view with region grouping

import PortalLayout from "@/components/PortalLayout";
import { FRANCHISE_LOCATIONS, REGIONS } from "@/data/franchises";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { Link } from "wouter";

const FOREST = "oklch(0.18 0.015 65)";
const SAGE_GREEN = "oklch(0.32 0.09 145)";
const GOLD = "oklch(0.68 0.14 80)";
const MIST = "oklch(0.88 0.012 80)";

// Rank only within a shared currency. Comparing CAD and USD without an
// exchange-rate snapshot produces a misleading network leaderboard.
const RANKED_MARKETS = (["CA", "US"] as const).flatMap(country =>
  FRANCHISE_LOCATIONS
    .filter(f => f.country === country && f.status === "active" && f.kpis.totalRevenue > 0)
    .sort((a, b) => b.kpis.totalRevenue - a.kpis.totalRevenue)
    .map((location, index) => ({ location, currencyRank: index + 1 })),
);

const fmt$ = (n: number, country: "CA" | "US") => {
  const currency = country === "CA" ? "CAD" : "USD";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M ${currency}`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K ${currency}`;
  return `$${n.toFixed(0)} ${currency}`;
};

export default function Network() {
  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-5xl">
        {/* Page header */}
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.42 0.09 145)", fontFamily: "Inter, sans-serif" }}
          >
            Franchise Network
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            Network Overview
          </h1>
          <div
            className="text-sm"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            {FRANCHISE_LOCATIONS.length} locations tracked · {FRANCHISE_LOCATIONS.filter(f => f.status === "active").length} with active dashboards
          </div>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.32 0.09 145)", width: "48px" }} />
        </div>

        {/* ── Market rankings ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: SAGE_GREEN }} />
            <h2
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: SAGE_GREEN, fontFamily: "Inter, sans-serif" }}
            >
              Market Rankings by Currency — T12 Revenue
            </h2>
          </div>
          <div
            className="rounded-sm border overflow-hidden"
            style={{ borderColor: MIST }}
          >
            <table className="w-full" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead>
                <tr style={{ background: FOREST }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.88 0.012 80)" }}>Rank</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.88 0.012 80)" }}>Territory</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.88 0.012 80)" }}>Region</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.88 0.012 80)" }}>T12 Revenue</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.88 0.012 80)" }}>Jobs</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.88 0.012 80)" }}>Avg/Job</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.88 0.012 80)" }}>Top Species</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {RANKED_MARKETS.map(({ location: loc, currencyRank }, i) => (
                  <tr
                    key={loc.id}
                    style={{
                      background: i % 2 === 0 ? "oklch(1 0 0)" : "oklch(0.985 0.004 80)",
                      borderTop: `1px solid ${MIST}`,
                    }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: currencyRank === 1 ? "oklch(0.68 0.14 80)" : currencyRank <= 3 ? SAGE_GREEN : "oklch(0.52 0.016 80)",
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        #{currencyRank} {loc.country === "CA" ? "CAD" : "USD"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color: FOREST }}>
                        {loc.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "oklch(0.40 0.015 65)" }}>
                      {loc.region}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: SAGE_GREEN }}>
                      {fmt$(loc.kpis.totalRevenue, loc.country)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: "oklch(0.40 0.015 65)" }}>
                      {loc.kpis.totalJobs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: "oklch(0.40 0.015 65)" }}>
                      {loc.kpis.avgJobValue ? `$${loc.kpis.avgJobValue.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "oklch(0.40 0.015 65)" }}>
                      {loc.kpis.topSpecies}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/location/${loc.id}`}
                        className="text-xs font-semibold flex items-center gap-1 justify-end transition-opacity hover:opacity-70"
                        style={{ color: SAGE_GREEN }}
                      >
                        View <ArrowUpRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>
            Revenue figures are trailing 12 months from Salesforce. Rankings restart for CAD and USD so unlike currencies are never compared.
          </div>
        </div>

        {/* Regions */}
        {REGIONS.map((region) => {
          const locations = FRANCHISE_LOCATIONS.filter((f) => f.region === region);
          return (
            <div key={region} className="mb-8">
              <h2
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: "oklch(0.42 0.09 145)", fontFamily: "Inter, sans-serif" }}
              >
                {region}
              </h2>
              <div
                className="rounded-sm border overflow-hidden"
                style={{ borderColor: "oklch(0.88 0.012 80)" }}
              >
                <table className="w-full" style={{ fontFamily: "Inter, sans-serif" }}>
                  <thead>
                    <tr style={{ background: "oklch(0.94 0.008 80)" }}>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>Location</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>City</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>Country</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>Top Species</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc, i) => (
                      <tr
                        key={loc.id}
                        style={{
                          background: i % 2 === 0 ? "oklch(1 0 0)" : "oklch(0.985 0.004 80)",
                          borderTop: "1px solid oklch(0.92 0.008 80)",
                        }}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)" }}>
                            {loc.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "oklch(0.40 0.015 65)" }}>
                          {loc.city}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "oklch(0.40 0.015 65)" }}>
                          {loc.country}
                        </td>
                        <td className="px-4 py-3">
                          {loc.status === "active" ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-sm" style={{ background: "oklch(0.92 0.06 145)", color: "oklch(0.28 0.09 145)" }}>
                              Active
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-sm" style={{ background: "oklch(0.94 0.008 80)", color: "oklch(0.52 0.016 80)" }}>
                              Awaiting Data
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "oklch(0.40 0.015 65)" }}>
                          {loc.kpis.topSpecies}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/location/${loc.id}`}
                            className="text-xs font-semibold flex items-center gap-1 justify-end transition-opacity hover:opacity-70"
                            style={{ color: "oklch(0.32 0.09 145)" }}
                          >
                            View <ArrowUpRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </PortalLayout>
  );
}
