'use client';

import { Layers } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { useMobileUIStore } from '@/lib/mobile-ui-store';

export function FloatingCanvasBar() {
  const selected = useCanvasStore((s) => s.selected);
  const setCanvasSegment = useMobileUIStore((s) => s.setCanvasSegment);

  if (selected.length === 0) return null;

  return (
    <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom)+16px)] mx-4 z-40">
      <button
        onClick={() => setCanvasSegment('compose')}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-primary text-primary-foreground shadow-lg"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span className="text-sm font-medium">캔버스에 {selected.length}개 ETF 담김</span>
        </div>
        <span className="text-sm font-bold">조합하기 →</span>
      </button>
    </div>
  );
}
