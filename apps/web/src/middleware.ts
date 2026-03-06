import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'etf-canvas-auth';

export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  if (req.nextUrl.pathname === '/api/auth') return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === password) return NextResponse.next();

  // 비밀번호 입력 페이지로 리다이렉트
  const url = req.nextUrl.clone();
  url.pathname = '/gate';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.*\\.svg|gate).*)'],
};
