import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-token";

const PUBLIC_ADMIN = /^\/admin\/(login|register|invite\/[^/]+)\/?$/;

// Fast pre-check only: visitors without a session cookie never reach the admin
// pages. The session itself is verified against the database in lib/dal.ts by
// every admin page, server action and route handler.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PUBLIC_ADMIN.test(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  const response = NextResponse.next();
  // Admin pages are per-user: never store them in shared caches.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
