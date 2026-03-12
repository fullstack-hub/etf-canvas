'use client';

import { useState, useEffect } from 'react';
import { IconSidebar } from '@/components/icon-sidebar';
import { LeftPanel } from '@/components/left-panel';
import { CanvasPanel, FloatingFeedback } from '@/components/canvas-panel';
import { AttributePanel } from '@/components/attribute-panel';
import { PerformancePanel } from '@/components/performance-panel';
import { MobileBottomNav } from '@/components/mobile/bottom-nav';
import { useCanvasStore } from '@/lib/store';
import { useIsMobile } from '@/lib/use-is-mobile';
import { useMobileUIStore } from '@/lib/mobile-ui-store';

function useIsAuthed() {
  const [authed, setAuthed] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: must check cookie only on client
  useEffect(() => { setAuthed(document.cookie.includes('etf-canvas-authed=1')); }, []);
  return authed;
}

export default function HomePage() {
  const { performanceExpanded, synthesized, feedbackEnabled, feedbackLoading, feedbackText, feedbackActions, setBrowseCategory } = useCanvasStore();
  const authed = useIsAuthed();
  const isMobile = useIsMobile();

  if (!authed) return <LandingPage />;

  if (isMobile) return <MobileHome />;

  return (
    <>
      <div className="h-[calc(100vh-37px)] flex overflow-hidden">
        <IconSidebar />
        <LeftPanel />
        <div className="flex-1 flex min-w-0 bg-background">
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {!(performanceExpanded && synthesized) && <CanvasPanel />}
            {synthesized && <PerformancePanel />}
          </div>
          <AttributePanel />
        </div>
      </div>
      {feedbackEnabled && synthesized && (feedbackLoading || feedbackText) && (
        <FloatingFeedback
          loading={feedbackLoading}
          text={feedbackText}
          actions={feedbackActions}
          onAction={setBrowseCategory}
        />
      )}
    </>
  );
}

function MobileHome() {
  const { activeTab } = useMobileUIStore();

  return (
    <div className="h-[100dvh] flex flex-col">
      <div className="flex-1 overflow-y-auto pb-safe-bottom">
        {activeTab === 'home' && (
          <div className="p-4 text-center text-muted-foreground">홈 탭 (구현 예정)</div>
        )}
        {activeTab === 'canvas' && (
          <div className="p-4 text-center text-muted-foreground">캔버스 탭 (구현 예정)</div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-4 md:px-6 py-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="ETF Canvas" width={28} height={28} />
          <span className="font-bold text-lg">ETF Canvas</span>
        </div>
        <a
          href="/gate"
          className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          시작하기
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">나만의 ETF 포트폴리오를 그리다</h1>
          <p className="text-muted-foreground text-sm md:text-base">ETF를 골라 담고, 비중을 조절하고, 성과를 시뮬레이션하세요</p>
        </div>
      </main>
    </div>
  );
}
