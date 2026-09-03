import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { analyticsRouter } from "./analyticsRouter";
import { proposalRouter } from "./proposalRouter";
import { strategyReportRouter } from "./strategyReportRouter";

const anonymousContext = {
  user: null,
  portalUser: null,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} satisfies TrpcContext;

const localAdminContext = {
  ...anonymousContext,
  portalUser: { username: "admin", role: "admin" as const, locationId: null },
} satisfies TrpcContext;

describe("server-backed local authentication compatibility", () => {
  it("rejects sensitive discovery without a validated local session", async () => {
    await expect(strategyReportRouter.createCaller(anonymousContext).getTerritories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(proposalRouter.createCaller(anonymousContext).getTerritories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(analyticsRouter.createCaller(anonymousContext).getTerritories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows an administrator session to access strategy, proposal, analytics, and GBP readiness without Manus OAuth", async () => {
    const [strategyTerritories, proposalTerritories, analyticsTerritories, gbp] = await Promise.all([
      strategyReportRouter.createCaller(localAdminContext).getTerritories(),
      proposalRouter.createCaller(localAdminContext).getTerritories(),
      analyticsRouter.createCaller(localAdminContext).getTerritories(),
      analyticsRouter.createCaller(localAdminContext).getGBPIntegrationStatus(),
    ]);
    expect(strategyTerritories.length).toBeGreaterThan(0);
    expect(proposalTerritories.length).toBeGreaterThan(0);
    expect(analyticsTerritories.territories.length).toBeGreaterThan(0);
    expect(gbp.liveDataActive).toBe(false);
    expect(gbp.approval.status).toBe("pending_google_allowlist_review");
  });
});
