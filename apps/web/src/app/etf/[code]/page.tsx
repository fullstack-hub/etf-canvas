'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PriceChart } from '@/components/price-chart';
import { ReturnBadges } from '@/components/return-badges';
import { HoldingsTable } from '@/components/holdings-table';
import { useCanvasStore } from '@/lib/store';
import Link from 'next/link';

const periods = ['1m', '3m', '6m', '1y', '3y'] as const;

export default function EtfDetailPage() {
  const params = useParams();
  const code = params.code as string;
  const [period, setPeriod] = useState<string>('1y');
  const { addToCanvas, selected } = useCanvasStore();
  const isInCanvas = selected.some((s) => s.code === code);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['etf-detail', code],
    queryFn: () => api.getDetail(code),
  });

  const { data: prices } = useQuery({
    queryKey: ['etf-prices', code, period],
    queryFn: () => api.getDailyPrices(code, period),
  });

  if (isLoading) return <div className="text-center py-12">로딩 중...</div>;
  if (!detail) return <div className="text-center py-12">ETF를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">← 목록</Link>
          <h1 className="text-2xl font-bold">{detail.name}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{detail.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {detail.code} · {detail.issuer} · {detail.category}
                </p>
              </div>
              <Button
                onClick={() => addToCanvas(detail)}
                disabled={isInCanvas}
                variant={isInCanvas ? 'secondary' : 'default'}
              >
                {isInCanvas ? '캔버스에 추가됨' : '캔버스에 추가'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">벤치마크</span>
                <p className="font-medium">{detail.benchmark || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">상장일</span>
                <p className="font-medium">{detail.listedDate || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">AUM</span>
                <p className="font-medium">{detail.aum ? `${(detail.aum / 100_000_000).toFixed(0)}억원` : '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">총보수율</span>
                <p className="font-medium">{detail.expenseRatio ? `${(detail.expenseRatio * 100).toFixed(2)}%` : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 수익률 */}
        {detail.returns.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">수익률</CardTitle></CardHeader>
            <CardContent><ReturnBadges returns={detail.returns} /></CardContent>
          </Card>
        )}

        {/* 시세 차트 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">시세</CardTitle>
              <div className="flex gap-1">
                {periods.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={period === p ? 'default' : 'ghost'}
                    onClick={() => setPeriod(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PriceChart data={prices || []} />
          </CardContent>
        </Card>

        {/* 보유종목 */}
        <Card>
          <CardHeader><CardTitle className="text-lg">보유종목</CardTitle></CardHeader>
          <CardContent><HoldingsTable holdings={detail.holdings} /></CardContent>
        </Card>
      </main>
    </div>
  );
}
