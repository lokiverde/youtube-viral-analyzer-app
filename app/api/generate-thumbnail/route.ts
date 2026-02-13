import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import OpenAI from "openai";
import sharp from "sharp";
import { getChannel } from "@/lib/channels";
import { buildDallePrompt, buildPromptCrafterSystem } from "@/lib/thumbnail-prompts";

export const maxDuration = 60;

const SESSION_COOKIE_NAME = "yva_session";
const YOUTUBE_WIDTH = 1280;
const YOUTUBE_HEIGHT = 720;

// Rate limiting: max 10 requests per minute per IP
const RATE_WINDOW = 60 * 1000;
const RATE_MAX = 10;
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

async function uploadToBunnyCDN(imageBuffer: Buffer, filename: string): Promise<string> {
  const storageZone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const accessKey = process.env.BUNNY_ACCESS_KEY?.trim();
  const cdnHost = process.env.BUNNY_CDN_HOST?.trim();

  if (!storageZone || !accessKey || !cdnHost) {
    throw new Error("Bunny CDN not configured");
  }

  const uploadUrl = `https://la.storage.bunnycdn.com/${storageZone}/${filename}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      AccessKey: accessKey,
      "Content-Type": "image/png",
    },
    body: new Uint8Array(imageBuffer),
  });

  if (!response.ok) {
    throw new Error(`Bunny CDN upload failed: ${response.status}`);
  }

  return `https://${cdnHost}/${filename}`;
}

async function compositeHeadshot(
  baseImage: Uint8Array | Buffer,
  headshotUrl: string
): Promise<Buffer> {
  // Download headshot
  const headshotResponse = await fetch(headshotUrl);
  if (!headshotResponse.ok) {
    throw new Error("Failed to download headshot");
  }
  const headshotBuffer = new Uint8Array(await headshotResponse.arrayBuffer());

  // Resize headshot to ~30% of image width
  const headshotWidth = Math.round(YOUTUBE_WIDTH * 0.3);
  const resizedHeadshot = await sharp(headshotBuffer)
    .resize(headshotWidth, null, { fit: "inside" })
    .toBuffer();

  // Get headshot dimensions after resize
  const headshotMeta = await sharp(resizedHeadshot).metadata();
  const hHeight = headshotMeta.height || headshotWidth;

  // Position in the right third, vertically centered
  const left = Math.round(YOUTUBE_WIDTH * 0.65);
  const top = Math.round((YOUTUBE_HEIGHT - hHeight) / 2);

  return sharp(baseImage)
    .composite([
      {
        input: resizedHeadshot,
        left: Math.max(0, left),
        top: Math.max(0, top),
      },
    ])
    .toBuffer();
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
    const {
      concept,
      text_overlay,
      emotion,
      channel: channelId,
      style_guide,
      headshot_url,
      video_title,
    } = body;

    // Validate required fields
    if (!concept || typeof concept !== "string") {
      return NextResponse.json(
        { success: false, error: "Concept is required" },
        { status: 400 }
      );
    }

    if (!channelId || typeof channelId !== "string") {
      return NextResponse.json(
        { success: false, error: "Channel is required" },
        { status: 400 }
      );
    }

    const channel = getChannel(channelId);
    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Unknown channel" },
        { status: 400 }
      );
    }

    const overlay = typeof text_overlay === "string" ? text_overlay : "";
    const includeHeadshot = !!headshot_url;

    // Step 1: Use GPT-4o to craft an optimized DALL-E prompt
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const baseDallePrompt = buildDallePrompt(
      concept,
      channel,
      typeof style_guide === "string" ? style_guide : null,
      overlay,
      includeHeadshot
    );

    const promptCrafterResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildPromptCrafterSystem() },
        {
          role: "user",
          content: `Transform this thumbnail concept into an optimized DALL-E 3 prompt:\n\nCONCEPT: ${concept}\nTEXT OVERLAY: "${overlay}"\nEMOTION: ${emotion || "curiosity"}\nCHANNEL: ${channel.name}\n${video_title ? `VIDEO TITLE: ${video_title}` : ""}\n\nBASE PROMPT TO ENHANCE:\n${baseDallePrompt}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const optimizedPrompt =
      promptCrafterResponse.choices[0]?.message?.content || baseDallePrompt;

    // Step 2: Generate image with DALL-E 3
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: optimizedPrompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
      style: "vivid",
    });

    const imageUrl = imageResponse.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "Image generation failed" },
        { status: 500 }
      );
    }

    // Step 3: Download and resize with sharp
    const imageDownload = await fetch(imageUrl);
    if (!imageDownload.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to download generated image" },
        { status: 500 }
      );
    }

    const downloadedBytes = new Uint8Array(await imageDownload.arrayBuffer());

    // Resize to YouTube thumbnail size (1280x720)
    let imageBuffer: Buffer = await sharp(downloadedBytes)
      .resize(YOUTUBE_WIDTH, YOUTUBE_HEIGHT, { fit: "cover" })
      .png()
      .toBuffer();

    // Step 4: Optional headshot compositing
    if (headshot_url && typeof headshot_url === "string") {
      try {
        imageBuffer = await compositeHeadshot(imageBuffer, headshot_url);
      } catch (err) {
        console.error("Headshot compositing failed:", err);
        // Continue without headshot rather than failing entirely
      }
    }

    // Step 5: Upload to Bunny CDN
    const filename = `thumb-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`;

    let finalUrl: string;
    try {
      finalUrl = await uploadToBunnyCDN(imageBuffer, filename);
    } catch (err) {
      console.error("Bunny CDN upload failed:", err);
      // Fallback: return the original DALL-E URL (temporary, expires in ~1hr)
      finalUrl = imageUrl;
    }

    return NextResponse.json({
      success: true,
      url: finalUrl,
      prompt_used: optimizedPrompt,
      text_overlay: overlay,
    });
  } catch (error) {
    console.error("Thumbnail generation error:", error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 400 && error.message?.includes("content_policy")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Image generation was blocked by content policy. Try a different concept.",
          },
          { status: 400 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: "AI rate limit exceeded. Wait a moment and try again.",
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: "Thumbnail generation failed. Try again." },
      { status: 500 }
    );
  }
}
