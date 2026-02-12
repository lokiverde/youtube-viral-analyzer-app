import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "yva_session";

const publicRoutes = ["/login", "/api/auth"];

// HMAC-SHA256 using Web Crypto API (Edge Runtime compatible)
async function hmacSHA256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySessionToken(token: string): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [nonce, signature] = parts;
  if (!nonce || !signature) return false;

  // Derive secret: HMAC(password, "yva-session-secret")
  const secret = await hmacSHA256(password, "yva-session-secret");
  // Verify: HMAC(secret, nonce) === signature
  const expected = await hmacSHA256(secret, nonce);

  return signature === expected;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME);

  if (!session?.value || !(await verifySessionToken(session.value))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
