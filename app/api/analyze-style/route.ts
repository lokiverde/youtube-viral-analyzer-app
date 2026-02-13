import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import OpenAI from "openai";
import { buildStyleAnalysisPrompt } from "@/lib/thumbnail-prompts";

export const maxDuration = 60;

const SESSION_COOKIE_NAME = "yva_session";

// Rate limiting: max 5 requests per minute per IP
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 5;
const rateLimiter = new Map<string, { count: number; windowStart: number }>();

function verifySessionToken(token: string): boolean {
  const secret = createHmac("sha256", process.env.APP_PASSWORD || "fallback")
    .update("yva-session-secret")
    .digest("hex");

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [nonce, signature] = parts;
  if (!nonce || !signature) return false;

  const expected = createHmac("sha256", secret).update(nonce).digest("hex");
  return signature === expected;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now - record.windowStart > RATE_WINDOW) {
    rateLimiter.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_MAX) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session?.value || !verifySessionToken(session.value)) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "AI service not configured" },
      { status: 500 }
    );
  }

  // Rate limit
  const ip = getClientIP(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { images } = body;

    // Validate: array of base64 strings or URLs, max 5
    if (!Array.isArray(images) || images.length === 0 || images.length > 5) {
      return NextResponse.json(
        { success: false, error: "Provide 1-5 sample images" },
        { status: 400 }
      );
    }

    // Build vision messages with image content
    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] =
      images.map((img: string) => {
        if (img.startsWith("data:")) {
          // Base64 data URL
          return {
            type: "image_url" as const,
            image_url: { url: img, detail: "low" as const },
          };
        }
        // Regular URL
        return {
          type: "image_url" as const,
          image_url: { url: img, detail: "low" as const },
        };
      });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildStyleAnalysisPrompt() },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze these YouTube thumbnail samples and describe the unified visual style:",
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    const styleGuide = completion.choices[0]?.message?.content;
    if (!styleGuide) {
      return NextResponse.json(
        { success: false, error: "No response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      style_guide: styleGuide.trim(),
    });
  } catch (error) {
    console.error("Style analysis error:", error);
    return NextResponse.json(
      { success: false, error: "Style analysis failed. Try again." },
      { status: 500 }
    );
  }
}
