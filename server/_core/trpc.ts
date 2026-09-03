import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requirePortalUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.portalUser) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, portalUser: ctx.portalUser } });
});

export const portalProcedure = t.procedure.use(requirePortalUser);
export const protectedProcedure = portalProcedure;

export const adminProcedure = portalProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (ctx.portalUser?.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, portalUser: ctx.portalUser } });
  }),
);

export const territoryProcedure = portalProcedure
  .input(z.object({ territoryId: z.string().trim().min(1).max(64) }).passthrough())
  .use(t.middleware(async ({ ctx, input, next }) => {
    const territoryId = (input as { territoryId: string }).territoryId.toLowerCase();
    if (ctx.portalUser?.role === "franchise" && ctx.portalUser.locationId !== territoryId) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, portalUser: ctx.portalUser } });
  }));
