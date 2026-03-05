'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { CanvasSidebar } from '@/components/canvas-sidebar';
import { CompareChart } from '@/components/compare-chart';
import { CompareTable } from '@/components/compare-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function CanvasPage() {
  const { comparing } = useCanvasStore();

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">← 목록</Link>
          <h1 className="text-2xl font-bold">비교 캔버스</h1>
          {comparing.length > 0 && (
            <Link href="/simulate">
              <Button variant="outline">시뮬레이션</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <CanvasSidebar />
          </div>
          <div className="lg:col-span-3 space-y-6">
            {comparing.length > 0 ? (
              <>
                <Card>
                  <CardHeader><CardTitle>수익률 비교</CardTitle></CardHeader>
                  <CardContent>
                    <CompareChart datasets={priceDatasets || []} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>지표 비교</CardTitle></CardHeader>
                  <CardContent>
                    <CompareTable etfs={compareData || []} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                좌측에서 비교할 ETF를 선택해주세요. (최대 3개)
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
