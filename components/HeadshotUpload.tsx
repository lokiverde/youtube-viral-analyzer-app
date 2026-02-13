"use client";

import { useState, useRef, useEffect } from "react";

interface HeadshotUploadProps {
  headshotUrl: string | null;
  onHeadshotChange: (url: string | null) => void;
}

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const STORAGE_KEY = "yva_headshot_url";

export default function HeadshotUpload({
  headshotUrl,
  onHeadshotChange,
}: HeadshotUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && !headshotUrl) {
      onHeadshotChange(saved);
      setPreviewSrc(saved);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("File exceeds 4MB limit");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Must be an image file (PNG recommended for transparent background)");
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64 for preview
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      setPreviewSrc(base64);

      // Upload to Bunny CDN via our API
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-headshot", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        // If upload fails, keep base64 as fallback
        setError(data.error || "Upload failed, using local preview");
        onHeadshotChange(base64);
        localStorage.setItem(STORAGE_KEY, base64);
        return;
      }

      onHeadshotChange(data.url);
      localStorage.setItem(STORAGE_KEY, data.url);
    } catch {
      setError("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    onHeadshotChange(null);
    setPreviewSrc(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium" style={{ color: "var(--text-label)" }}>
        Headshot (optional)
      </label>

      {previewSrc || headshotUrl ? (
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-input)",
            }}
          >
            <img
              src={previewSrc || headshotUrl || ""}
              alt="Headshot"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
              Headshot uploaded
            </p>
            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              Will be composited onto generated thumbnails when toggled on
            </p>
            <button
              onClick={handleClear}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={{
                background: "var(--red-muted)",
                color: "var(--red)",
                border: "1px solid var(--red)",
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-2.5 rounded-lg text-xs transition-colors border-dashed disabled:opacity-50"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-muted)",
              border: "1.5px dashed var(--border)",
            }}
          >
            {isUploading ? "Uploading..." : "+ Upload headshot (PNG with transparent background)"}
          </button>
        </div>
      )}

      {error && (
        <p className="text-[10px]" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
