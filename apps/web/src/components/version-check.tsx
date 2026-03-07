'use client';

import { useEffect } from 'react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;

export function VersionCheck() {
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        const { buildId } = await res.json();
        if (buildId && BUILD_ID && buildId !== BUILD_ID) {
          window.location.reload();
        }
      } catch { /* ignore */ }
    })();
  }, []);

  return null;
}
