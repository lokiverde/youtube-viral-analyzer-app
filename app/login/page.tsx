"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get("from") || "/";
  const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(from);
        router.refresh();
      } else {
        setError("Invalid credentials");
        setPassword("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: "var(--bg-primary)" }}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[380px] animate-fade-in">
        <div className="text-center mb-8">
          <div className="text-[42px] mb-2">&#127909;</div>
          <h1 className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            YouTube Viral Analyzer
          </h1>
          <p className="text-[14px] font-medium mt-1" style={{ color: "var(--text-secondary)" }}>
            Transcript to Viral Metadata
          </p>
        </div>

        <div
          className="rounded-[20px] p-10"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              className="w-full px-4 py-3.5 rounded-lg text-sm text-center outline-none"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "3px" }}
              required
              autoFocus
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full py-3.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Authenticate"
              )}
            </button>
          </form>

          {error && (
            <p className="text-center text-[13px] mt-3 transition-opacity" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
          <div className="animate-shimmer w-16 h-16 rounded-full" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
