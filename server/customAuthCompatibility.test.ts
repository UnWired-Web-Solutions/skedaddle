import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { analyticsRouter } from "./analyticsRouter";
import { proposalRouter } from "./proposalRouter";
import { strategyReportRouter } from "./strategyReportRouter";

const localAdminContext = {
  user: { username: "admin", role: "admin", authSource: "local" as const },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} satisfies TrpcContext;

describe("custom local authentication compatibility", () => {
  it("keeps strategy report discovery available with a signed local administrator session", async () => {
    const territories = await strategyReportRouter.createCaller(localAdminContext).getTerritories();
    expect(territories.length).toBeGreaterThan(0);
  });

  it("keeps proposal discovery available with a signed local administrator session", async () => {
    const territories = await proposalRouter.createCaller(localAdminContext).getTerritories();
    expect(territories.length).toBeGreaterThan(0);
  });

  it("keeps analytics discovery available with a signed local administrator session", async () => {
    const result = await analyticsRouter.createCaller(localAdminContext).getTerritories();
    expect(result.territories.length).toBeGreaterThan(0);
  });

  it("keeps GBP readiness visible to a signed local administrator without claiming live data", async () => {
    const result = await analyticsRouter.createCaller(localAdminContext).getGBPIntegrationStatus();
    expect(result.liveDataActive).toBe(false);
    expect(result.approval.status).toBe("pending_google_allowlist_review");
    expect(result.mapping.totalCandidates).toBe(32);
    expect(typeof result.oauthClientConfigured).toBe("boolean");
    expect(typeof result.oauthRefreshAuthorizationConfigured).toBe("boolean");
  });

  it("rejects anonymous portal discovery", async () => {
    const anonymousContext = { ...localAdminContext, user: null } satisfies TrpcContext;
    await expect(analyticsRouter.createCaller(anonymousContext).getTerritories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(strategyReportRouter.createCaller(anonymousContext).getTerritories()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits a franchise session to its assigned territory", async () => {
    const franchiseContext = {
      ...localAdminContext,
      user: { username: "hamilton-owner", role: "franchise", locationId: "hamilton", authSource: "local" as const },
    } satisfies TrpcContext;
    const caller = analyticsRouter.createCaller(franchiseContext);
    const ownTerritories = await caller.getTerritories();
    expect(ownTerritories.territories.map((territory) => territory.id)).toEqual(["hamilton"]);
    await expect(caller.getMonthlyTrend({
      territoryId: "milwaukee",
      startYear: 2026,
      endYear: 2026,
      dataSource: "ga4",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
