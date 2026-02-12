"use client";

import { useState, useEffect } from "react";

type Theme = "auto" | "light" | "dark";

const ICONS: Record<Theme, string> = { auto: "\u25D1", light: "\u2600", dark: "\u263E" };
const LABELS: Record<Theme, string> = { auto: "Auto", light: "Light", dark: "Dark" };
const CYCLE: Theme[] = ["auto", "light", "dark"];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "auto") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.removeAttribute("data-theme");
    if (!prefersDark) {
      root.setAttribute("data-theme", "light");
    }
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && CYCLE.includes(stored)) {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (theme !== "auto") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const cycle = () => {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  };

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors"
      style={{
        background: "var(--bg-tertiary)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
      }}
      title={`Theme: ${LABELS[theme]}`}
      aria-label={`Switch theme, current: ${LABELS[theme]}`}
    >
      <span className="text-sm">{ICONS[theme]}</span>
      <span>{LABELS[theme]}</span>
    </button>
  );
}
