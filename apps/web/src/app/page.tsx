'use client';

import { IconSidebar } from '@/components/icon-sidebar';
import { LeftPanel } from '@/components/left-panel';
import { CanvasPanel } from '@/components/canvas-panel';
import { AttributePanel } from '@/components/attribute-panel';
import { PerformancePanel } from '@/components/performance-panel';
import { useCanvasStore } from '@/lib/store';

export default function HomePage() {
  const { performanceExpanded } = useCanvasStore();

  return (
    <div className="h-screen flex overflow-hidden">
      <IconSidebar />
      <LeftPanel />
      <div className="flex-1 flex min-w-0 bg-background">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {!performanceExpanded && <CanvasPanel />}
          <PerformancePanel />
        </div>
        <AttributePanel />
      </div>
    </div>
  );
}
