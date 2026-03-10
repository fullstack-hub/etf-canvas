'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Loader2, ChevronDown } from 'lucide-react';

type Item = { code: string; name: string; weight: number };

const PERIOD_MONTHS: Record<string, number> = {
  '1m': 1, '3m': 3, '6m': 6, '1y': 12, '3y': 36,
};

export function DividendSection({ items, period = '1y', totalAmount: totalAmountProp = 100000000 }: { items: Item[]; period?: string; totalAmount?: number }) {
  const totalAmount = (totalAmountProp && !isNaN(totalAmountProp)) ? totalAmountProp : 100000000;
  const [expanded, setExpanded] = useState(false);
  const codes = items.map(i => i.code);
  const weights: Record<string, number> = {};
  const nameMap: Record<string, string> = {};
  for (const item of items) {
    weights[item.code] = item.weight;
    nameMap[item.code] = item.name;
  }

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['dividend-section', codes.sort().join(',')],
    queryFn: async () => {
      const results = await Promise.all(codes.map(code => api.getDividends(code)));
      return codes.map((code, i) => ({ code, dividends: Array.isArray(results[i]) ? results[i] : [] }));
    },
    enabled: codes.length > 0,
    staleTime: 86400000,
  });

  const months = PERIOD_MONTHS[period] || 12;
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffStr = cutoffDate.toISOString().slice(0, 7);

  const { stats, perEtf } = (() => {
    if (!rawData) return { stats: null, perEtf: [] };
    let totalRate = 0;
    let totalDivAmount = 0;
    let count = 0;
    const etfStats: { code: string; name: string; weight: number; rate: number; amount: number; count: number }[] = [];

    for (const { code, dividends } of rawData) {
      const w = (weights[code] || 0) / 100;
      let etfRate = 0;
      let etfAmount = 0;
      let etfCount = 0;
      for (const d of dividends) {
        const month = d.date.slice(0, 7);
        if (month < cutoffStr) continue;
        etfRate += d.rate || 0;
        etfAmount += d.amount || 0;
        etfCount++;
      }
      totalRate += etfRate * w;
      totalDivAmount += etfAmount * w;
      count += etfCount;
      etfStats.push({
        code,
        name: nameMap[code] || code,
        weight: weights[code] || 0,
        rate: Math.round(etfRate * 100) / 100,
        amount: Math.round(etfAmount),
        count: etfCount,
      });
    }

    if (count === 0) return { stats: null, perEtf: [] };

    const monthlyAvgRate = totalRate / months;
    const annualizedRate = monthlyAvgRate * 12;

    return {
      stats: {
        totalRate: Math.round(totalRate * 100) / 100,
        totalDivAmount: Math.round(totalDivAmount),
        annualizedRate: Math.round(annualizedRate * 100) / 100,
        monthlyAvgRate: Math.round(monthlyAvgRate * 10000) / 10000,
      },
      perEtf: etfStats.sort((a, b) => b.rate - a.rate),
    };
  })();

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">분배금</h2>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold">분배금</h2>
        <p className="text-xs text-muted-foreground mt-0.5">같은 조건이라면, 분배금은 이만큼 받았어요</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">누적 분배율</p>
          <p className="text-2xl font-bold tabular-nums text-sky-400">{stats.totalRate.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">연환산 분배율</p>
          <p className="text-2xl font-bold tabular-nums text-sky-400">{stats.annualizedRate.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">월평균 분배율</p>
          <p className="text-2xl font-bold tabular-nums">{stats.monthlyAvgRate.toFixed(2)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">기간 분배금</p>
          <p className="text-2xl font-bold tabular-nums">{Math.round(totalAmount * stats.totalRate / 100).toLocaleString()}원</p>
        </div>
      </div>
      {perEtf.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            종목별 상세
          </button>
          {expanded && (
            <div className="mt-3 rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium">종목</th>
                    <th className="text-right px-4 py-2.5 font-medium">비중</th>
                    <th className="text-right px-4 py-2.5 font-medium">분배율</th>
                    <th className="text-right px-4 py-2.5 font-medium">기간 분배금</th>
                    <th className="text-right px-4 py-2.5 font-medium">횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {perEtf.map((etf) => (
                    <tr key={etf.code} className="border-t border-border/40">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[13px]">{etf.name}</p>
                        <p className="text-[11px] text-muted-foreground">{etf.code}</p>
                      </td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{etf.weight}%</td>
                      <td className="text-right px-4 py-2.5 font-bold tabular-nums text-sky-400">{etf.rate.toFixed(2)}%</td>
                      <td className="text-right px-4 py-2.5 tabular-nums">{Math.round(totalAmount * (etf.weight / 100) * etf.rate / 100).toLocaleString()}원</td>
                      <td className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">{etf.count}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
