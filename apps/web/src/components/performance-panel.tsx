'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart, Area, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { Sparkles, TrendingUp, Maximize2, Minimize2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SimulateRequest } from '@etf-canvas/shared';
import { getCatHex } from '@/lib/category-colors';
import { useReturnColors } from '@/lib/return-colors';

/** 각 종목 분배금을 비중 가중 후 월별/분기별 합산 */
function usePortfolioDividends(
  codes: string[],
  weights: Record<string, number>,
  selected: { code: string; dividendYield?: number | null }[],
) {
  const queries = useQuery({
    queryKey: ['etf-dividends', codes.sort().join(',')],
    queryFn: async () => {
      const results = await Promise.all(codes.map(code => api.getDividends(code)));
      return codes.map((code, i) => ({ code, dividends: Array.isArray(results[i]) ? results[i] : [] }));
    },
    enabled: codes.length > 0,
    staleTime: 86400000,
  });

  // 월별 합산 (분배율 % + 분배금 + 누적)
  const monthlyData = (() => {
    if (!queries.data) return [];
    const monthMap: Record<string, { rate: number; amount: number }> = {};
    for (const { code, dividends } of queries.data) {
      const w = (weights[code] || 0) / 100;
      for (const d of dividends) {
        const month = d.date.slice(0, 7);
        if (!monthMap[month]) monthMap[month] = { rate: 0, amount: 0 };
        monthMap[month].rate += (d.rate || 0) * w;
        monthMap[month].amount += (d.amount || 0) * w;
      }
    }
    let cum = 0;
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => {
        cum += v.rate;
        return {
          month: month.slice(2).replace('-', '.'),
          monthFull: month,
          rate: Math.round(v.rate * 10000) / 10000,
          amount: Math.round(v.amount),
          cumRate: Math.round(cum * 100) / 100,
        };
      });
  })();

  // 분기별 합산 (분배율 % + 누적)
  const quarterlyData = (() => {
    if (!queries.data) return [];
    const qMap: Record<string, number> = {};
    for (const { code, dividends } of queries.data) {
      const w = (weights[code] || 0) / 100;
      for (const d of dividends) {
        const y = d.date.slice(2, 4);
        const m = Number(d.date.slice(5, 7));
        const q = Math.ceil(m / 3);
        const key = `${y}.Q${q}`;
        qMap[key] = (qMap[key] || 0) + (d.rate || 0) * w;
      }
    }
    let cum = 0;
    return Object.entries(qMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([quarter, rate]) => {
        cum += rate;
        return {
          month: quarter,
          rate: Math.round(rate * 10000) / 10000,
          cumRate: Math.round(cum * 100) / 100,
        };
      });
  })();

  // 연간분배율: dividendYieldTtm 가중평균
  const annualYield = (() => {
    let total = 0;
    let hasAny = false;
    for (const code of codes) {
      const etf = selected.find(s => s.code === code);
      const dy = etf?.dividendYield ?? 0;
      if (dy > 0) hasAny = true;
      total += dy * ((weights[code] || 0) / 100);
    }
    return hasAny ? Math.round(total * 100) / 100 : null;
  })();

  return { monthlyData, quarterlyData, annualYield, isLoading: queries.isLoading, rawData: queries.data };
}

