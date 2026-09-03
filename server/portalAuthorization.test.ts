import { z } from "zod";
import { describe, expect, it } from "vitest";
import { adminProcedure, portalProcedure, router, territoryProcedure } from "./_core/trpc";

const authorizationTestRouter = router({
  metadata: portalProcedure.query(() => ({ ok: true })),
  adminAction: adminProcedure.mutation(() => ({ ok: true })),
  territoryRead: territoryProcedure
    .input(z.object({ territoryId: z.string().min(1) }))
    .query(({ input }) => ({ territoryId: input.territoryId })),
});

function caller(portalUser: { username: string; role: "admin" | "franchise"; locationId?: string } | null) {
  return authorizationTestRouter.createCaller({ portalUser } as never);
}

describe("server-side portal authorization", () => {
  it("rejects anonymous access to portal data and administrator actions", async () => {
    await expect(caller(null).metadata()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller(null).adminAction()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("permits an administrator to use administrator and territory operations", async () => {
    const admin = caller({ username: "admin", role: "admin" });
    await expect(admin.adminAction()).resolves.toEqual({ ok: true });
    await expect(admin.territoryRead({ territoryId: "ottawa" })).resolves.toEqual({ territoryId: "ottawa" });
  });

  it("limits a franchise account to its own territory and blocks administrator actions", async () => {
    const franchise = caller({ username: "ottawa", role: "franchise", locationId: "ottawa" });
    await expect(franchise.territoryRead({ territoryId: "ottawa" })).resolves.toEqual({ territoryId: "ottawa" });
    await expect(franchise.territoryRead({ territoryId: "hamilton" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(franchise.adminAction()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
