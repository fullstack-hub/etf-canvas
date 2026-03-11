import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    idp?: string;
    error?: string;
  }
}