export function PerformancePanel() {
  const { comparing, selected, weights, amounts } = useCanvasStore();
  const rc = useReturnColors();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const closePerfPanel = () => useCanvasStore.setState({ synthesized: false, performanceExpanded: false, performanceMinimized: false });

  const timeframes = [
    { label: '1W', value: '1w' },
    { label: '1M', value: '1m' },
    { label: '3M', value: '3m' },
    { label: '6M', value: '6m' },
    { label: 'YTD', value: 'ytd' },
    { label: '1Y', value: '1y' },
    { label: '3Y', value: '3y' },
  ];
  const [timeframe, setTimeframe] = useState(timeframes[5]); // Default 1Y
  const {
    performanceExpanded: expanded, togglePerformanceExpanded: toggleExpanded,
    performanceMinimized: minimized, setPerformanceMinimized: setMinimized,
    feedbackMinimized, setFeedbackMinimized, feedbackEnabled, feedbackText, feedbackLoading,
  } = useCanvasStore();

  const latestListedDate = comparing.reduce<Date | null>((latest, code) => {
    const etf = selected.find(s => s.code === code);
    if (!etf?.listedDate) return latest;
    const d = new Date(etf.listedDate);
    return !latest || d > latest ? d : latest;
  }, null);

  const periodToDays = (value: string): number => {
    if (value === 'ytd') {
      const now = new Date();
      return Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000);
    }
    const map: Record<string, number> = { '1w': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365, '3y': 1095 };
    return map[value] || 365;
  };

  const [now] = useState(() => Date.now());
  const isTimeframeAvailable = (value: string): boolean => {
    if (!latestListedDate) return true;
    const daysSinceListed = Math.ceil((now - latestListedDate.getTime()) / 86400000);
    return daysSinceListed >= periodToDays(value);
  };

  const totalAmount = comparing.reduce((sum, code) => sum + (amounts[code] || 0), 0);
  const isValid = totalAmount > 0 && comparing.length > 0;

  const simulateReq: SimulateRequest = {
    codes: comparing,
    weights: comparing.map(code => weights[code] || 0),
    amount: totalAmount || 10000000,
    period: timeframe.value,
  };

  const { data: simData, isLoading, isFetching } = useQuery({
    queryKey: ['etf-simulate', simulateReq],
    queryFn: () => api.simulate(simulateReq),
    enabled: isValid,
    placeholderData: keepPreviousData,
  });

  const synthExpense = (() => {
    if (!isValid || comparing.length === 0) return null;
    let sum = 0;
    let hasAny = false;
    for (const code of comparing) {
      const etf = selected.find(s => s.code === code);
      const ratio = etf?.expenseRatio ?? 0;
      if (etf?.expenseRatio) hasAny = true;
      sum += ratio * ((weights[code] || 0) / 100);
    }
    return hasAny ? sum * 100 : null;
  })();

  const synthReturn = simData?.totalReturn ?? null;
  const synthMdd = simData?.maxDrawdown ?? null;
  const synthAnnualized = simData?.annualizedReturn ?? null;

  const synthVolatility = (() => {
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

  const baseAmount = totalAmount || 10000000;
  const currentValue = synthReturn != null ? baseAmount * (1 + synthReturn / 100) : baseAmount;
  const periodDays = periodToDays(timeframe.value);
  const expenseAmount = synthExpense != null ? currentValue * synthExpense / 100 * (periodDays / 365) : null;
  const fmtExpenseAmount = (n: number) =>
    n >= 100_000_000 ? `${(n / 100_000_000).toFixed(1)}억`
    : n >= 10_000 ? `${(n / 10_000).toFixed(1).replace(/\.0$/, '')}만`
    : `${Math.round(n).toLocaleString()}`;
  const fmtExpenseRate = (v: number) => v.toFixed(3).replace(/0$/, '');
  const chartData = simData?.dailyValues?.map(d => {
    const [y, m, dd] = d.date.split('-');
    return {
      name: d.date,
      label: `${y.slice(2)}.${m}.${dd}`,
      value: Number((((d.value - baseAmount) / baseAmount) * 100).toFixed(2)),
    };
  }) || [];

  const { yTicks, yDomain } = (() => {
    if (chartData.length === 0) return { yTicks: [], yDomain: [0, 0] as [number, number] };
    const vals = chartData.map(d => d.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    
    // 수익률 차트는 0% 기준선이 중요하므로 판단 기준에 포함
    const visualMin = Math.min(0, rawMin);
    const visualMax = Math.max(0, rawMax);
    const visualRange = visualMax - visualMin || 1;

    // 타이트한 도메인(차트의 실제 렌더링 영역) 설정을 위한 올림/내림 단위
    const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500];
    const boundUnit = nice.find(s => visualRange / s <= 20) ?? 10;
    
    const domainMin = Math.floor(visualMin / boundUnit) * boundUnit;
    const domainMax = Math.ceil(visualMax / boundUnit) * boundUnit;
    
    // Ticks(눈금 표시) 간격: Y축을 4~6 분할하는 가장 깔끔한 숫자
    const roughStep = (domainMax - domainMin) / 5;
    const step = nice.find(s => s >= roughStep) ?? 50;

    const ticks: number[] = [];
    const minTickMultiplier = Math.ceil(domainMin / step);
    const maxTickMultiplier = Math.floor(domainMax / step);
    
    // 정식 간격(step)에 해당하는 눈금만 라벨링
    for (let i = minTickMultiplier; i <= maxTickMultiplier; i++) {
      ticks.push(i * step);
    }
    
    // 수익률 차트의 상징인 0%는 무조건 포함시킴
    if (!ticks.includes(0) && domainMin <= 0 && domainMax >= 0) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    
    // 극단 경계값(-10, 170 등)을 억지로 틱에 추가하면 (0, 150과) 텍스트가 겹치므로
    // 경계값은 단순히 도메인 공간 확보용으로만 사용하고, 눈금(ticks)에서는 제외하여 깔끔하게 표시 (업계 표준)
    const pad = visualRange * 0.03 || 5;
    
    return { 
      yTicks: ticks, 
      yDomain: [domainMin - pad, domainMax + pad] as [number, number] 
    };
  })();

  const emptyState = comparing.length === 0
    ? '합성할 ETF를 선택해 주세요.'
    : !isValid
      ? '비중의 합을 100%로 맞춰주세요.'
      : null;

  const { monthlyData } = usePortfolioDividends(comparing, weights, selected);
  const filteredDividendData = (() => {
    const src = monthlyData;
    const now = new Date();
    const cutoff = new Date();
    const v = timeframe.value;
    if (v === '1w') cutoff.setDate(now.getDate() - 7);
    else if (v === '1m') cutoff.setMonth(now.getMonth() - 1);
    else if (v === '3m') cutoff.setMonth(now.getMonth() - 3);
    else if (v === '6m') cutoff.setMonth(now.getMonth() - 6);
    else if (v === '1y') cutoff.setFullYear(now.getFullYear() - 1);
    else if (v === 'ytd') { cutoff.setMonth(0); cutoff.setDate(1); }
    else if (v === '3y') cutoff.setFullYear(now.getFullYear() - 3);
    else if (v === '5y') cutoff.setFullYear(now.getFullYear() - 5);
    else if (v === 'max') return src;
    const threshold = `${String(cutoff.getFullYear()).slice(2)}.${String(cutoff.getMonth() + 1).padStart(2, '0')}`;
    // 필터 후 cumRate 재계산
    const filtered = src.filter(d => d.month >= threshold);
    let cum = 0;
    return filtered.map(d => {
      cum += d.rate;
      return { ...d, cumRate: Math.round(cum * 100) / 100 };
    });
  })();
  const dividendData = filteredDividendData;

  const isGrowthPositive = (synthReturn ?? 0) >= 0;
  const growthColor = rc.hex(isGrowthPositive);
  const growthGradId = isGrowthPositive ? 'growthGrad-pos' : 'growthGrad-neg';
  const showLoading = isLoading || (!simData && isFetching);

  return (
    <div className={`${minimized ? '' : expanded ? 'flex-1' : 'h-[380px]'} border-t bg-background flex flex-col z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative`}>
      {/* Header */}
      <div
        className={`flex justify-between items-center px-5 shrink-0 ${minimized ? 'py-2.5 cursor-pointer hover:bg-muted/50 transition-colors' : 'pt-4 pb-3'}`}
        onClick={minimized ? () => setMinimized(false) : undefined}
      >
        <div className="flex items-center gap-3">
          {/* macOS traffic light buttons */}
          {minimized ? (
            <button
              onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
              className="group/single w-3.5 h-3.5 rounded-full bg-[#febc2e] hover:brightness-90 transition-all flex items-center justify-center"
              title="펼치기"
            >
              <svg className="w-[8px] h-[8px] opacity-0 group-hover/single:opacity-100 transition-opacity" viewBox="0 0 12 12" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" strokeLinecap="round"><path d="M1.5 6h9" /></svg>
            </button>
          ) : expanded ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
              className="group/single w-3.5 h-3.5 rounded-full bg-[#28c840] hover:brightness-90 transition-all flex items-center justify-center"
              title="축소"
            >
              <Minimize2 className="w-[8px] h-[8px] opacity-0 group-hover/single:opacity-100 transition-opacity text-black/50" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="group/traffic flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); setCloseDialogOpen(true); }}
                className="w-3.5 h-3.5 rounded-full bg-[#ff5f57] hover:brightness-90 transition-all flex items-center justify-center"
                title="닫기"
              >
                <svg className="w-[8px] h-[8px] opacity-0 group-hover/traffic:opacity-100 transition-opacity" viewBox="0 0 12 12" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" strokeLinecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMinimized(true); }}
                className="w-3.5 h-3.5 rounded-full bg-[#febc2e] hover:brightness-90 transition-all flex items-center justify-center"
                title="접기"
              >
                <svg className="w-[8px] h-[8px] opacity-0 group-hover/traffic:opacity-100 transition-opacity" viewBox="0 0 12 12" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" strokeLinecap="round"><path d="M1.5 6h9" /></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
                className="w-3.5 h-3.5 rounded-full bg-[#28c840] hover:brightness-90 transition-all flex items-center justify-center"
                title="확대"
              >
                <Maximize2 className="w-[8px] h-[8px] opacity-0 group-hover/traffic:opacity-100 transition-opacity text-black/50" strokeWidth={2.5} />
              </button>
            </div>
          )}
          <h2 className="font-bold text-[15px]">포트폴리오 퍼포먼스</h2>
          {feedbackEnabled && !feedbackLoading && feedbackMinimized && feedbackText && (
            <button
              onClick={(e) => { e.stopPropagation(); setFeedbackMinimized(false); }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors text-xs font-medium"
            >
              <Sparkles className="w-3 h-3 animate-[sparkle_1.5s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 0 3px #f59e0b)' }} />
              피드백
            </button>
          )}
          {minimized && simData && (
            <span className={`text-sm font-bold tabular-nums ml-1 ${synthReturn != null && synthReturn >= 0 ? rc.upClass : rc.downClass}`}>
              {synthReturn != null ? `${synthReturn >= 0 ? '+' : ''}${synthReturn.toFixed(2)}%` : ''}
            </span>
          )}
        </div>
        {!minimized && (
          <div className="flex bg-muted/40 rounded-md p-0.5 border">
            {timeframes.map(tf => (
              <button
                key={tf.value}
                disabled={!isValid || isLoading || !isTimeframeAvailable(tf.value)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors ${
                  timeframe.value === tf.value
                    ? 'bg-slate-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60'
                } disabled:opacity-40`}
                onClick={() => setTimeframe(tf)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {minimized ? null : emptyState ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm bg-muted/10 rounded-lg border border-dashed mx-5 mb-4">
          {emptyState}
        </div>
      ) : showLoading ? (
        <div className="flex-1 flex flex-col gap-3 px-5 pb-4">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[72px] rounded-lg" />)}
          </div>
          <div className="flex-1 grid grid-cols-[1.6fr_1fr_1.4fr] gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-full rounded-lg" />)}
          </div>
        </div>
      ) : (
        <div className={`flex-1 min-h-0 flex flex-col gap-3 px-5 pb-4 transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
          {expanded ? (
            <>
              {/* 확장: 성장추이 전체 가로 → 지표카드 → 자산구성+분배금 2열 */}
              <div className="rounded-xl border border-border/70 bg-muted/5 p-3 flex flex-col min-h-0 flex-1">
                <h3 className="text-[14px] font-extrabold text-foreground/80 mb-2 shrink-0">포트폴리오 성장 추이</h3>
                <div key={`${timeframe.value}-${chartData.length}-${expanded}`} className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id={growthGradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={growthColor} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={growthColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" strokeOpacity={0.3} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }} dy={8} minTickGap={50} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }} tickFormatter={(v) => `${Math.round(v)}%`} ticks={yTicks} domain={yDomain} interval={0} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="value" stroke={growthColor} strokeWidth={2} fillOpacity={1} fill={`url(#${growthGradId})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 shrink-0">
                <MetricCard
                  title={`수익률 (${timeframe.label})`}
                  value={synthReturn}
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  tooltip={<><p className="font-medium mb-1">선택 기간의 포트폴리오 총 수익률</p><p className="text-muted-foreground">(최종값 − 초기값) / 초기값 × 100</p></>}
                />
                <MetricCard
                  title="연환산 수익률"
                  value={synthAnnualized}
                  tooltip={<><p className="font-medium mb-1">복리(CAGR) 기준 1년 환산 수익률</p><p className="text-muted-foreground">(1 + R)<sup>365/기간일수</sup> − 1</p></>}
                />
                <MetricCard
                  title="최대낙폭(MDD)"
                  value={synthMdd}
                  neutral
                  tooltip={<><p className="font-medium mb-1">고점 대비 최대 하락 폭</p><p className="text-muted-foreground">(고점 − 저점) / 고점 × 100</p></>}
                />
                <MetricCard
                  title="평균 변동성"
                  value={synthVolatility}
                  neutral
                  tooltip={<><p className="font-medium mb-1">일별 수익률의 연환산 표준편차</p><p className="text-muted-foreground">σ<sub>daily</sub> × √252</p></>}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 shrink-0 h-[200px]">
                <div className="rounded-xl border border-border/70 bg-muted/5 p-3 flex flex-col items-center min-h-0">
                  <div className="flex items-center justify-between w-full mb-2 shrink-0">
                    <h3 className="text-[14px] font-extrabold text-foreground/80">자산 구성</h3>
                    {synthExpense != null && expenseAmount != null && (
                      <ExpenseLabel expense={synthExpense} expenseAmount={expenseAmount} timeframeLabel={timeframe.label} periodDays={periodDays} fmtAmount={fmtExpenseAmount} fmtRate={fmtExpenseRate} />
                    )}
                  </div>
                  <CategoryPie comparingCodes={comparing} selected={selected} weights={weights} />
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/5 p-3 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <DividendTitle />
                    <div className="flex flex-col items-end gap-0.5 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> 분배율{dividendData.length > 0 ? ` (평균 ${(dividendData.reduce((s, d) => s + d.rate, 0) / dividendData.length).toFixed(2)}%)` : ''}</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-[1.5px] bg-amber-500 inline-block rounded" /> 누적{dividendData.length > 0 ? ` (${dividendData[dividendData.length - 1].cumRate}%)` : ''}</span>
                    </div>
                  </div>
                  <DividendChart data={dividendData} />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 축소: 지표카드 4열 → 3열 차트 → 시뮬레이션 */}
              <div className="grid grid-cols-4 gap-3 shrink-0">
                <MetricCard
                  title={`수익률 (${timeframe.label})`}
                  value={synthReturn}
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  tooltip={<><p className="font-medium mb-1">선택 기간의 포트폴리오 총 수익률</p><p className="text-muted-foreground">(최종값 − 초기값) / 초기값 × 100</p></>}
                />
                <MetricCard
                  title="연환산 수익률"
                  value={synthAnnualized}
                  tooltip={<><p className="font-medium mb-1">복리(CAGR) 기준 1년 환산 수익률</p><p className="text-muted-foreground">(1 + R)<sup>365/기간일수</sup> − 1</p></>}
                />
                <MetricCard
                  title="최대낙폭(MDD)"
                  value={synthMdd}
                  neutral
                  tooltip={<><p className="font-medium mb-1">고점 대비 최대 하락 폭</p><p className="text-muted-foreground">(고점 − 저점) / 고점 × 100</p></>}
                />
                <MetricCard
                  title="평균 변동성"
                  value={synthVolatility}
                  neutral
                  tooltip={<><p className="font-medium mb-1">일별 수익률의 연환산 표준편차</p><p className="text-muted-foreground">σ<sub>daily</sub> × √252</p></>}
                />
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-[1.6fr_1fr_1.4fr] gap-3">
                <div className="rounded-xl border border-border/70 bg-muted/5 p-3 flex flex-col min-h-0">
                  <h3 className="text-[14px] font-extrabold text-foreground/80 mb-2 shrink-0">포트폴리오 성장 추이</h3>
                  <div key={`${timeframe.value}-${chartData.length}-${expanded}`} className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id={growthGradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={growthColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={growthColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" strokeOpacity={0.3} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }} dy={8} minTickGap={50} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }} tickFormatter={(v) => `${Math.round(v)}%`} ticks={yTicks} domain={yDomain} interval={0} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="value" stroke={growthColor} strokeWidth={2} fillOpacity={1} fill={`url(#${growthGradId})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/5 p-3 flex flex-col items-center min-h-0">
                  <div className="flex items-center justify-between w-full mb-2 shrink-0">
                    <h3 className="text-[14px] font-extrabold text-foreground/80">자산 구성</h3>
                    {synthExpense != null && expenseAmount != null && (
                      <ExpenseLabel expense={synthExpense} expenseAmount={expenseAmount} timeframeLabel={timeframe.label} periodDays={periodDays} fmtAmount={fmtExpenseAmount} fmtRate={fmtExpenseRate} />
                    )}
                  </div>
                  <CategoryPie comparingCodes={comparing} selected={selected} weights={weights} />
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/5 p-3 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <DividendTitle />
                    <div className="flex flex-col items-end gap-0.5 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> 분배율{dividendData.length > 0 ? ` (평균 ${(dividendData.reduce((s, d) => s + d.rate, 0) / dividendData.length).toFixed(2)}%)` : ''}</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-[1.5px] bg-amber-500 inline-block rounded" /> 누적{dividendData.length > 0 ? ` (${dividendData[dividendData.length - 1].cumRate}%)` : ''}</span>
                    </div>
                  </div>
                  <DividendChart data={dividendData} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>퍼포먼스 패널을 닫을까요?</AlertDialogTitle>
            <AlertDialogDescription>합성 결과가 초기화돼요.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={closePerfPanel}>닫기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) {
  const rc = useReturnColors();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const [y, m, dd] = d.name.split('-');
  const val = d.value;
  const isPositive = val >= 0;
  return (
    <div className="rounded-lg border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <p className="text-[11px] text-muted-foreground mb-0.5">{`${y}.${m}.${dd}`}</p>
      <p className={`text-sm font-bold ${rc.cls(isPositive)}`}>
        수익률 {isPositive ? '+' : ''}{val.toFixed(2)}%
      </p>
    </div>
  );
}

function MetricCard({ title, value, icon, neutral, tooltip, customDisplay, compact }: {
  title: string;
  value: number | null;
  icon?: React.ReactNode;
  neutral?: boolean;
  tooltip?: React.ReactNode;
  customDisplay?: string;
  compact?: boolean;
}) {
  const [showTip, setShowTip] = useState(false);
  const isPositive = value != null && value > 0;
  const isNegative = value != null && value < 0;
  const rc = useReturnColors();
  const valueColor = neutral
    ? 'text-foreground'
    : isPositive ? rc.upClass : isNegative ? rc.downClass : 'text-foreground';
  const prefix = neutral ? '' : isPositive ? '+' : '';
  const display = customDisplay ?? (value != null ? `${prefix}${Math.abs(value).toFixed(2)}%` : '-');

  if (compact) {
    return (
      <div className="rounded-lg border border-border/40 bg-muted/5 px-2.5 py-2 flex flex-col gap-0.5 relative min-w-[100px]">
        <div className="flex items-center gap-1">
          {tooltip ? (
            <span
              className="text-[10px] font-semibold text-muted-foreground border-b border-dashed border-muted-foreground/30 cursor-help"
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
            >
              {title}
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground">{title}</span>
          )}
          {showTip && tooltip && (
            <div className="absolute top-full left-0 mt-1 z-50 px-3 py-2 rounded-lg border bg-popover shadow-lg text-[11px] text-left w-[220px] animate-in fade-in zoom-in-95 duration-100">
              {tooltip}
            </div>
          )}
        </div>
        <span className={`text-[15px] font-extrabold tabular-nums tracking-tight leading-none ${valueColor}`}>
          {display}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/5 px-4 py-3 flex items-center justify-between gap-3 relative">
      <div className="flex items-center gap-1.5 shrink-0">
        {tooltip ? (
          <span
            className="text-[13px] font-bold text-muted-foreground border-b border-dashed border-muted-foreground/30 cursor-help"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            {title}
          </span>
        ) : (
          <span className="text-[13px] font-bold text-muted-foreground">{title}</span>
        )}
        {showTip && tooltip && (
          <div className="absolute top-full left-0 mt-1 z-50 px-3 py-2 rounded-lg border bg-popover shadow-lg text-[11px] text-left w-[240px] animate-in fade-in zoom-in-95 duration-100">
            {tooltip}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {icon && <span className={`${valueColor} opacity-70`}>{icon}</span>}
        <span className={`text-[22px] font-extrabold tabular-nums tracking-tight leading-none ${valueColor}`}>
          {display}
        </span>
      </div>
    </div>
  );
}

function CategoryPie({ comparingCodes, selected, weights }: {
  comparingCodes: string[];
  selected: { code: string; categories: string[] }[];
  weights: Record<string, number>;
}) {
  const comparingEtfs = selected.filter((e) => comparingCodes.includes(e.code));
  const catWeights: Record<string, number> = {};
  for (const etf of comparingEtfs) {
    const cat = etf.categories[0] || '기타';
    catWeights[cat] = (catWeights[cat] || 0) + (weights[etf.code] || 0);
  }
  const data = Object.entries(catWeights).map(([name, value]) => ({ name, value }));
  if (data.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-1 justify-center">
      <div className="shrink-0 relative" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={getCatHex(entry.name)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] text-muted-foreground/70 font-semibold leading-tight text-center">총 자산<br />구성</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: getCatHex(d.name) }} />
            <span className="text-muted-foreground truncate">{d.name}</span>
            <span className="font-semibold ml-auto tabular-nums">{Math.round(d.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DividendChart({ data }: { data: { month: string; rate: number; cumRate: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground/50 text-xs">
        분배금 내역 없음
      </div>
    );
  }
  return (
    <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 2, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="divBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.85} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/20" strokeOpacity={0.2} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.35 }} dy={4} minTickGap={16} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.4 }} tickFormatter={(v) => `${v}%`} width={40} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={false} width={0} />
            <Tooltip
              cursor={{ fill: 'currentColor', opacity: 0.04 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-md border bg-popover/95 backdrop-blur-sm px-2.5 py-1.5 shadow-lg text-[10px]">
                    <p className="text-muted-foreground/70 mb-0.5 font-medium">{d.monthFull}</p>
                    <div className="space-y-0.5">
                      <p>분배금 <span className="font-bold">{d.amount.toLocaleString()}원</span></p>
                      <div className="flex items-center gap-3">
                        <span>분배율 <span className="font-bold text-blue-500">{d.rate}%</span></span>
                        <span>누적 <span className="font-bold text-amber-600">{d.cumRate}%</span></span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar yAxisId="left" dataKey="rate" fill="url(#divBarGrad)" radius={[2, 2, 0, 0]} barSize={data.length > 12 ? 10 : data.length > 6 ? 16 : 22} />
            <Line yAxisId="right" type="monotone" dataKey="cumRate" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
          </ComposedChart>
        </ResponsiveContainer>
    </div>
  );
}

function DividendTitle() {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <h3
        className="text-[14px] font-extrabold text-foreground/80 border-b border-dashed border-muted-foreground/30 cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        분배금 내역 추이
      </h3>
      {show && (
        <div className="absolute top-full left-0 mt-1 z-50 px-3 py-2 rounded-lg border bg-popover shadow-lg text-[11px] text-left w-[220px] animate-in fade-in zoom-in-95 duration-100">
          <p className="font-medium mb-1">주당 분배금 × 비중 가중 합산</p>
          <p className="text-muted-foreground">각 ETF의 월별 분배율(%)을 포트폴리오 비중으로 가중 합산한 값이에요. 누적 라인은 선택 기간 내 총 분배율이에요.</p>
        </div>
      )}
    </div>
  );
}

function ExpenseLabel({ expense, expenseAmount, timeframeLabel, periodDays, fmtAmount, fmtRate }: {
  expense: number;
  expenseAmount: number;
  timeframeLabel: string;
  periodDays: number;
  fmtAmount: (n: number) => string;
  fmtRate: (v: number) => string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="text-[11px] text-muted-foreground relative">
      <span
        className="border-b border-dashed border-muted-foreground/30 cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        운용보수
      </span>
      {' '}<span className="font-semibold text-foreground">{fmtAmount(expenseAmount)}원({fmtRate(expense)}%)</span>
      {show && (
        <div className="absolute top-full right-0 mt-1 z-50 px-3 py-2 rounded-lg border bg-popover shadow-lg text-[11px] text-left w-[260px] animate-in fade-in zoom-in-95 duration-100">
          <p className="font-medium mb-1">종합 운용보수 (가중평균)</p>
          <p className="text-muted-foreground mb-2">각 ETF의 총보수를 포트폴리오 비중으로 가중 합산한 연간 운용보수에요. 운용보수는 수익률에서 이미 차감된 비용이에요.</p>
          <p className="font-medium mb-1">{timeframeLabel} 기간 계산식</p>
          <p className="text-muted-foreground font-mono">평가금 × {fmtRate(expense)}% × ({periodDays}/365)</p>
        </div>
      )}
    </span>
  );
}
