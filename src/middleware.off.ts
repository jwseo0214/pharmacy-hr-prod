import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Supabase 세션 쿠키는 버전에 따라 이름이 다를 수 있어 넓게 체크
function hasSupabaseSession(req: NextRequest) {
  const cookies = req.cookies.getAll();
  // 보통: sb-<project-ref>-auth-token
  return cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ /login 은 절대 middleware에서 리다이렉트하면 안 됨
  if (pathname === "/login") return NextResponse.next();

  // 보호 경로에서만 체크
  if (!hasSupabaseSession(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ✅ "전체 사이트"가 아니라 보호 구역만 적용 (여기가 루프 끊는 핵심)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/attendance/:path*",
    "/payroll/:path*",
    "/manage/:path*",
    "/admin/:path*",
  ],
};
