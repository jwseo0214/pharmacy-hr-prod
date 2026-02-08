import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSupabaseSessionCookie(req: NextRequest) {
  const all = req.cookies.getAll();
  return all.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /login 은 절대 middleware에서 막지 않음
  if (pathname === "/login") return NextResponse.next();

  const authed = hasSupabaseSessionCookie(req);
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// 보호가 필요한 경로만 적용 (루프 방지 핵심)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/attendance/:path*",
    "/payroll/:path*",
    "/manage/:path*",
    "/admin/:path*",
  ],
};
