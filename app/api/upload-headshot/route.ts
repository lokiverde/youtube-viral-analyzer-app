import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

export const maxDuration = 30;

const SESSION_COOKIE_NAME = "yva_session";
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

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

  const storageZone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const accessKey = process.env.BUNNY_ACCESS_KEY?.trim();
  const cdnHost = process.env.BUNNY_CDN_HOST?.trim();

  if (!storageZone || !accessKey || !cdnHost) {
    return NextResponse.json(
      { success: false, error: "CDN storage not configured" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File exceeds 4MB limit" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Must be an image file" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.type === "image/png" ? "png" : "webp";
    const filename = `headshot-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const uploadUrl = `https://la.storage.bunnycdn.com/${storageZone}/${filename}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: accessKey,
        "Content-Type": file.type,
      },
      body: new Uint8Array(buffer),
    });

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { success: false, error: "CDN upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: `https://${cdnHost}/${filename}`,
    });
  } catch (error) {
    console.error("Headshot upload error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
