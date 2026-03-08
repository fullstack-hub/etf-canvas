'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PriceChart } from '@/components/price-chart';
import { X, TrendingUp, Globe, Building2, Percent, Target } from 'lucide-react';
import type { ETFSummary } from '@etf-canvas/shared';

const PERIODS = ['1m', '3m', '1y', 'ytd', '3y'] as const;
const PERIOD_LABELS: Record<string, string> = {
  '1m': '1M', '3m': '3M', '1y': '1Y', 'ytd': 'YTD', '3y': '3Y',
};

interface Props {
  etf: ETFSummary;
  onClose: () => void;
}

export function EtfDetailModal({ etf, onClose }: Props) {
  const [period, setPeriod] = useState<string>('1y');

  const { data: detail } = useQuery({
    queryKey: ['etf-detail', etf.code],
    queryFn: () => api.getDetail(etf.code),
  });

  const { data: prices } = useQuery({
    queryKey: ['etf-prices', etf.code, period],
    queryFn: () => api.getDailyPrices(etf.code, period),
  });

  const country = etf.categories.some((c) => c === '해외 대표지수') ? '해외' : '한국';
  const expenseRatio = detail?.expenseRatio ?? etf.expenseRatio;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-background rounded-xl shadow-2xl w-[560px] max-h-[85vh] overflow-y-auto border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold pr-8">{etf.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{etf.code}</p>
        </div>

        {/* (1) Info badges */}
        <div className="px-6 pb-4">
          <div className="flex gap-2 flex-wrap">
            <InfoBadge
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              label={etf.categories[0] || '-'}
              highlight
            />
            <InfoBadge
              icon={<Globe className="w-3.5 h-3.5" />}
              label={country}
            />
            <InfoBadge
              icon={<Building2 className="w-3.5 h-3.5" />}
              label={etf.aum ? (etf.aum >= 10000 ? `AUM ${(etf.aum / 10000).toFixed(1)}조` : `AUM ${etf.aum.toLocaleString()}억`) : 'AUM -'}
            />
            <InfoBadge
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              label={etf.oneYearEarnRate != null ? `${etf.oneYearEarnRate > 0 ? '+' : ''}${etf.oneYearEarnRate.toFixed(1)}%` : '-'}
              valueColor={etf.oneYearEarnRate != null && etf.oneYearEarnRate > 0 ? 'text-red-500' : etf.oneYearEarnRate != null && etf.oneYearEarnRate < 0 ? 'text-blue-500' : undefined}
              sublabel="1Y 수익률"
            />
            <InfoBadge
              icon={<Percent className="w-3.5 h-3.5" />}
              label={expenseRatio != null ? `${(expenseRatio * 100).toFixed(3)}%` : '-'}
              sublabel="운용보수"
            />
            {etf.issuer && (
              <InfoBadge
                icon={<Building2 className="w-3.5 h-3.5" />}
                label={etf.issuer}
                sublabel="운용사"
              />
            )}
            {detail?.benchmark && (
              <InfoBadge
                icon={<Target className="w-3.5 h-3.5" />}
                label={detail.benchmark}
                sublabel="벤치마크"
              />
            )}
          </div>
        </div>

        {/* (2) Price chart */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold">수익률 차트</h3>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors ${
                    period === p
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="h-52 border rounded-lg p-2 bg-muted/10">
            {prices && prices.length > 0 ? (
              <PriceChart data={prices} compact />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                로딩 중...
              </div>
            )}
          </div>
        </div>

        {/* (3) Top holdings */}
        <div className="px-6 pb-6">
          <h3 className="text-sm font-bold mb-2">
            상위 {Math.min(detail?.holdings?.length || 0, 10)}개 종목 및 비중(%)
          </h3>
          {detail?.holdings && detail.holdings.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                {detail.holdings.slice(0, 10).map((h, i) => (
                  <div
                    key={h.stockCode || i}
                    className={`flex justify-between py-1.5 text-sm border-b border-border/40 ${i < 2 ? 'bg-muted/20 -mx-1 px-1 rounded' : ''}`}
                  >
                    <span className="truncate flex-1">{h.stockName || h.stockCode}</span>
                    <span className="text-muted-foreground tabular-nums ml-2">{h.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground/60 mt-2 space-y-0.5">
                <p>* 구성종목, 주식수 및 구성비중은 전일 기준이에요.</p>
                <p>* 일부 유형의 ETF는 그 특성상 주식수 및 구성비중 제공이 어려울 수 있어요.</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">보유 종목 정보가 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBadge({
  icon,
  label,
  sublabel,
  highlight,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
        highlight
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted/30 border-border'
      }`}
    >
      {icon}
      <div className="flex flex-col leading-tight">
        {sublabel && <span className="text-[9px] opacity-60">{sublabel}</span>}
        <span className={`font-medium ${valueColor || ''}`}>{label}</span>
      </div>
    </div>
  );
}
