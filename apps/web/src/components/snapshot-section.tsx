'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Loader2, ChevronDown } from 'lucide-react';
import { useReturnColors } from '@/lib/return-colors';

export const PERIODS = [
  { key: '1m', label: '1개월' },
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
  { key: '3y', label: '3년' },
];

export function SnapshotSection({ items, period, onPeriodChange, totalAmount: totalAmountProp = 100000000 }: {
  items: { code: string; name: string; weight: number }[];
  period: string;
  onPeriodChange: (p: string) => void;
  totalAmount?: number;
}) {
  const rc = useReturnColors();
  const totalAmount = (totalAmountProp && !isNaN(totalAmountProp)) ? totalAmountProp : 100000000;
  const [expanded, setExpanded] = useState(false);
  const nameMap = new Map(items.map(i => [i.code, i.name]));

  const simulateReq = {
    codes: items.map(i => i.code),
    weights: items.map(i => i.weight),
    amount: totalAmount,
    period,
  };

  const { data: simData, isLoading } = useQuery({
    queryKey: ['snapshot-simulate', simulateReq],
    queryFn: () => api.simulate(simulateReq),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  const volatility = (() => {
    const dv = simData?.dailyValues;
    if (!dv || dv.length < 2) return null;
    const dailyReturns: number[] = [];
    for (let i = 1; i < dv.length; i++) {
      dailyReturns.push((dv[i].value - dv[i - 1].value) / dv[i - 1].value);
    }
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
    return Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
  })();

  const dateRange = (() => {
    const dv = simData?.dailyValues;
    if (!dv || dv.length < 2) return null;
    return { from: dv[0].date, to: dv[dv.length - 1].date };
  })();

  return (
    <div>
      <h2 className="text-lg font-bold">성과 지표</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-2">포트폴리오의 최근 성과를 확인해보세요</p>
      {dateRange && <p className="text-[11px] text-muted-foreground/50 text-right mb-1">{dateRange.from} ~ {dateRange.to}</p>}
      <div className="flex justify-end mb-3">
        <div className="flex bg-muted/40 rounded-md p-0.5 border">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => onPeriodChange(p.key)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors ${
                period === p.key
                  ? 'bg-slate-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
        </div>
      ) : simData && simData.totalReturn != null ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">수익률</p>
              <p className={`text-lg md:text-2xl font-bold tabular-nums ${rc.cls(simData.totalReturn >= 0)}`}>
                {simData.totalReturn >= 0 ? '+' : ''}{simData.totalReturn.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">연환산</p>
              <p className={`text-lg md:text-2xl font-bold tabular-nums ${rc.cls((simData.annualizedReturn ?? 0) >= 0)}`}>
                {(simData.annualizedReturn ?? 0) >= 0 ? '+' : ''}{(simData.annualizedReturn ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">MDD</p>
              <p className="text-lg md:text-2xl font-bold tabular-nums text-foreground">{(simData.maxDrawdown ?? 0).toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">변동성</p>
              <p className="text-lg md:text-2xl font-bold tabular-nums text-foreground">{volatility != null ? `${volatility.toFixed(1)}%` : '-'}</p>
            </div>
          </div>
          {simData.perEtf && simData.perEtf.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                종목별 상세
              </button>
              {expanded && (
                <div className="mt-3 grid gap-2">
                  {[...simData.perEtf]
                    .sort((a, b) => b.returnRate - a.returnRate)
                    .map((etf) => (
                    <div key={etf.code} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{nameMap.get(etf.code) || etf.code}</p>
                          <p className="text-[11px] text-muted-foreground">{etf.code} · 비중 {etf.weight}%</p>
                        </div>
                        <span className={`text-base font-bold tabular-nums shrink-0 ml-3 ${rc.cls(etf.returnRate >= 0)}`}>
                          {etf.returnRate >= 0 ? '+' : ''}{etf.returnRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>MDD <strong className="text-foreground">{etf.maxDrawdown != null ? `${etf.maxDrawdown.toFixed(1)}%` : '-'}</strong></span>
                        <span>변동성 <strong className="text-foreground">{etf.volatility != null ? `${etf.volatility.toFixed(1)}%` : '-'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">데이터 없음</p>
      )}
    </div>
  );
}
