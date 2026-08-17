// Skedaddle Franchise Portal — Login Page
// Field Operations Manual aesthetic: editorial, authority-first, deep forest green

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Slight delay for UX feel
    setTimeout(() => {
      const result = login(username, password);
      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || "Login failed.");
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "oklch(0.20 0.08 140)" }}
    >
      <div className="w-full max-w-md px-6">
        {/* Logo / Brand mark */}
        <div className="text-center mb-10">
          <img
            src="/manus-storage/skedaddle_logo_white_305bb903.png"
            alt="Skedaddle Humane Wildlife Control"
            className="w-44 h-auto mx-auto mb-4"
          />
          <h1
            className="text-lg font-semibold tracking-widest uppercase"
            style={{ color: "oklch(0.65 0.08 80)", fontFamily: "Inter, sans-serif" }}
          >
            Franchise Portal
          </h1>
        </div>

        {/* Login card */}
        <div
          className="rounded-sm p-8"
          style={{
            background: "oklch(0.97 0.012 80)",
            boxShadow: "0 24px 60px oklch(0 0 0 / 0.4)",
          }}
        >
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-6 pb-3"
            style={{
              color: "oklch(0.68 0.20 140)",
              fontFamily: "Inter, sans-serif",
              borderBottom: "2px solid oklch(0.68 0.20 140)",
            }}
          >
            Sign In
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "oklch(0.40 0.015 65)", fontFamily: "Inter, sans-serif" }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-sm border transition-colors focus:outline-none"
                style={{
                  background: "oklch(1 0 0)",
                  border: "1px solid oklch(0.88 0.012 80)",
                  color: "oklch(0.18 0.015 65)",
                  fontFamily: "Inter, sans-serif",
                }}
                onFocus={(e) => (e.target.style.borderColor = "oklch(0.68 0.20 140)")}
                onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.012 80)")}
                placeholder="e.g. milwaukee"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "oklch(0.40 0.015 65)", fontFamily: "Inter, sans-serif" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-sm border transition-colors focus:outline-none"
                style={{
                  background: "oklch(1 0 0)",
                  border: "1px solid oklch(0.88 0.012 80)",
                  color: "oklch(0.18 0.015 65)",
                  fontFamily: "Inter, sans-serif",
                }}
                onFocus={(e) => (e.target.style.borderColor = "oklch(0.68 0.20 140)")}
                onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.012 80)")}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="text-sm px-3 py-2 rounded-sm"
                style={{
                  background: "oklch(0.97 0.04 27)",
                  color: "oklch(0.45 0.20 27)",
                  fontFamily: "Inter, sans-serif",
                  border: "1px solid oklch(0.88 0.08 27)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold rounded-sm transition-all active:scale-[0.98]"
              style={{
                background: loading ? "oklch(0.45 0.07 145)" : "oklch(0.68 0.20 140)",
                color: "oklch(0.98 0 0)",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "oklch(0.55 0.06 80)", fontFamily: "Inter, sans-serif" }}
        >
          Access is restricted to authorised franchise owners and Skedaddle staff.
        </p>
      </div>
    </div>
  );
}
