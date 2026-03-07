import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'etf-canvas-auth';

export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  // 공개 경로는 항상 통과
  const publicPaths = ['/api/auth', '/privacy', '/terms'];
  if (publicPaths.some(p => req.nextUrl.pathname.startsWith(p))) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === password) return NextResponse.next();

  // 홈페이지는 gate 대신 그대로 표시 (랜딩 페이지)
  if (req.nextUrl.pathname === '/') return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/gate';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.*\\.svg|gate|google.*\\.html).*)'],
};
