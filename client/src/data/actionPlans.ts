export interface ActionItem {
  id: string;
  week: string;
  category: "SEO" | "GBP" | "Content" | "Conversion" | "Data";
  task: string;
  impact: "High" | "Medium" | "Low";
}

function buildActionPlan(territoryId: string): ActionItem[] {
  const territoryLabel = territoryId.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

  return [
    {
      id: `${territoryId}-m1-data`, week: "Month 1", category: "Data", impact: "High",
      task: `Review the latest Analytics comparison for ${territoryLabel}; record only matched-period GA4, Search Console, and GBP changes that have eligible source coverage before choosing campaign targets.`,
    },
    {
      id: `${territoryId}-m1-content`, week: "Month 1", category: "Content", impact: "High",
      task: "Audit the current species and local-service pages using direct Analytics and Search Console evidence. Do not use static historical demand rankings as page-performance evidence.",
    },
    {
      id: `${territoryId}-m1-gbp`, week: "Month 1", category: "GBP", impact: "Medium",
      task: "Confirm the available GBP source status and approved monthly volume before scheduling locally relevant posts. Keep unavailable listing data out of targets.",
    },
    {
      id: `${territoryId}-m2-pages`, week: "Month 2", category: "Content", impact: "High",
      task: "Validate coverage for priority local-service pages; create or improve pages only after confirming current URLs, territory scope, and local business facts.",
    },
    {
      id: `${territoryId}-m2-conversion`, week: "Month 2", category: "Conversion", impact: "Medium",
      task: "Review calls-to-action and booking paths on priority pages; track inquiries separately and do not infer closed jobs or a conversion rate without an approved status definition.",
    },
    {
      id: `${territoryId}-m2-review`, week: "Month 2", category: "GBP", impact: "Medium",
      task: `Run a GBP profile and review-response audit for ${territoryLabel}; assign owners and due dates only for confirmed gaps.`,
    },
    {
      id: `${territoryId}-m3-measure`, week: "Month 3", category: "Data", impact: "High",
      task: "Compare GA4 sessions and GBP interactions against the same month last year, then document which changes have enough data to keep, revise, or stop.",
    },
    {
      id: `${territoryId}-m3-next`, week: "Month 3", category: "SEO", impact: "Medium",
      task: "Set next-quarter priorities from matched-period digital evidence and active workbook aggregate context where available. Keep unverified demand, conversion, and locality assumptions out of the plan.",
    },
  ];
}

/** Source-aware action-plan prompts avoid static performance values and require
 * the appropriate dashboard view to establish current scope and coverage. */
export const ACTION_PLANS: Record<string, ActionItem[]> = Object.fromEntries(
  [
    "hamilton", "durham", "ottawa", "minneapolis", "montreal", "milwaukee",
    "london", "madison", "maryland-central", "barrie-north", "co-denver",
    "coquitlam", "atlanta-north", "orangeville", "oh-columbus", "pa-pittsburgh",
    "md-baltimore", "okanagan", "l-windsor",
  ].map(territoryId => [territoryId, buildActionPlan(territoryId)]),
);
