import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const APP_PASSWORD = process.env.APP_PASSWORD;
const SESSION_COOKIE_NAME = "yva_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Rate limiting: max 3 attempts per IP, 1 hour lockout
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;
const attempts = new Map<string, { count: number; firstAttempt: number }>();

function getAttemptCount(ip: string): number {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW) {
    return 0;
  }

  return record.count;
}

function recordAttempt(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }

  record.count++;
  return record.count > RATE_LIMIT_MAX;
}

function getDelay(ip: string): number {
  const count = getAttemptCount(ip);
  if (count <= 1) return 0;
  return Math.min(1000 * Math.pow(2, count - 1), 8000);
}

export async function POST(request: NextRequest) {
  if (!APP_PASSWORD) {
    return NextResponse.json(
      { success: false, error: "Authentication not configured" },
      { status: 500 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";

  if (getAttemptCount(ip) >= RATE_LIMIT_MAX) {
    const record = attempts.get(ip);
    if (record && Date.now() - record.firstAttempt < RATE_LIMIT_WINDOW) {
      await new Promise((r) => setTimeout(r, 4000));
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (password === APP_PASSWORD) {
      attempts.delete(ip);

      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    recordAttempt(ip);
    const delay = getDelay(ip);
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);

  return NextResponse.json({
    authenticated: session?.value === "authenticated",
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
