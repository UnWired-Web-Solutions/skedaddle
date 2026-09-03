import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";
import {
  readLocalSessionToken,
  verifyLocalSessionToken,
  type LocalSessionUser,
} from "../localAuthSession";

export type AuthenticatedUser = User | LocalSessionUser;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthenticatedUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AuthenticatedUser | null = null;

  const localSessionToken = readLocalSessionToken(opts.req);
  if (localSessionToken) {
    user = await verifyLocalSessionToken(
      localSessionToken,
      ENV.localAuthAccountsJson,
      ENV.localAuthSessionSecret,
    );
  }

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for the deliberately public login and health procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
