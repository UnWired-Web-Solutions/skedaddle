import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { gbpImageRouter } from "./gbpImageRouter";
import { analyticsRouter } from "./analyticsRouter";
import { proposalRouter } from "./proposalRouter";
import { strategyReportRouter } from "./strategyReportRouter";
import { suburbPageRouter } from "./suburbPageRouter";
import { salesforceWorkbookRouter } from "./salesforceWorkbookRouter";
import { localAuthRouter } from "./localAuthRouter";

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
  proposal: proposalRouter,
  strategyReport: strategyReportRouter,
  suburbPage: suburbPageRouter,
  salesforceWorkbook: salesforceWorkbookRouter,
  localAuth: localAuthRouter,
});

export type AppRouter = typeof appRouter;
