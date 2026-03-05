'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompareChart } from '@/components/compare-chart';
import { CompareTable } from '@/components/compare-table';

export function CanvasPanel() {
  const { selected, comparing, removeFromCanvas, toggleCompare, clearCanvas, setActiveView } = useCanvasStore();

  const { data: compareData } = useQuery({
    queryKey: ['etf-compare', comparing],
    queryFn: () => api.compare(comparing),
    enabled: comparing.length > 0,
  });

  const { data: priceDatasets } = useQuery({
    queryKey: ['etf-compare-prices', comparing],
    queryFn: async () => {
      const results = await Promise.all(
        comparing.map(async (code) => {
          const prices = await api.getDailyPrices(code, '1y');
          const detail = compareData?.find((d) => d.code === code);
          return { code, name: detail?.name || code, prices };
        }),
      );
      return results;
    },
    enabled: comparing.length > 0 && !!compareData,
  });

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">비교 캔버스</h2>
        <div className="flex gap-2">
          {comparing.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setActiveView('simulate')}>
              시뮬레이션
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={clearCanvas}>초기화</Button>
        </div>
      </div>

      {/* Selected ETFs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {selected.map((etf) => {
          const isComparing = comparing.includes(etf.code);
          return (
            <Card key={etf.code} className={isComparing ? 'border-primary' : ''}>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{etf.name}</p>
                <p className="text-xs text-muted-foreground">{etf.code}</p>
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant={isComparing ? 'default' : 'outline'}
                    className="h-6 text-xs flex-1"
                    onClick={() => toggleCompare(etf.code)}
                    disabled={!isComparing && comparing.length >= 3}
                  >
                    {isComparing ? '비교중' : '비교'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => removeFromCanvas(etf.code)}
                  >
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selected.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          ETF 탐색에서 ETF를 더블클릭하여 캔버스에 추가해주세요.
        </div>
      )}

      {/* Compare */}
      {comparing.length > 0 && (
        <>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">수익률 비교</h3>
              <CompareChart datasets={priceDatasets || []} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">지표 비교</h3>
              <CompareTable etfs={compareData || []} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
