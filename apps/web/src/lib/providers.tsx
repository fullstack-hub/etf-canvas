'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useState, useEffect, type ReactNode } from 'react';
import { setTokenProvider, setTokenRefresher } from './api';

function TokenRegistrar({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();

  // 현재 토큰을 fetcher에 제공
  useEffect(() => {
    setTokenProvider(() => (session as any)?.accessToken ?? null);
  }, [(session as any)?.accessToken]);

  // 401 시 토큰 갱신
  useEffect(() => {
    setTokenRefresher(async () => {
      const fresh = await update();
      return (fresh as any)?.accessToken ?? null;
    });
  }, [update]);

  // 토큰 갱신 실패 시 자동 로그아웃
  useEffect(() => {
    if ((session as any)?.error === 'RefreshTokenError') {
      signOut({ callbackUrl: '/gate' });
    }
  }, [(session as any)?.error]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: { staleTime: 60_000, refetchOnWindowFocus: false },
      },
    }),
  );
  return (
    <SessionProvider>
      <TokenRegistrar>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </TokenRegistrar>
    </SessionProvider>
  );
}
