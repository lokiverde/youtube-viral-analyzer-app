import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import OpenAI from "openai";
import { getChannel } from "@/lib/channels";
import { buildSystemPrompt, buildUserMessage } from "@/lib/prompts";

export const maxDuration = 60;

const SESSION_COOKIE_NAME = "yva_session";
const MAX_TRANSCRIPT_LENGTH = 100_000;

// Rate limiting: max 10 requests per minute per IP
const ANALYZE_RATE_WINDOW = 60 * 1000; // 1 minute
const ANALYZE_RATE_MAX = 10;
const analyzeAttempts = new Map<string, { count: number; windowStart: number }>();

function verifySessionToken(token: string): boolean {
  const secret = createHmac("sha256", process.env.APP_PASSWORD || "fallback")
    .update("yva-session-secret")
    .digest("hex");

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [nonce, signature] = parts;
  if (!nonce || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(nonce)
    .digest("hex");

  return signature === expected;
}

function getClientIP(request: NextRequest): string {
  return request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

function checkAnalyzeRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = analyzeAttempts.get(ip);

  if (!record || now - record.windowStart > ANALYZE_RATE_WINDOW) {
    analyzeAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= ANALYZE_RATE_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Strip sensitive data from error messages before returning to client
function sanitizeError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    // Never expose API key fragments or internal URLs
    if (error.status === 401) return "AI service authentication failed. Contact admin.";
    if (error.status === 429) return "AI service rate limit exceeded. Try again in a minute.";
    if (error.status === 500) return "AI service temporarily unavailable. Try again.";
    return "AI service error. Try again.";
  }

  if (error instanceof SyntaxError) {
    return "Failed to parse AI response. Try again.";
  }

  // Generic fallback - never pass raw error.message to client
  return "Analysis failed. Try again.";
}

export async function POST(request: NextRequest) {
  // Auth check with signed token verification
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session?.value || !verifySessionToken(session.value)) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Validate API key exists
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "AI service not configured" },
      { status: 500 }
    );
  }

  // Rate limit check
  const ip = getClientIP(request);
  if (!checkAnalyzeRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { transcript, channel, visual_context, video_duration } = body;

    // Validate required fields
    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Transcript is required" },
        { status: 400 }
      );
    }

    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Transcript exceeds ${MAX_TRANSCRIPT_LENGTH.toLocaleString()} character limit` },
        { status: 400 }
      );
    }

    if (!channel || typeof channel !== "string") {
      return NextResponse.json(
        { success: false, error: "Channel is required" },
        { status: 400 }
      );
    }

    const channelConfig = getChannel(channel);
    if (!channelConfig) {
      return NextResponse.json(
        { success: false, error: "Unknown channel" },
        { status: 400 }
      );
    }

    // Validate optional fields are strings if provided
    if (visual_context && typeof visual_context !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid visual context" },
        { status: 400 }
      );
    }

    if (video_duration && typeof video_duration !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid video duration" },
        { status: 400 }
      );
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(channelConfig);
    const userMessage = buildUserMessage(transcript, visual_context, video_duration);

    // Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 8000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse and validate
    const data = JSON.parse(content);

    const required = ["titles", "description", "thumbnail_concepts", "tags", "timeline"];
    const missing = required.filter((k) => !data[k]);
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `AI response incomplete. Missing: ${missing.join(", ")}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      channel: channel,
      data,
    });
  } catch (error) {
    // Log the full error server-side for debugging
    console.error("Analyze error:", error);

    // Return sanitized error to client (never expose internals)
    return NextResponse.json(
      { success: false, error: sanitizeError(error) },
      { status: 500 }
    );
  }
}
