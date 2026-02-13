"use client";

import { useState, useRef } from "react";

interface StyleReferencesProps {
  channel: "techtony" | "huntermason";
  styleGuide: string;
  onStyleGuideChange: (guide: string) => void;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export default function StyleReferences({
  channel,
  styleGuide,
  onStyleGuideChange,
}: StyleReferencesProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);

    const remaining = MAX_IMAGES - images.length;
    if (files.length > remaining) {
      setError(`Can only add ${remaining} more image${remaining === 1 ? "" : "s"}`);
      return;
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds 4MB limit`);
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} is not an image`);
        return;
      }
    }

    // Convert to base64 data URLs
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      setError("Upload at least one sample thumbnail");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Style analysis failed");
        return;
      }

      onStyleGuideChange(data.style_guide);
    } catch {
      setError("Failed to connect to server");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const accentColor = channel === "techtony" ? "#0066FF" : "#C5A572";
  const accentBg =
    channel === "techtony" ? "rgba(0, 102, 255, 0.1)" : "rgba(197, 165, 114, 0.1)";

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-label)" }}>
            Sample Thumbnails ({images.length}/{MAX_IMAGES})
          </label>
          {images.length > 0 && (
            <button
              onClick={() => setImages([])}
              className="text-xs transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden"
                style={{
                  width: "120px",
                  height: "68px",
                  border: "1px solid var(--border)",
                }}
              >
                <img
                  src={img}
                  alt={`Sample ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.7)", color: "white" }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {images.length < MAX_IMAGES && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 rounded-lg text-sm transition-colors border-dashed"
              style={{
                background: accentBg,
                color: accentColor,
                border: `1.5px dashed ${accentColor}40`,
              }}
            >
              + Upload sample thumbnails
            </button>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      {images.length > 0 && (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: accentColor,
            color: "white",
          }}
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
              Analyzing style...
            </span>
          ) : (
            "Analyze Style"
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div
          className="px-3 py-2 rounded-lg text-xs"
          style={{
            background: "var(--red-muted)",
            color: "var(--red)",
            border: "1px solid var(--red)",
          }}
        >
          {error}
        </div>
      )}

      {/* Style Guide Result */}
      {styleGuide && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-label)" }}>
              Style Guide
            </label>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs transition-colors"
              style={{ color: accentColor }}
            >
              {isEditing ? "Done" : "Edit"}
            </button>
          </div>
          {isEditing ? (
            <textarea
              value={styleGuide}
              onChange={(e) => onStyleGuideChange(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-y"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            />
          ) : (
            <div
              className="px-3 py-2 rounded-lg text-xs leading-relaxed"
              style={{
                background: accentBg,
                border: `1px solid ${accentColor}30`,
                color: "var(--text-secondary)",
              }}
            >
              {styleGuide}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
