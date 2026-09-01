import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { analyticsRouter } from "./analyticsRouter";
import { proposalRouter } from "./proposalRouter";
import { strategyReportRouter } from "./strategyReportRouter";

const localAdminContext = {
  user: null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} satisfies TrpcContext;

describe("custom local authentication compatibility", () => {
  it("keeps strategy report discovery available without a Manus OAuth session", async () => {
    const territories = await strategyReportRouter.createCaller(localAdminContext).getTerritories();
    expect(territories.length).toBeGreaterThan(0);
  });

  it("keeps proposal discovery available without a Manus OAuth session", async () => {
    const territories = await proposalRouter.createCaller(localAdminContext).getTerritories();
    expect(territories.length).toBeGreaterThan(0);
  });

  it("keeps analytics discovery available without a Manus OAuth session", async () => {
    const result = await analyticsRouter.createCaller(localAdminContext).getTerritories();
    expect(result.territories.length).toBeGreaterThan(0);
  });

  it("keeps GBP readiness visible without a Manus OAuth session and without claiming live data", async () => {
    const result = await analyticsRouter.createCaller(localAdminContext).getGBPIntegrationStatus();
    expect(result.liveDataActive).toBe(false);
    expect(result.approval.status).toBe("pending_google_allowlist_review");
    expect(result.mapping.totalCandidates).toBe(32);
    expect(result.oauthClientConfigured).toBe(true);
    expect(result.oauthRefreshAuthorizationConfigured).toBe(false);
  });
});
