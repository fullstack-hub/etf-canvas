import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function hmacToken(password: string): string {
  return crypto.createHmac('sha256', password).update('etf-canvas-auth').digest('hex');
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword || password !== sitePassword) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = hmacToken(sitePassword);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('etf-canvas-auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: '/',
  });
  // 클라이언트에서 인증 여부를 확인할 수 있는 플래그 쿠키
  res.cookies.set('etf-canvas-authed', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
