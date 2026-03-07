import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.expiresAt = account.expires_at! * 1000;
        token.provider = account.provider;
      }
      if (profile) {
        token.name = profile.name ?? profile.preferred_username;
        token.picture = profile.picture as string | undefined;
      }

      // Refresh token if expired
      if (token.expiresAt && Date.now() > (token.expiresAt as number) - 30000) {
        try {
          const issuer = process.env.KEYCLOAK_ISSUER!;
          const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.KEYCLOAK_CLIENT_ID!,
              client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          token.accessToken = data.access_token;
          token.refreshToken = data.refresh_token ?? token.refreshToken;
          token.idToken = data.id_token ?? token.idToken;
          token.expiresAt = Date.now() + data.expires_in * 1000;
        } catch {
          token.error = 'RefreshTokenError';
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.name = token.name;
      session.user.image = token.picture as string | undefined;
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/gate',
  },
  session: { strategy: 'jwt' },
});
