'use client';

import { useEffect, useState } from 'react';
import { IconSidebar } from '@/components/icon-sidebar';
import { LeftPanel } from '@/components/left-panel';
import { CanvasPanel, FloatingFeedback } from '@/components/canvas-panel';
import { AttributePanel } from '@/components/attribute-panel';
import { PerformancePanel } from '@/components/performance-panel';
import { PortfolioList } from '@/components/portfolio-list';
import { useCanvasStore } from '@/lib/store';

function useIsAuthed() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(document.cookie.includes('etf-canvas-auth='));
  }, []);
  return authed;
}

export default function HomePage() {
  const { performanceExpanded, synthesized, currentView, feedbackEnabled, feedbackLoading, feedbackText, feedbackActions, setBrowseCategory } = useCanvasStore();
  const authed = useIsAuthed();

  if (!authed) return <LandingPage />;

  return (
    <>
      <div className="h-[calc(100vh-37px)] flex overflow-hidden">
        <IconSidebar />
        <LeftPanel />
        <div className="flex-1 flex min-w-0 bg-background">
          {currentView === 'portfolio' ? (
            <PortfolioList />
          ) : (
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {!(performanceExpanded && synthesized) && <CanvasPanel />}
              {synthesized && <PerformancePanel />}
            </div>
          )}
          <AttributePanel />
        </div>
      </div>
      {/* Floating feedback — loading + result */}
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

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b">
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

      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">ETF Canvas — ETF 포트폴리오 분석 도구</p>
      </main>
    </div>
  );
}
