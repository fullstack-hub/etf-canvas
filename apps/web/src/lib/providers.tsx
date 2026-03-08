'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from 'next-auth/react';
import { useState, useEffect, type ReactNode } from 'react';
import { setTokenRefresher } from './api';

function TokenRefreshRegistrar({ children }: { children: ReactNode }) {
  const { update } = useSession();
  useEffect(() => {
    setTokenRefresher(async () => {
      const fresh = await update();
      return (fresh as any)?.accessToken ?? null;
    });
  }, [update]);
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
      <TokenRefreshRegistrar>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </TokenRefreshRegistrar>
    </SessionProvider>
  );
}
