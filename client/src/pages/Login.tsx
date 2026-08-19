// Skedaddle portal sign-in: warm neutral surface with official logo and green action accent

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6F3EC" }}>
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <img
            src="/manus-storage/skedaddle_logo_rgba_9fad4199.png"
            alt="Skedaddle Humane Wildlife Control"
            className="w-40 h-auto mx-auto mb-4"
            style={{ mixBlendMode: "multiply" }}
          />
          <h1
            className="text-sm font-semibold tracking-[0.22em] uppercase"
            style={{ color: "#34394D", fontFamily: "Inter, sans-serif" }}
          >
            Franchise Portal
          </h1>
        </div>

        <div
          className="rounded-md p-8"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E1DED6",
            boxShadow: "0 18px 48px rgb(52 57 77 / 0.12)",
          }}
        >
          <div
            className="text-xs font-semibold tracking-widest uppercase mb-6 pb-3"
            style={{
              color: "#69BE28",
              fontFamily: "Inter, sans-serif",
              borderBottom: "2px solid #69BE28",
            }}
          >
            Sign In
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#34394D", fontFamily: "Inter, sans-serif" }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-sm border transition-colors focus:outline-none"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E1DED6",
                  color: "#34394D",
                  fontFamily: "Inter, sans-serif",
                }}
                onFocus={(event) => (event.target.style.borderColor = "#69BE28")}
                onBlur={(event) => (event.target.style.borderColor = "#E1DED6")}
                placeholder="e.g. milwaukee"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#34394D", fontFamily: "Inter, sans-serif" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-sm border transition-colors focus:outline-none"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E1DED6",
                  color: "#34394D",
                  fontFamily: "Inter, sans-serif",
                }}
                onFocus={(event) => (event.target.style.borderColor = "#69BE28")}
                onBlur={(event) => (event.target.style.borderColor = "#E1DED6")}
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
                background: loading ? "#4F8D1E" : "#69BE28",
                color: "#FFFFFF",
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
          style={{ color: "#6B7180", fontFamily: "Inter, sans-serif" }}
        >
          Access is restricted to authorised franchise owners and Skedaddle staff.
        </p>
      </div>
    </div>
  );
}
