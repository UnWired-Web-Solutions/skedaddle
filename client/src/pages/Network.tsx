// Shows all franchise locations with a source-aware network workbook summary.

import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { FRANCHISE_LOCATIONS, REGIONS } from "@/data/franchises";
import { ArrowUpRight, Database, TrendingUp } from "lucide-react";
import { Link } from "wouter";

const FOREST = "oklch(0.18 0.015 65)";
const SAGE_GREEN = "oklch(0.68 0.20 140)";
const GOLD = "oklch(0.68 0.14 80)";
const MIST = "oklch(0.88 0.012 80)";

const formatRecordedInvoiceValue = (value: number, currency: string) => new Intl.NumberFormat("en", {
  style: "currency",
  currency,
  maximumFractionDigits: 0,
}).format(value);

export default function Network() {
  const { data: workbook, isLoading, isError } = trpc.salesforceWorkbook.getNetworkPerformance.useQuery();
  const locationById = new Map(FRANCHISE_LOCATIONS.map(location => [location.id, location]));
  const records = workbook?.source === "salesforce_drive_workbook"
    ? workbook.territories.map(row => ({
      ...row,
      location: locationById.get(row.territoryId),
    })).filter((row): row is typeof row & { location: (typeof FRANCHISE_LOCATIONS)[number] } => Boolean(row.location))
    : [];
  const rankedMarkets = Object.entries(records.reduce<Record<string, typeof records>>((groups, record) => {
    (groups[record.currencyCode] ??= []).push(record);
    return groups;
  }, {})).flatMap(([currency, recordsInCurrency]) => recordsInCurrency
    .sort((a, b) => b.invoicePreTaxAmount - a.invoicePreTaxAmount || b.workOrders - a.workOrders)
    .map((record, index) => ({ ...record, currency, currencyRank: index + 1 })));

  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}>
            Franchise Network
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: FOREST }}>
            Network Overview
          </h1>
          <div className="text-sm" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
            {FRANCHISE_LOCATIONS.length} locations tracked · {FRANCHISE_LOCATIONS.filter(f => f.status === "active").length} with active dashboards
          </div>
          <div className="mt-3" style={{ borderTop: `2px solid ${SAGE_GREEN}`, width: "48px" }} />
        </div>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} style={{ color: SAGE_GREEN }} />
            <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: SAGE_GREEN, fontFamily: "Inter, sans-serif" }}>
              Active Workbook Territory Summary by Currency
            </h2>
          </div>

          {isLoading ? (
            <div className="rounded-sm border p-5 text-sm" style={{ borderColor: MIST, color: "oklch(0.52 0.016 80)" }}>Loading active workbook aggregates…</div>
          ) : isError || workbook?.source !== "salesforce_drive_workbook" ? (
            <div className="rounded-sm border p-5 text-sm" style={{ borderColor: MIST, color: "oklch(0.52 0.016 80)" }}>
              Active Google Drive workbook aggregates are unavailable. No static sales ranking is shown.
            </div>
          ) : (
            <>
              <div className="rounded-sm border p-4 mb-4 text-sm" style={{ borderColor: MIST, background: "oklch(0.975 0.008 80)", color: "oklch(0.40 0.015 65)" }}>
                <strong style={{ color: FOREST }}>Source:</strong> Approved Google Drive workbook · active snapshot <strong>{workbook.activeRun.status}</strong>. Values are accepted work-order aggregates from the active snapshot, not Salesforce API data and not a trailing-12-month revenue claim. {workbook.activeRun.status === "partial" ? `${workbook.activeRun.rowsRejected.toLocaleString()} source rows were explicitly excluded from canonical territory aggregates.` : ""}
              </div>
              <div className="rounded-sm border overflow-hidden" style={{ borderColor: MIST }}>
                <table className="w-full" style={{ fontFamily: "Inter, sans-serif" }}>
                  <thead>
                    <tr style={{ background: FOREST }}>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: MIST }}>Rank</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: MIST }}>Territory</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: MIST }}>Region</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: MIST }}>Work Orders</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: MIST }}>Invoice Rows</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: MIST }}>Recorded Invoice Value (Pre-Tax)</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rankedMarkets.map(({ location, currency, currencyRank, workOrders, invoiceValueRows, invoicePreTaxAmount }, index) => (
                      <tr key={`${location.id}-${currency}`} style={{ background: index % 2 === 0 ? "oklch(1 0 0)" : "oklch(0.985 0.004 80)", borderTop: `1px solid ${MIST}` }}>
                        <td className="px-4 py-3"><span className="text-sm font-bold" style={{ color: currencyRank === 1 ? GOLD : currencyRank <= 3 ? SAGE_GREEN : "oklch(0.52 0.016 80)", fontFamily: "'Playfair Display', Georgia, serif" }}>#{currencyRank} {currency}</span></td>
                        <td className="px-4 py-3"><span className="text-sm font-semibold" style={{ color: FOREST }}>{location.name}</span></td>
                        <td className="px-4 py-3 text-sm" style={{ color: "oklch(0.40 0.015 65)" }}>{location.region}</td>
                        <td className="px-4 py-3 text-sm text-right" style={{ color: "oklch(0.40 0.015 65)" }}>{workOrders.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right" style={{ color: "oklch(0.40 0.015 65)" }}>{invoiceValueRows.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold" style={{ color: SAGE_GREEN }}>{formatRecordedInvoiceValue(invoicePreTaxAmount, currency)}</td>
                        <td className="px-4 py-3 text-right"><Link href={`/location/${location.id}`} className="text-xs font-semibold flex items-center gap-1 justify-end transition-opacity hover:opacity-70" style={{ color: SAGE_GREEN }}>View <ArrowUpRight size={11} /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
                Rankings restart for each verified currency. CAD and USD are never compared. Inspection, closed-job, and conversion metrics remain unavailable pending an approved status definition.
              </p>
            </>
          )}
        </section>

        {REGIONS.map(region => {
          const locations = FRANCHISE_LOCATIONS.filter(location => location.region === region);
          return (
            <section key={region} className="mb-8">
              <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}>{region}</h2>
              <div className="rounded-sm border overflow-hidden" style={{ borderColor: MIST }}>
                <table className="w-full" style={{ fontFamily: "Inter, sans-serif" }}>
                  <thead><tr style={{ background: "oklch(0.94 0.008 80)" }}><th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>Location</th><th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>City</th><th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>Country</th><th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.52 0.016 80)" }}>Status</th><th className="px-4 py-2.5" /></tr></thead>
                  <tbody>{locations.map((location, index) => <tr key={location.id} style={{ background: index % 2 === 0 ? "oklch(1 0 0)" : "oklch(0.985 0.004 80)", borderTop: `1px solid ${MIST}` }}><td className="px-4 py-3"><span className="text-sm font-semibold" style={{ color: FOREST }}>{location.name}</span></td><td className="px-4 py-3 text-sm" style={{ color: "oklch(0.40 0.015 65)" }}>{location.city}</td><td className="px-4 py-3 text-sm" style={{ color: "oklch(0.40 0.015 65)" }}>{location.country}</td><td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-sm" style={location.status === "active" ? { background: "oklch(0.92 0.06 145)", color: "oklch(0.28 0.09 145)" } : { background: "oklch(0.94 0.008 80)", color: "oklch(0.52 0.016 80)" }}>{location.status === "active" ? "Active" : "Awaiting Data"}</span></td><td className="px-4 py-3 text-right"><Link href={`/location/${location.id}`} className="text-xs font-semibold flex items-center gap-1 justify-end transition-opacity hover:opacity-70" style={{ color: SAGE_GREEN }}>View <ArrowUpRight size={11} /></Link></td></tr>)}</tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </PortalLayout>
  );
}
