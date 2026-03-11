import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET! });

  const issuer = process.env.KEYCLOAK_ISSUER!;
  const clientId = process.env.KEYCLOAK_CLIENT_ID!;
  const origin = process.env.AUTH_URL || req.nextUrl.origin;

  const url = new URL(`${issuer}/protocol/openid-connect/logout`);
  if (token?.idToken) url.searchParams.set('id_token_hint', token.idToken as string);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('post_logout_redirect_uri', origin);

  return Response.json({ logoutUrl: url.toString() });
}
