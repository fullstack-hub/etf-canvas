'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect, type ReactNode } from 'react';
import { setTokenProvider, setTokenRefresher } from './api';

function TokenRegistrar({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();

  // 현재 토큰을 fetcher에 제공
  useEffect(() => {
    setTokenProvider(() => session?.accessToken ?? null);
  }, [session?.accessToken]);

  // 401 시 토큰 갱신
  useEffect(() => {
    setTokenRefresher(async () => {
      const fresh = await update();
      return fresh?.accessToken ?? null;
    });
  }, [update]);

  // 토큰 갱신 실패 시 자동 로그아웃
  useEffect(() => {
    if (session?.error === 'RefreshTokenError') {
      signOut({ callbackUrl: '/gate' });
    }
  }, [session?.error]);

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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <TokenRegistrar>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </TokenRegistrar>
      </SessionProvider>
    </ThemeProvider>
  );
}
