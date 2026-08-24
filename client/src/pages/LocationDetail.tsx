// Skedaddle Franchise Portal — Location Detail Page
// Shows the full strategy dashboard (embedded from Drive)

import PortalLayout from "@/components/PortalLayout";
import { useAuth } from "@/contexts/AuthContext";
import { getLocationById } from "@/data/franchises";
import { BarChart2, CheckSquare, ExternalLink, FileText, MapPin, Square, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { ACTION_PLANS, type ActionItem } from "@/data/actionPlans";

const CATEGORY_COLORS: Record<ActionItem["category"], { bg: string; text: string }> = {
  SEO:        { bg: "oklch(0.92 0.06 259)", text: "oklch(0.30 0.12 259)" },
  GBP:        { bg: "oklch(0.92 0.06 145)", text: "oklch(0.28 0.09 145)" },
  Content:    { bg: "oklch(0.94 0.06 80)",  text: "oklch(0.45 0.10 80)" },
  Conversion: { bg: "oklch(0.94 0.06 27)",  text: "oklch(0.45 0.18 27)" },
  Data:       { bg: "oklch(0.93 0.008 80)", text: "oklch(0.45 0.016 80)" },
};

const IMPACT_COLORS: Record<ActionItem["impact"], string> = {
  High:   "oklch(0.42 0.12 145)",
  Medium: "oklch(0.55 0.10 80)",
  Low:    "oklch(0.65 0.010 80)",
};

function activityLabel(loc: NonNullable<ReturnType<typeof getLocationById>>): string {
  const { sessionsTrend, activityChangePercent } = loc.kpis;
  if (activityChangePercent === null || activityChangePercent === undefined) return "Insufficient data";
  if (sessionsTrend === "up") return `↑ ${Math.abs(activityChangePercent).toFixed(0)}%`;
  if (sessionsTrend === "down") return `↓ ${Math.abs(activityChangePercent).toFixed(0)}%`;
  return "→ Stable";
}



export default function LocationDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const loc = getLocationById(params.id);

  // Redirect if user doesn't have access
  useEffect(() => {
    if (user?.role === "franchise" && user.locationId !== params.id) {
      navigate("/");
    }
  }, [user, params.id, navigate]);

  // Territory-specific action plan state
  const actionPlan = ACTION_PLANS[params.id] || null;
  const storageKey = `skedaddle_actions_${params.id}`;
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const completedCount = actionPlan ? Array.from(checked).filter(id => actionPlan.some(a => a.id === id)).length : 0;
  const totalCount = actionPlan ? actionPlan.length : 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const weeks = actionPlan ? Array.from(new Set(actionPlan.map((a) => a.week))) : [];



  if (!loc) {
    return (
      <PortalLayout>
        <div className="px-6 py-8">
          <p style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
            Location not found.
          </p>
        </div>
      </PortalLayout>
    );
  }



  return (
    <PortalLayout>
      <div className="px-6 py-8 max-w-5xl">
        {/* Page header */}
        <div className="mb-8">
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
          >
            {loc.region} · {loc.country}
          </div>
          <h1
            className="text-3xl font-bold mb-1"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
          >
            {loc.name}
          </h1>
          <div
            className="text-sm"
            style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
          >
            {loc.city}, {loc.state}
            {loc.lastUpdated && ` · Dashboard updated ${new Date(loc.lastUpdated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
          </div>
          <div className="mt-3" style={{ borderTop: "2px solid oklch(0.68 0.20 140)", width: "48px" }} />
        </div>

        {/* Strategy Dashboard section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
            >
              Strategy Dashboard
            </h2>
          </div>

          {loc.status === "active" ? (
            <div
              className="rounded-sm border overflow-hidden"
              style={{ borderColor: "oklch(0.82 0.06 145)", background: "oklch(0.97 0.012 80)" }}
            >
              {/* Dashboard card — links to in-portal dashboard page */}
              <div
                className="px-6 py-5 flex items-center justify-between"
                style={{ background: "oklch(0.22 0.06 145)", borderBottom: "1px solid oklch(0.30 0.08 145)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.68 0.20 140)" }}
                  >
                    <BarChart2 size={16} color="white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "white", fontFamily: "Inter, sans-serif" }}>
                      {loc.name} — Full Strategy Dashboard
                    </div>
                    <div className="text-xs" style={{ color: "oklch(0.75 0.06 145)", fontFamily: "Inter, sans-serif" }}>
                      Revenue · Species · Suburbs · GSC · GBP · Updated July 2026
                    </div>
                  </div>
                </div>
                <Link
                  href={`/dashboard/${loc.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold transition-opacity hover:opacity-80"
                  style={{ background: "oklch(0.55 0.14 145)", color: "white", fontFamily: "Inter, sans-serif", textDecoration: "none" }}
                >
                  Open Dashboard
                </Link>
              </div>

              {/* Dashboard summary */}
              <div className="grid grid-cols-2 gap-0" style={{ borderBottom: "1px solid oklch(0.88 0.012 80)" }}>
                <div className="p-5" style={{ borderRight: "1px solid oklch(0.88 0.012 80)" }}>
                  <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>What's Inside</div>
                  <div className="space-y-2">
                    {[
                      { icon: <TrendingUp size={13} />, label: "Revenue & jobs by species — ranked" },
                      { icon: <MapPin size={13} />, label: "Top 20 suburbs by revenue and job count" },
                      { icon: <BarChart2 size={13} />, label: "Google Search Console — clicks, impressions, position" },
                      { icon: <FileText size={13} />, label: "GBP performance — searches, calls, website clicks" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 flex-shrink-0" style={{ color: "oklch(0.75 0.18 140)" }}>{item.icon}</span>
                        <span className="text-xs" style={{ color: "oklch(0.35 0.015 65)", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>Quick Stats</div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>Top Species</div>
                      <div className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}>{loc.kpis.topSpecies}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>{loc.kpis.activityMetric ?? "Digital activity"}</div>
                      <div className="text-sm font-semibold" style={{ color: loc.kpis.sessionsTrend === "up" ? "oklch(0.75 0.18 140)" : loc.kpis.sessionsTrend === "down" ? "oklch(0.45 0.18 27)" : "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}>
                        {activityLabel(loc)}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: "oklch(0.58 0.012 80)", fontFamily: "Inter, sans-serif" }}>
                        {loc.kpis.activityComparison ?? "No comparison available"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>Dashboard Type</div>
                      <div className="text-sm font-semibold" style={{ color: "oklch(0.18 0.015 65)", fontFamily: "Inter, sans-serif" }}>Live — built into portal</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 flex items-center justify-between flex-wrap gap-3" style={{ background: "oklch(0.97 0.012 80)" }}>
                <span className="text-xs" style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}>
                  Full interactive charts — no external login required
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  {loc.fullReportUrl && (
                    <a
                      href={loc.fullReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 font-semibold transition-opacity hover:opacity-70"
                      style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif", textDecoration: "none" }}
                    >
                      <FileText size={12} /> Full Report
                    </a>
                  )}
                  {loc.combinedReportUrl && (
                    <a
                      href={loc.combinedReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 font-semibold transition-opacity hover:opacity-70"
                      style={{ color: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif", textDecoration: "none" }}
                    >
                      <FileText size={12} /> Combined WI Report
                    </a>
                  )}
                  {(loc.triggerReportUrl || loc.triggerPdfUrl) && (
                    <a
                      href={loc.triggerReportUrl || loc.triggerPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 font-semibold transition-opacity hover:opacity-70"
                      style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif", textDecoration: "none" }}
                    >
                      <ExternalLink size={12} /> Monthly Trigger Brief
                    </a>
                  )}
                  <Link
                    href={`/dashboard/${loc.id}`}
                    className="text-xs flex items-center gap-1 font-semibold transition-opacity hover:opacity-70"
                    style={{ color: "oklch(0.68 0.20 140)", fontFamily: "Inter, sans-serif", textDecoration: "none" }}
                  >
                    View Full Dashboard →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-sm border p-10 text-center"
              style={{ borderColor: "oklch(0.88 0.012 80)", background: "oklch(0.97 0.012 80)" }}
            >
              <div
                className="text-sm mb-2"
                style={{ color: "oklch(0.52 0.016 80)", fontFamily: "Inter, sans-serif" }}
              >
                Dashboard not yet available for this location.
              </div>
              <div
                className="text-xs"
                style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
              >
                A full strategy dashboard will be generated once Salesforce data is received.
                Contact <a href="mailto:dave@skedaddlewildlife.com" style={{ color: "oklch(0.68 0.20 140)" }}>dave@skedaddlewildlife.com</a> to request data collection.
              </div>
            </div>
          )}
        </section>

        {/* Territory-specific 90-Day Action Plan — only shown for territories with a plan */}
        {actionPlan && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.18 0.015 65)" }}
              >
                90-Day Action Plan
              </h2>
              <div
                className="text-xs font-semibold"
                style={{ color: "oklch(0.75 0.18 140)", fontFamily: "Inter, sans-serif" }}
              >
                {completedCount}/{totalCount} complete
              </div>
            </div>

            {/* Progress bar */}
            <div
              className="h-1.5 rounded-full mb-6 overflow-hidden"
              style={{ background: "oklch(0.88 0.012 80)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: "oklch(0.75 0.18 140)" }}
              />
            </div>

            {/* Action items by week */}
            {weeks.map((week) => {
              const items = actionPlan.filter((a) => a.week === week);
              const weekComplete = items.filter((a) => checked.has(a.id)).length;
              return (
                <div key={week} className="mb-6">
                  <div
                    className="text-xs font-semibold tracking-widest uppercase mb-3 pb-2"
                    style={{
                      color: "oklch(0.75 0.18 140)",
                      fontFamily: "Inter, sans-serif",
                      borderBottom: "1px solid oklch(0.88 0.012 80)",
                    }}
                  >
                    {week} · {weekComplete}/{items.length} done
                  </div>
                  <div className="space-y-2">
                    {items.map((action) => {
                      const done = checked.has(action.id);
                      const catColor = CATEGORY_COLORS[action.category];
                      return (
                        <div
                          key={action.id}
                          className="flex items-start gap-3 p-3 rounded-sm border transition-colors cursor-pointer"
                          style={{
                            background: done ? "oklch(0.95 0.04 145)" : "oklch(1 0 0)",
                            borderColor: done ? "oklch(0.82 0.06 145)" : "oklch(0.88 0.012 80)",
                          }}
                          onClick={() => toggleCheck(action.id)}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {done ? (
                              <CheckSquare size={16} style={{ color: "oklch(0.75 0.18 140)" }} />
                            ) : (
                              <Square size={16} style={{ color: "oklch(0.65 0.010 80)" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm"
                              style={{
                                fontFamily: "Inter, sans-serif",
                                color: done ? "oklch(0.75 0.18 140)" : "oklch(0.18 0.015 65)",
                                textDecoration: done ? "line-through" : "none",
                                opacity: done ? 0.75 : 1,
                              }}
                            >
                              {action.task}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-sm"
                              style={{ background: catColor.bg, color: catColor.text, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                            >
                              {action.category}
                            </span>
                            <span
                              className="text-xs font-semibold"
                              style={{ color: IMPACT_COLORS[action.impact], fontFamily: "Inter, sans-serif" }}
                            >
                              {action.impact}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <p
              className="text-xs mt-4"
              style={{ color: "oklch(0.65 0.010 80)", fontFamily: "Inter, sans-serif" }}
            >
              Progress is saved locally in your browser. Check off items as you complete them.
            </p>
          </section>
        )}

      </div>
    </PortalLayout>
  );
}
