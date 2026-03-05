'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCanvasStore } from '@/lib/store';

export function CanvasSidebar() {
  const { selected, comparing, removeFromCanvas, toggleCompare, clearCanvas } = useCanvasStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">선택 목록 ({selected.length}/10)</h2>
        <Button size="sm" variant="ghost" onClick={clearCanvas}>초기화</Button>
      </div>
      {selected.map((etf) => {
        const isComparing = comparing.includes(etf.code);
        return (
          <Card key={etf.code} className={`p-3 ${isComparing ? 'border-primary' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{etf.name}</p>
                <p className="text-xs text-muted-foreground">{etf.code}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={isComparing ? 'default' : 'outline'}
                  onClick={() => toggleCompare(etf.code)}
                  disabled={!isComparing && comparing.length >= 3}
                >
                  {isComparing ? '비교중' : '비교'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFromCanvas(etf.code)}
                >
                  ✕
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
      {selected.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          메인 페이지에서 ETF를 추가해주세요.
        </p>
      )}
    </div>
  );
}
