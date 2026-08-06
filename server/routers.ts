import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { gbpImageRouter } from "./gbpImageRouter";
import { analyticsRouter } from "./analyticsRouter";
import { salesforceRouter } from "./salesforceRouter";
import { proposalRouter } from "./proposalRouter";
import { strategyReportRouter } from "./strategyReportRouter";
import { suburbPageRouter } from "./suburbPageRouter";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  gbpImage: gbpImageRouter,
  analytics: analyticsRouter,
  salesforce: salesforceRouter,
  proposal: proposalRouter,
  strategyReport: strategyReportRouter,
  suburbPage: suburbPageRouter,
});

export type AppRouter = typeof appRouter;
