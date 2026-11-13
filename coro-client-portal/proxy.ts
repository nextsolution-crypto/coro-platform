import { NextRequest, NextResponse } from "next/server";

function apiConnectOrigin(): string {
  try {
    const candidate = new URL(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api",
    );
    return candidate.protocol === "https:" || candidate.protocol === "http:"
      ? candidate.origin
      : "http://localhost:3002";
  } catch {
    return "http://localhost:3002";
  }
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    "default-src 'self'",
    `connect-src 'self' ${apiConnectOrigin()}`,
    "img-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: "/d/:path*",
};
