'use client';

import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { SegmentedControl } from '@/components/mobile/segmented-control';
import { MobileDiscoverSegment } from '@/components/mobile/discover-segment';
import { MobileComposeSegment } from '@/components/mobile/compose-segment';
import { MobilePerformanceSegment } from '@/components/mobile/performance-segment';

const SEGMENTS = [
  { id: 'discover' as const, label: '탐색' },
  { id: 'compose' as const, label: '조합' },
  { id: 'performance' as const, label: '실적' },
];

export function MobileCanvasTab() {
  const { canvasSegment, setCanvasSegment } = useMobileUIStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <SegmentedControl segments={SEGMENTS} active={canvasSegment} onChange={setCanvasSegment} />
      </div>

      <div className="flex-1 min-h-0">
        {canvasSegment === 'discover' && <MobileDiscoverSegment />}
        {canvasSegment === 'compose' && <MobileComposeSegment />}
        {canvasSegment === 'performance' && <MobilePerformanceSegment />}
      </div>
    </div>
  );
}
