import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { getChannel } from "@/lib/channels";
import { buildSystemPrompt, buildUserMessage } from "@/lib/prompts";

export const maxDuration = 60;

const SESSION_COOKIE_NAME = "yva_session";
const MAX_TRANSCRIPT_LENGTH = 100_000;

export async function POST(request: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (session?.value !== "authenticated") {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { success: false, error: "OpenAI API key not configured" },
      { status: 500 }
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
        { success: false, error: `Unknown channel: ${channel}` },
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
        { success: false, error: `AI response missing sections: ${missing.join(", ")}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      channel: channel,
      data,
    });
  } catch (error) {
    console.error("Analyze error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI response as JSON" },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
