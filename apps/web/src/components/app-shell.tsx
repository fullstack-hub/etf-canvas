'use client';

import { IconSidebar } from '@/components/icon-sidebar';
import { MobileBottomNav } from '@/components/mobile/bottom-nav';
import { useIsMobile } from '@/lib/use-is-mobile';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col">
        <div className="flex-1 overflow-y-auto pb-safe-bottom">
          {children}
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-37px)] flex overflow-hidden">
      <IconSidebar />
      <div className="flex-1 flex min-w-0 bg-background">
        {children}
      </div>
    </div>
  );
}
