import { trpc } from "@/lib/trpc";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AuthUser {
  username: string;
  role: "admin" | "franchise";
  locationId?: string;
  name?: string;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const { mutateAsync: authenticate } = trpc.localAuth.login.useMutation();
  const { mutateAsync: endSession } = trpc.localAuth.logout.useMutation();
  const session = trpc.localAuth.session.useQuery(undefined, { retry: false, refetchOnWindowFocus: true });

  useEffect(() => {
    if (!session.isLoading) setUser(session.data?.user ?? null);
  }, [session.data?.user, session.isLoading]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authenticate({ username, password });
      if (!result.success) {
        return {
          success: false,
          error: result.reason === "rate_limited"
            ? "Too many unsuccessful attempts. Please wait before trying again."
            : result.reason === "unavailable"
              ? "Sign-in is temporarily unavailable."
              : "Invalid username or password.",
        };
      }
      const confirmedSession = await session.refetch();
      if (!confirmedSession.data?.user) return { success: false, error: "Sign-in is temporarily unavailable." };
      setUser(confirmedSession.data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Sign-in is temporarily unavailable." };
    }
  }, [authenticate, session]);

  const logout = useCallback(async () => {
    try {
      await endSession();
    } finally {
      setUser(null);
      await session.refetch();
    }
  }, [endSession, session]);

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading: session.isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
