'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PriceChart } from '@/components/price-chart';
import { ReturnBadges } from '@/components/return-badges';
import { HoldingsTable } from '@/components/holdings-table';

type Tab = 'overview' | 'analysis';

export function EtfDetailPanel() {
  const { selectedEtfCode, addToCanvas, selected } = useCanvasStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState('1y');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['etf-detail', selectedEtfCode],
    queryFn: () => api.getDetail(selectedEtfCode!),
    enabled: !!selectedEtfCode,
  });

  const { data: prices } = useQuery({
    queryKey: ['etf-prices', selectedEtfCode, period],
    queryFn: () => api.getDailyPrices(selectedEtfCode!, period),
    enabled: !!selectedEtfCode,
  });

  if (!selectedEtfCode) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        좌측에서 ETF를 선택해주세요.
      </div>
    );
  }

  if (isLoading || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  const isInCanvas = selected.some((s) => s.code === detail.code);
  const isKorea = detail.categories.some((c) => c === '국내 대표지수' || c === '섹터/테마');
  const assetType = detail.categories[0] || '기타';

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{detail.name}</h2>
        <Button
          size="sm"
          onClick={() => addToCanvas(detail)}
          disabled={isInCanvas}
          variant={isInCanvas ? 'secondary' : 'default'}
        >
          {isInCanvas ? '캔버스에 추가됨' : '캔버스에 추가'}
        </Button>
      </div>

      {/* 5 Metric Cards */}
      <div className="grid grid-cols-5 gap-2">
        <MetricCard
          icon="📈"
          value={assetType}
          label="자산"
        />
        <MetricCard
          icon={isKorea ? '🇰🇷' : '🌍'}
          value={isKorea ? '한국' : '해외'}
          label="국가"
        />
        <MetricCard
          icon="💼"
          value={detail.aum ? `${detail.aum.toLocaleString()}억` : '-'}
          label="AUM"
        />
        <MetricCard
          icon="📊"
          value={detail.threeMonthEarnRate != null ? `${detail.threeMonthEarnRate > 0 ? '+' : ''}${detail.threeMonthEarnRate.toFixed(1)}%` : '-'}
          label="3개월 수익률"
          positive={detail.threeMonthEarnRate != null ? detail.threeMonthEarnRate >= 0 : undefined}
        />
        <MetricCard
          icon="%"
          value={detail.expenseRatio ? `${(detail.expenseRatio * 100).toFixed(3)}%` : '-'}
          label="운용보수"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setTab('overview')}
          className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
            tab === 'overview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          개요
        </button>
        <button
          onClick={() => setTab('analysis')}
          className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
            tab === 'analysis' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          분석
        </button>
      </div>

      {tab === 'overview' ? (
        <>
          {/* Returns */}
          {detail.returns.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">기간별 수익률</h3>
                <ReturnBadges returns={detail.returns} />
              </CardContent>
            </Card>
          )}

          {/* Chart */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">시세 차트</h3>
                <div className="flex gap-1">
                  {(['1m', '3m', '6m', '1y', '3y'] as const).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={period === p ? 'default' : 'ghost'}
                      className="h-6 px-2 text-xs"
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
              <PriceChart data={prices || []} />
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">기본 정보</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">종목코드</span><p>{detail.code}</p></div>
                <div><span className="text-muted-foreground">카테고리</span><p>{detail.categories.join(', ') || '-'}</p></div>
                <div><span className="text-muted-foreground">벤치마크</span><p>{detail.benchmark || '-'}</p></div>
                <div><span className="text-muted-foreground">상장일</span><p>{detail.listedDate || '-'}</p></div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Holdings */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">보유종목</h3>
              <HoldingsTable holdings={detail.holdings} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  positive,
}: {
  icon: string;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
        <span className="text-lg">{icon}</span>
        <span className={`text-sm font-semibold ${
          positive === true ? 'text-green-600' : positive === false ? 'text-red-600' : ''
        }`}>
          {value}
        </span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
