import { DASHBOARD_DATA } from "./dashboardData";

export interface ActionItem {
  id: string;
  week: string;
  category: "SEO" | "GBP" | "Content" | "Conversion" | "Data";
  task: string;
  impact: "High" | "Medium" | "Low";
}

function buildActionPlan(territoryId: string): ActionItem[] {
  const data = DASHBOARD_DATA[territoryId];
  if (!data) return [];

  const topSpecies = data.species.slice(0, 3).map(item => item.species);
  const topSuburbs = data.suburbs.slice(0, 5).map(item => item.suburb);
  const primarySpecies = topSpecies[0] || "priority wildlife";
  const primarySuburb = topSuburbs[0] || data.name;
  const secondarySuburbs = topSuburbs.slice(1, 3);

  return [
    {
      id: `${territoryId}-m1-data`, week: "Month 1", category: "Data", impact: "High",
      task: `Review the latest Analytics comparison for ${data.name}; record the actual GA4 and GBP year-over-year changes before choosing campaign targets.`,
    },
    {
      id: `${territoryId}-m1-content`, week: "Month 1", category: "Content", impact: "High",
      task: `Audit the existing ${primarySpecies.toLowerCase()} and ${primarySuburb} pages. Use the verified T12 demand data as prioritization context, not as evidence of page performance.`,
    },
    {
      id: `${territoryId}-m1-gbp`, week: "Month 1", category: "GBP", impact: "Medium",
      task: `Confirm the approved monthly GBP volume, then schedule locally relevant ${primarySpecies.toLowerCase()} posts for ${primarySuburb}.`,
    },
    {
      id: `${territoryId}-m2-pages`, week: "Month 2", category: "Content", impact: "High",
      task: `Validate page coverage for ${secondarySuburbs.join(" and ") || primarySuburb}; create or improve pages only after confirming the current URLs and local business facts.`,
    },
    {
      id: `${territoryId}-m2-conversion`, week: "Month 2", category: "Conversion", impact: "Medium",
      task: "Review calls-to-action and booking paths on the top-priority species and suburb pages; track inquiries separately from closed-job revenue.",
    },
    {
      id: `${territoryId}-m2-review`, week: "Month 2", category: "GBP", impact: "Medium",
      task: `Run a GBP profile and review-response audit for ${data.name}; assign owners and due dates for every confirmed gap.`,
    },
    {
      id: `${territoryId}-m3-measure`, week: "Month 3", category: "Data", impact: "High",
      task: "Compare GA4 sessions and GBP interactions against the same month last year, then document which changes have enough data to keep, revise, or stop.",
    },
    {
      id: `${territoryId}-m3-next`, week: "Month 3", category: "SEO", impact: "Medium",
      task: `Set next-quarter priorities from measured results and the current T12 demand ranking: ${topSpecies.join(", ")} across ${topSuburbs.slice(0, 3).join(", ")}.`,
    },
  ];
}

/** Generated from the same territory snapshot as the dashboard; no stale KPI
 * figures or unverified page-status claims are embedded in these plans. */
export const ACTION_PLANS: Record<string, ActionItem[]> = Object.fromEntries(
  Object.keys(DASHBOARD_DATA).map(territoryId => [territoryId, buildActionPlan(territoryId)]),
);
