"use client";

import { useState } from "react";

interface ThumbnailConcept {
  concept: string;
  text_overlay: string;
  emotion: string;
  recommended: boolean;
}

interface GeneratedThumbnail {
  url: string;
  prompt_used: string;
  text_overlay: string;
}

interface ThumbnailGeneratorProps {
  concept: ThumbnailConcept;
  channel: "techtony" | "huntermason";
  styleGuide: string;
  headshotUrl: string | null;
  videoTitle?: string;
}

export default function ThumbnailGenerator({
  concept,
  channel,
  styleGuide,
  headshotUrl,
  videoTitle,
}: ThumbnailGeneratorProps) {
  const [thumbnail, setThumbnail] = useState<GeneratedThumbnail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [useHeadshot, setUseHeadshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const accentColor = channel === "techtony" ? "#0066FF" : "#C5A572";
  const accentBg =
    channel === "techtony" ? "rgba(0, 102, 255, 0.15)" : "rgba(27, 54, 93, 0.2)";

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: concept.concept,
          text_overlay: concept.text_overlay,
          emotion: concept.emotion,
          channel,
          style_guide: styleGuide || undefined,
          headshot_url: useHeadshot && headshotUrl ? headshotUrl : undefined,
          video_title: videoTitle,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Generation failed");
        return;
      }

      setThumbnail({
        url: data.url,
        prompt_used: data.prompt_used,
        text_overlay: data.text_overlay,
      });
    } catch {
      setError("Failed to connect to server");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!thumbnail?.url) return;

    try {
      const response = await fetch(thumbnail.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thumbnail-${channel}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(thumbnail.url, "_blank");
    }
  };

  return (
    <div
      className="rounded-xl p-4 relative"
      style={{
        background: "var(--bg-input)",
        border: `1px solid ${concept.recommended ? "var(--green)" : "var(--border)"}`,
      }}
    >
      {/* Recommended Badge */}
      {concept.recommended && (
        <span
          className="absolute -top-2 right-3 text-[10px] font-semibold px-2 py-0.5 rounded"
          style={{ background: "var(--green)", color: "white" }}
        >
          Recommended
        </span>
      )}

      {/* Concept Description */}
      <div className="text-sm mb-3" style={{ color: "var(--text-primary)" }}>
        {concept.concept}
      </div>

      {/* Text Overlay & Emotion */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="px-2 py-0.5 rounded text-xs font-bold tracking-wide"
          style={{ background: accentBg, color: accentColor }}
        >
          {concept.text_overlay}
        </span>
      </div>
      <div className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Emotion: {concept.emotion}
      </div>

      {/* Headshot Toggle */}
      {headshotUrl && (
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useHeadshot}
            onChange={(e) => setUseHeadshot(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-current"
            style={{ accentColor }}
          />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Include headshot
          </span>
        </label>
      )}

      {/* Generated Thumbnail Display */}
      {thumbnail && (
        <div className="mb-3 space-y-2">
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <img
              src={thumbnail.url}
              alt="Generated thumbnail"
              className="w-full h-auto"
              style={{ aspectRatio: "16/9", objectFit: "cover" }}
            />
          </div>

          {/* Text Overlay Badge */}
          {thumbnail.text_overlay && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                background: accentBg,
                border: `1px solid ${accentColor}30`,
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Add this text:</span>
              <span className="font-bold" style={{ color: accentColor }}>
                {thumbnail.text_overlay}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {isGenerating ? "Generating..." : "Regenerate"}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: accentColor,
                color: "white",
              }}
            >
              Download
            </button>
          </div>

          {/* Show Prompt Toggle */}
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-[10px] transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            {showPrompt ? "Hide prompt" : "Show DALL-E prompt"}
          </button>
          {showPrompt && (
            <pre
              className="text-[10px] leading-relaxed p-2 rounded-lg overflow-x-auto max-h-32 overflow-y-auto"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {thumbnail.prompt_used}
            </pre>
          )}
        </div>
      )}

      {/* Generate Button (when no thumbnail yet) */}
      {!thumbnail && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-2.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          style={{
            background: isGenerating ? "var(--bg-tertiary)" : accentColor,
            color: isGenerating ? "var(--text-secondary)" : "white",
            border: isGenerating ? "1px solid var(--border)" : "none",
          }}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating (~20s)...
            </span>
          ) : (
            "Generate Thumbnail"
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 text-xs" style={{ color: "var(--red)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
