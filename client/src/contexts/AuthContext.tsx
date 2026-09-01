import { trpc } from "@/lib/trpc";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AuthUser {
  username: string;
  role: "admin" | "franchise";
  locationId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const SESSION_KEY = "skedaddle_portal_user";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const candidate = JSON.parse(stored) as AuthUser;
    if (!candidate || typeof candidate.username !== "string" || (candidate.role !== "admin" && candidate.role !== "franchise")) {
      return null;
    }
    if (candidate.role === "franchise" && !candidate.locationId) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const { mutateAsync: authenticate } = trpc.localAuth.login.useMutation();

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authenticate({ username, password });
      if (!result.success) {
        return {
          success: false,
          error: result.reason === "unavailable" ? "Sign-in is temporarily unavailable." : "Invalid username or password.",
        };
      }
      setUser(result.user);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
      return { success: true };
    } catch {
      return { success: false, error: "Sign-in is temporarily unavailable." };
    }
  }, [authenticate]);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SESSION_KEY && !event.newValue) setUser(null);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
