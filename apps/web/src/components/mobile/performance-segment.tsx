'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, X } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { api } from '@/lib/api';
import { FeedbackSection } from '@/components/feedback-section';
import { useReturnColors } from '@/lib/return-colors';
import type { SimulateRequest } from '@etf-canvas/shared';

const PERIODS = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y'] as const;
type Period = typeof PERIODS[number];

export function MobilePerformanceSegment() {
  const { comparing, weights, amounts, synthesized, feedbackText, feedbackActions, feedbackLoading } = useCanvasStore();
  const { showFullscreenAd, setShowFullscreenAd } = useMobileUIStore();
  const [period, setPeriod] = useState<Period>('1Y');

  const totalAmount = comparing.reduce((sum, code) => sum + (amounts[code] || 0), 0);

  const simulateReq: SimulateRequest | null = synthesized && comparing.length > 0
    ? { codes: comparing, weights: comparing.map((c) => weights[c] || 0), amount: totalAmount, period: period.toLowerCase() }
    : null;

  const { data: simResult, isPending } = useQuery({
    queryKey: ['etf-simulate', simulateReq],
    queryFn: () => api.simulate(simulateReq!),
    enabled: !!simulateReq,
    placeholderData: (prev) => prev,
  });

  if (!synthesized) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">합성 후 실적을 확인할 수 있습니다</p>
      </div>
    );
  }

  // API returns absolute monetary values in dailyValues — convert to % return
  const baseAmount = totalAmount || 10_000_000;
  const chartData = simResult?.dailyValues?.map((v) => ({
    date: v.date,
    value: Number((((v.value - baseAmount) / baseAmount) * 100).toFixed(2)),
  })) ?? [];

  // API already returns percentage values (e.g., 12.34 = 12.34%)
  const rc = useReturnColors();
  const totalReturn = simResult?.totalReturn ?? 0;
  const cagr = simResult?.annualizedReturn ?? 0;
  const mdd = simResult?.maxDrawdown ?? 0;
  const volatility = simResult?.volatility ?? 0;

  return (
    <div className="overflow-y-auto h-full px-4 py-3 space-y-4">
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="수익률" value={totalReturn} suffix="%" />
        <MetricCard label="연환산" value={cagr} suffix="%" />
        <MetricCard label="MDD" value={mdd} suffix="%" neutral />
        <MetricCard label="변동성" value={volatility} suffix="%" neutral />
      </div>

      {chartData.length > 0 && (() => {
        const isPositive = totalReturn >= 0;
        const lineColor = rc.hex(isPositive);
        return (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="mobileGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 10 }} width={40} axisLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-popover/95 backdrop-blur-sm px-2.5 py-1.5 shadow-md">
                        <p className="text-[10px] text-muted-foreground">{d.date}</p>
                        <p className="text-xs font-bold">수익률 : {Number(d.value).toFixed(2)}%</p>
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="value" stroke={lineColor} fill="url(#mobileGrowthGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {isPending && chartData.length === 0 && (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      )}

      {feedbackLoading && (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="p-5 border-b border-border/30 bg-muted/10">
            <h3 className="text-base font-bold text-foreground/90">포트폴리오 분석</h3>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 py-8 px-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-500 animate-[sparkle_1.5s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 0 3px #f59e0b)' }} />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-[spin_3s_linear_infinite]" style={{ borderTopColor: '#f59e0b' }} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-foreground/80">포트폴리오를 분석중이에요</p>
              <p className="text-[10px] text-muted-foreground/60">잠시만 기다려 주세요</p>
            </div>
          </div>
        </div>
      )}
      {!feedbackLoading && feedbackText && (
        <FeedbackSection feedbackText={feedbackText} feedbackActions={feedbackActions} />
      )}

      {(feedbackLoading || feedbackText) && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
          <img src="/ads/etf-canvas-hero.jpg" alt="ETF Canvas" className="w-full h-full object-cover" />
        </div>
      )}

      {showFullscreenAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative mx-4 w-full max-w-md">
            <button
              onClick={() => setShowFullscreenAd(false)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="aspect-video rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">광고 영역</p>
              <p className="text-xs text-muted-foreground/60">준비 중입니다</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, suffix, negative, neutral }: {
  label: string; value: number; suffix: string; negative?: boolean; neutral?: boolean;
}) {
  const rc = useReturnColors();
  const colorClass = neutral
    ? 'text-foreground'
    : negative
      ? rc.cls(false)
      : rc.cls(value >= 0);

  return (
    <div className="rounded-xl border bg-card p-3 min-w-0">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-bold ${colorClass}`}>
        {!negative && value >= 0 ? '+' : ''}{value.toFixed(1)}{suffix}
      </p>
    </div>
  );
}
