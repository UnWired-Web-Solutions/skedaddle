import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import type { AuthenticatedUser } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export function isPortalUser(user: AuthenticatedUser): boolean {
  return user.role === "admin" || user.role === "franchise";
}

export function assertTerritoryAccess(user: AuthenticatedUser, territoryId: string | undefined): void {
  if (user.role === "admin") return;
  if (user.role !== "franchise" || !territoryId || user.locationId !== territoryId) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
}

export function portalTerritoryId(user: AuthenticatedUser): string | null {
  return user.role === "franchise" && "locationId" in user ? user.locationId ?? null : null;
}

const requirePortalUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!isPortalUser(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const portalProcedure = t.procedure.use(requirePortalUser);

export const territoryProcedure = portalProcedure.use(
  t.middleware(async opts => {
    if (!opts.ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    const raw = await opts.getRawInput();
    const territoryId = raw && typeof raw === "object" && "territoryId" in raw
      ? (raw as { territoryId?: unknown }).territoryId
      : undefined;
    assertTerritoryAccess(opts.ctx.user, typeof territoryId === "string" ? territoryId : undefined);
    return opts.next({ ctx: opts.ctx });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
