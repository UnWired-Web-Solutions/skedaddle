import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import type { LocalAuthUser } from "../localAuthAccounts";
import { readLocalSessionCookie, resolveLocalSessionUser } from "../localSession";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  portalUser?: LocalAuthUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let portalUser: LocalAuthUser | null = null;

  try {
    const sessionSecret = ENV.localAuthSessionSecret;
    if (Buffer.byteLength(sessionSecret, "utf8") >= 32) {
      portalUser = await resolveLocalSessionUser(
        readLocalSessionCookie(opts.req.headers.cookie),
        sessionSecret,
        ENV.localAuthAccountsJson,
      );
    }
  } catch {
    portalUser = null;
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    portalUser,
  };
}
