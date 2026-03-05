'use client';

import { IconSidebar } from '@/components/icon-sidebar';
import { LeftPanel } from '@/components/left-panel';
import { EtfDetailPanel } from '@/components/etf-detail-panel';
import { CanvasPanel } from '@/components/canvas-panel';
import { SimulatePanel } from '@/components/simulate-panel';
import { useCanvasStore } from '@/lib/store';

export default function HomePage() {
  const { activeView } = useCanvasStore();

  return (
    <div className="h-screen flex overflow-hidden">
      <IconSidebar />
      <LeftPanel />
      {activeView === 'explore' && <EtfDetailPanel />}
      {activeView === 'canvas' && <CanvasPanel />}
      {activeView === 'simulate' && <SimulatePanel />}
    </div>
  );
}
