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
        token.provider = account.provider;
      }
      if (profile) {
        token.name = profile.name ?? profile.preferred_username;
        token.picture = profile.picture as string | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.name = token.name;
      session.user.image = token.picture as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/gate',
  },
  session: { strategy: 'jwt' },
});
