'use client';

import { useIsMobile } from '@/lib/use-is-mobile';
import { MobileGalleryTab } from '@/components/mobile/gallery-tab';
import { MobileBottomNav } from '@/components/mobile/bottom-nav';
import { AppShell } from '@/components/app-shell';
import { GalleryView } from '@/components/gallery-view';

export function GalleryPageContent() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col">
        <div className="flex-1 overflow-y-auto pb-14">
          <MobileGalleryTab />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <AppShell>
      <GalleryView />
    </AppShell>
  );
}
