'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCanvasStore } from '@/lib/store';
import { api } from '@/lib/api';
import { FeedbackSection } from '@/components/feedback-section';
import type { SimulateRequest } from '@etf-canvas/shared';

const PERIODS = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y'] as const;
type Period = typeof PERIODS[number];

export function MobilePerformanceSegment() {
  const { comparing, weights, amounts, synthesized, feedbackText, feedbackActions } = useCanvasStore();
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
        <MetricCard label="MDD" value={mdd} suffix="%" negative />
        <MetricCard label="변동성" value={volatility} suffix="%" neutral />
      </div>

      {chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="mobileGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="date" tick={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 10 }} width={40} axisLine={false} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${Number(value).toFixed(2)}%`, '수익률']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#mobileGrowthGrad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {isPending && chartData.length === 0 && (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      )}

      {feedbackText && (
        <FeedbackSection feedbackText={feedbackText} feedbackActions={feedbackActions} />
      )}
    </div>
  );
}

function MetricCard({ label, value, suffix, negative, neutral }: {
  label: string; value: number; suffix: string; negative?: boolean; neutral?: boolean;
}) {
  const colorClass = neutral
    ? 'text-foreground'
    : negative
      ? 'text-blue-500'
      : value >= 0 ? 'text-red-500' : 'text-blue-500';

  return (
    <div className="rounded-xl border bg-card p-3 min-w-0">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-bold ${colorClass}`}>
        {!negative && value >= 0 ? '+' : ''}{value.toFixed(1)}{suffix}
      </p>
    </div>
  );
}
