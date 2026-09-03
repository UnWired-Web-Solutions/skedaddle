import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

function caller(portalUser: { username: string; role: "admin" | "franchise"; locationId?: string } | null) {
  return appRouter.createCaller({ portalUser } as never);
}

describe("active portal router authorization", () => {
  it("rejects anonymous access to the active workbook, analytics, reporting, proposal, suburb, and GBP-image operations", async () => {
    const anonymous = caller(null);
    await expect(anonymous.salesforceWorkbook.getStatus()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.analytics.getSummaryKPIs({ territoryId: "ottawa" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.strategyReport.getTerritories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.proposal.getTerritories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.suburbPage.getTerritories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(anonymous.gbpImage.getTerritories()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("prevents a franchise account from reading another territory’s analytics or workbook aggregates", async () => {
    const ottawa = caller({ username: "ottawa", role: "franchise", locationId: "ottawa" });
    await expect(ottawa.analytics.getSummaryKPIs({ territoryId: "hamilton" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ottawa.salesforceWorkbook.getTerritoryPerformance({ territoryId: "hamilton" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(ottawa.salesforceWorkbook.getNetworkPerformance()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permits an administrator to access the protected territory catalog without requiring Manus OAuth", async () => {
    const admin = caller({ username: "admin", role: "admin" });
    await expect(admin.suburbPage.getTerritories()).resolves.toBeInstanceOf(Array);
  });
});
