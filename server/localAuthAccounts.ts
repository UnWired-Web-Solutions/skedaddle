import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export type LocalAuthUser = {
  username: string;
  role: "admin" | "franchise";
  locationId?: string;
  name?: string;
  email?: string;
};

export type LocalAuthAccount = LocalAuthUser & { password: string };

const accountSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
  role: z.enum(["admin", "franchise"]),
  locationId: z.string().trim().min(1).max(64).optional(),
}).superRefine((account, ctx) => {
  if (account.role === "franchise" && !account.locationId) {
    ctx.addIssue({ code: "custom", message: "Franchise accounts require a locationId." });
  }
  if (account.role === "admin" && account.locationId) {
    ctx.addIssue({ code: "custom", message: "Admin accounts must not carry a locationId." });
  }
});

const accountsSchema = z.array(accountSchema).min(1).max(100);

function constantTimeMatch(expected: string, supplied: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");
  if (expectedBytes.length !== suppliedBytes.length) return false;
  return timingSafeEqual(expectedBytes, suppliedBytes);
}

export function parseLocalAuthAccounts(raw: string | undefined): LocalAuthAccount[] {
  if (!raw) throw new Error("Local authentication is not configured.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Local authentication configuration is invalid.");
  }

  const accounts = accountsSchema.parse(parsed).map((account) => ({
    ...account,
    username: account.username.toLowerCase(),
  }));
  const usernames = new Set<string>();
  for (const account of accounts) {
    if (usernames.has(account.username)) {
      throw new Error("Local authentication configuration has duplicate usernames.");
    }
    usernames.add(account.username);
  }
  return accounts;
}

export function findLocalAuthUser(raw: string | undefined, username: string): LocalAuthUser | null {
  const account = parseLocalAuthAccounts(raw).find((candidate) => candidate.username === username.trim().toLowerCase());
  if (!account) return null;
  return account.role === "admin"
    ? { username: account.username, role: "admin" }
    : { username: account.username, role: "franchise", locationId: account.locationId };
}

export function authenticateLocalAccount(
  raw: string | undefined,
  username: string,
  password: string,
): LocalAuthUser | null {
  const normalizedUsername = username.trim().toLowerCase();
  const account = parseLocalAuthAccounts(raw).find((candidate) => candidate.username === normalizedUsername);
  if (!account || !constantTimeMatch(account.password, password)) return null;
  return account.role === "admin"
    ? { username: account.username, role: "admin" }
    : { username: account.username, role: "franchise", locationId: account.locationId };
}
