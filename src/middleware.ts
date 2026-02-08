import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

/**
 * 목적: 비로그인 사용자가 보호 페이지 접근 시 /login으로 보내기
 * - Supabase SDK를 middleware(edge)에서 쓰면 버전/환경에 따라 export 충돌이 잦아서
 *   여기서는 쿠키 존재 여부만 가볍게 체크합니다.
 * - 실제 데이터 접근 통제는 Postgres RLS가 담당합니다.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // public 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // 정적파일/next 내부 경로 통과
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // Supabase 세션 쿠키 존재 여부(둘 중 하나라도 있으면 로그인으로 간주)
  const hasSbCookie =
    req.cookies.get("sb-access-token") ||
    req.cookies.get("sb-refresh-token") ||
    req.cookies.get("supabase-auth-token");

  if (!hasSbCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
