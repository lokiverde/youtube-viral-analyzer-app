"use client";

import { useState, useRef } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import CopyButton from "@/components/CopyButton";

// Types
interface AnalysisData {
  titles: {
    curiosity_gap: string[];
    how_to: string[];
    negative_warning: string[];
    short_punchy: string;
  };
  description: {
    hook: string;
    story_summary: string;
    key_takeaways: string[];
    seo_keywords: string[];
    cta: string;
    full_text: string;
  };
  thumbnail_concepts: {
    concept: string;
    text_overlay: string;
    emotion: string;
    recommended: boolean;
  }[];
  tags: string[];
  hashtags: string[];
  timeline: {
    timestamp: string;
    title: string;
  }[];
}

type Tab = "titles" | "description" | "thumbnails" | "tags" | "timeline";

const TABS: { id: Tab; label: string }[] = [
  { id: "titles", label: "Titles" },
  { id: "description", label: "Description" },
  { id: "thumbnails", label: "Thumbnails" },
  { id: "tags", label: "Tags" },
  { id: "timeline", label: "Timeline" },
];

export default function HomePage() {
  // Form state
  const [transcript, setTranscript] = useState("");
  const [channel, setChannel] = useState<"techtony" | "huntermason">("techtony");
  const [visualContext, setVisualContext] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  // UI state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("titles");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          channel,
          visual_context: visualContext.trim() || undefined,
          video_duration: videoDuration.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Analysis failed");
        return;
      }

      setResults(data.data);
      setActiveTab("titles");

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewAnalysis = () => {
    setResults(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  };

  const timelineFormatted = results?.timeline
    ?.map((ch) => `${ch.timestamp} ${ch.title}`)
    .join("\n") || "";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 h-[49px] flex items-center justify-between"
        style={{
          background: "var(--bg-header)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">&#127909;</span>
          <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            YouTube Viral Analyzer
          </h1>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
          >
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="px-2.5 py-1 rounded-md text-xs transition-colors"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Generating Banner */}
      {isAnalyzing && (
        <div className="generating-banner">
          <div className="generating-banner-bar" />
          <div className="generating-banner-content">
            <span className="animate-pulse-dot">&#9679;</span>
            Analyzing transcript with AI...
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[900px] mx-auto px-4 py-8">
        {/* Form Section */}
        <div
          className="rounded-2xl p-6 animate-fade-in"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Channel Toggle */}
          <div className="mb-5">
            <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-label)" }}>
              Channel
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setChannel("techtony")}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: channel === "techtony" ? "rgba(0, 102, 255, 0.15)" : "var(--bg-tertiary)",
                  color: channel === "techtony" ? "#0066FF" : "var(--text-secondary)",
                  border: `1px solid ${channel === "techtony" ? "rgba(0, 102, 255, 0.4)" : "var(--border)"}`,
                }}
              >
                TechTony
              </button>
              <button
                onClick={() => setChannel("huntermason")}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: channel === "huntermason" ? "rgba(27, 54, 93, 0.2)" : "var(--bg-tertiary)",
                  color: channel === "huntermason" ? "#C5A572" : "var(--text-secondary)",
                  border: `1px solid ${channel === "huntermason" ? "rgba(197, 165, 114, 0.4)" : "var(--border)"}`,
                }}
              >
                HunterMason
              </button>
            </div>
          </div>

          {/* Transcript Input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-label)" }}>
                Video Transcript
              </label>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {wordCount.toLocaleString()} words &middot; {charCount.toLocaleString()} chars
              </span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your video transcript here..."
              rows={12}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-y"
              style={{ minHeight: "200px" }}
              disabled={isAnalyzing}
            />
          </div>

          {/* Advanced Options */}
          <div className="mb-5">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                className={`h-3 w-3 transition-transform ${showOptions ? "rotate-90" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Advanced Options
            </button>

            {showOptions && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-label)" }}>
                    Visual Context (optional)
                  </label>
                  <textarea
                    value={visualContext}
                    onChange={(e) => setVisualContext(e.target.value)}
                    placeholder="Describe key visual moments in the video..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-y"
                    disabled={isAnalyzing}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-label)" }}>
                    Video Duration (optional)
                  </label>
                  <input
                    type="text"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    placeholder="e.g., 12:34"
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                    disabled={isAnalyzing}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{
                background: "var(--red-muted)",
                color: "var(--red)",
                border: "1px solid var(--red)",
              }}
            >
              {error}
            </div>
          )}

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !transcript.trim()}
            className="w-full py-3.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: channel === "techtony"
                ? "linear-gradient(135deg, #0066FF, #39FF14)"
                : "linear-gradient(135deg, #1B365D, #C5A572)",
              color: "white",
            }}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing Transcript...
              </span>
            ) : (
              "Analyze Transcript"
            )}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div ref={resultsRef} className="mt-8 animate-fade-in">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Analysis Results
              </h2>
              <button
                onClick={handleNewAnalysis}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                New Analysis
              </button>
            </div>

            {/* Tab Navigation */}
            <div
              className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: activeTab === tab.id ? "var(--accent)" : "transparent",
                    color: activeTab === tab.id ? "white" : "var(--text-secondary)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              {/* TITLES TAB */}
              {activeTab === "titles" && (
                <div className="space-y-6 stagger-children">
                  <TitleGroup
                    label="Curiosity Gap"
                    titles={results.titles.curiosity_gap}
                    color="var(--accent)"
                    onCopy={() => showToast("Title copied")}
                  />
                  <TitleGroup
                    label="How-To / Benefit"
                    titles={results.titles.how_to}
                    color="var(--green)"
                    onCopy={() => showToast("Title copied")}
                  />
                  <TitleGroup
                    label="Negative / Warning"
                    titles={results.titles.negative_warning}
                    color="var(--orange)"
                    onCopy={() => showToast("Title copied")}
                  />
                  <div>
                    <span
                      className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-2"
                      style={{ background: "var(--purple-muted)", color: "var(--purple)" }}
                    >
                      Short &amp; Punchy
                    </span>
                    <TitleCard
                      title={results.titles.short_punchy}
                      onCopy={() => showToast("Title copied")}
                    />
                  </div>
                </div>
              )}

              {/* DESCRIPTION TAB */}
              {activeTab === "description" && (
                <div className="space-y-5">
                  <div className="flex justify-end">
                    <CopyButton text={results.description.full_text} label="Copy Full Description" size="md" />
                  </div>

                  {/* Full assembled description */}
                  <div
                    className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {results.description.full_text}
                  </div>

                  {/* Individual sections */}
                  <div className="space-y-4 pt-2">
                    <DescriptionSection label="Hook (first 2 lines)" content={results.description.hook} />
                    <DescriptionSection label="Story Summary" content={results.description.story_summary} />
                    <div>
                      <h4 className="text-xs font-medium mb-2" style={{ color: "var(--text-label)" }}>
                        Key Takeaways
                      </h4>
                      <ul className="space-y-1.5">
                        {results.description.key_takeaways.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                            <span style={{ color: "var(--green)" }}>&#10003;</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium mb-2" style={{ color: "var(--text-label)" }}>
                        SEO Keywords
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {results.description.seo_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <DescriptionSection label="Call to Action" content={results.description.cta} />
                  </div>
                </div>
              )}

              {/* THUMBNAILS TAB */}
              {activeTab === "thumbnails" && (
                <div className="grid gap-4 md:grid-cols-3">
                  {results.thumbnail_concepts.map((thumb, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 relative"
                      style={{
                        background: "var(--bg-input)",
                        border: `1px solid ${thumb.recommended ? "var(--green)" : "var(--border)"}`,
                      }}
                    >
                      {thumb.recommended && (
                        <span
                          className="absolute -top-2 right-3 text-[10px] font-semibold px-2 py-0.5 rounded"
                          style={{ background: "var(--green)", color: "white" }}
                        >
                          Recommended
                        </span>
                      )}
                      <div className="text-sm mb-3" style={{ color: "var(--text-primary)" }}>
                        {thumb.concept}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold tracking-wide"
                          style={{
                            background: channel === "techtony" ? "rgba(0, 102, 255, 0.15)" : "rgba(27, 54, 93, 0.2)",
                            color: channel === "techtony" ? "#0066FF" : "#C5A572",
                          }}
                        >
                          {thumb.text_overlay}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Emotion: {thumb.emotion}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAGS TAB */}
              {activeTab === "tags" && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-medium" style={{ color: "var(--text-label)" }}>
                        Tags ({results.tags.length})
                      </h4>
                      <CopyButton text={results.tags.join(", ")} label="Copy All" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {results.tags.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                            showToast(`"${tag}" copied`);
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
                          style={{
                            background: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-medium" style={{ color: "var(--text-label)" }}>
                        Hashtags
                      </h4>
                      <CopyButton text={results.hashtags.join(" ")} label="Copy" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {results.hashtags.map((hash, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium"
                          style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                        >
                          {hash}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TIMELINE TAB */}
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <CopyButton text={timelineFormatted} label="Copy for YouTube" size="md" />
                  </div>

                  <div className="space-y-1">
                    {results.timeline.map((ch, i) => (
                      <div
                        key={i}
                        className="flex items-baseline gap-4 py-2 px-3 rounded-lg transition-colors"
                        style={{ background: i % 2 === 0 ? "var(--bg-input)" : "transparent" }}
                      >
                        <span
                          className="text-sm font-mono font-medium min-w-[50px]"
                          style={{ color: "var(--accent)" }}
                        >
                          {ch.timestamp}
                        </span>
                        <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                          {ch.title}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Preview box */}
                  <div className="mt-4">
                    <h4 className="text-xs font-medium mb-2" style={{ color: "var(--text-label)" }}>
                      YouTube Format Preview
                    </h4>
                    <pre
                      className="rounded-xl p-4 text-sm leading-relaxed overflow-x-auto"
                      style={{
                        background: "var(--bg-input)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {timelineFormatted}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}

// ── Sub-components ──

function TitleGroup({
  label,
  titles,
  color,
  onCopy,
}: {
  label: string;
  titles: string[];
  color: string;
  onCopy: () => void;
}) {
  return (
    <div>
      <span
        className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-2"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
      >
        {label}
      </span>
      <div className="space-y-2">
        {titles.map((title, i) => (
          <TitleCard key={i} title={title} onCopy={onCopy} />
        ))}
      </div>
    </div>
  );
}

function TitleCard({ title, onCopy }: { title: string; onCopy: () => void }) {
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(title);
      onCopy();
    } catch {
      // Silently fail
    }
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors group"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
      }}
      title="Click to copy"
    >
      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {title}
      </span>
      <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }}>
        Click to copy
      </span>
    </div>
  );
}

function DescriptionSection({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-medium" style={{ color: "var(--text-label)" }}>{label}</h4>
        <CopyButton text={content} />
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {content}
      </p>
    </div>
  );
}
