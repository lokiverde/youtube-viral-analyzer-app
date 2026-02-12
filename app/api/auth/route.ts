import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual, randomBytes, createHmac } from "crypto";

const APP_PASSWORD = process.env.APP_PASSWORD;
const SESSION_COOKIE_NAME = "yva_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// HMAC secret for signing session tokens (derived from APP_PASSWORD)
function getSessionSecret(): string {
  return createHmac("sha256", APP_PASSWORD || "fallback")
    .update("yva-session-secret")
    .digest("hex");
}

// Generate a signed session token: random nonce + HMAC signature
function generateSessionToken(): string {
  const nonce = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", getSessionSecret())
    .update(nonce)
    .digest("hex");
  return `${nonce}.${signature}`;
}

// Verify a session token's HMAC signature
function verifySessionToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [nonce, signature] = parts;
  if (!nonce || !signature) return false;

  const expected = createHmac("sha256", getSessionSecret())
    .update(nonce)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// Timing-safe password comparison
function verifyPassword(input: string, expected: string): boolean {
  // Normalize to same length to prevent length-based timing leaks
  const inputBuf = Buffer.from(input.padEnd(256, "\0"));
  const expectedBuf = Buffer.from(expected.padEnd(256, "\0"));
  return inputBuf.length === expectedBuf.length && timingSafeEqual(inputBuf, expectedBuf);
}

// Rate limiting: max 5 attempts per IP, 15 min lockout
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;
const attempts = new Map<string, { count: number; firstAttempt: number }>();

function getClientIP(request: NextRequest): string {
  // x-real-ip is set by Vercel and cannot be spoofed by clients
  return request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

function getAttemptCount(ip: string): number {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW) {
    return 0;
  }

  return record.count;
}

function recordAttempt(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return;
  }

  record.count++;
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

  const ip = getClientIP(request);

  // Check rate limit
  if (getAttemptCount(ip) >= RATE_LIMIT_MAX) {
    const record = attempts.get(ip);
    if (record && Date.now() - record.firstAttempt < RATE_LIMIT_WINDOW) {
      await new Promise((r) => setTimeout(r, 4000));
      return NextResponse.json(
        { success: false, error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (typeof password !== "string" || password.length === 0 || password.length > 256) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (verifyPassword(password, APP_PASSWORD)) {
      // Clear rate limit on success
      attempts.delete(ip);

      const token = generateSessionToken();
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    // Record failed attempt and add exponential delay
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
    authenticated: !!session?.value && verifySessionToken(session.value),
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ success: true });
}

// Export for use in other routes
export { verifySessionToken, SESSION_COOKIE_NAME };
