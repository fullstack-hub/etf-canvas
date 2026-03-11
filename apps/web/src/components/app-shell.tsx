'use client';

import { IconSidebar } from '@/components/icon-sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[calc(100vh-37px)] flex overflow-hidden">
      <IconSidebar />
      <div className="flex-1 flex min-w-0 bg-background">
        {children}
      </div>
    </div>
  );
}
