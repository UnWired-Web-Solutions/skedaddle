import { trpc } from "@/lib/trpc";
import { createContext, useCallback, useContext, useEffect } from "react";

export interface AuthUser {
  username: string;
  role: "admin" | "franchise";
  locationId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const SESSION_KEY = "skedaddle_portal_user";
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const session = trpc.localAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });
  const { mutateAsync: authenticate } = trpc.localAuth.login.useMutation();
  const { mutateAsync: endSession } = trpc.auth.logout.useMutation();
  const user = session.data ?? null;

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authenticate({ username, password });
      if (!result.success) {
        return {
          success: false,
          error: result.reason === "rate_limited"
            ? "Too many sign-in attempts. Please wait 15 minutes and try again."
            : result.reason === "unavailable"
              ? "Sign-in is temporarily unavailable."
              : "Invalid username or password.",
        };
      }
      utils.localAuth.me.setData(undefined, result.user);
      return { success: true };
    } catch {
      return { success: false, error: "Sign-in is temporarily unavailable." };
    }
  }, [authenticate, utils.localAuth.me]);

  const logout = useCallback(async () => {
    try {
      await endSession();
    } finally {
      utils.localAuth.me.setData(undefined, null);
    }
  }, [endSession, utils.localAuth.me]);

  useEffect(() => {
    // Remove the legacy browser-trusted identity. Authentication now comes only
    // from the signed, HTTP-only server session cookie.
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading: session.isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
