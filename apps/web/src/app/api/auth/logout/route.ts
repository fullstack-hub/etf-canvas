import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET! });

  const issuer = process.env.KEYCLOAK_ISSUER!;
  const clientId = process.env.KEYCLOAK_CLIENT_ID!;
  const origin = process.env.AUTH_URL || req.nextUrl.origin;

  if (!token?.idToken) {
    // idToken 없으면 Keycloak 로그아웃 페이지 스킵 (기존 세션 호환)
    return Response.json({ logoutUrl: origin });
  }

  const url = new URL(`${issuer}/protocol/openid-connect/logout`);
  url.searchParams.set('id_token_hint', token.idToken as string);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('post_logout_redirect_uri', origin);

  return Response.json({ logoutUrl: url.toString() });
}
