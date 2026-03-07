'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { SimulateRequest } from '@etf-canvas/shared';

const PIE_COLORS: Record<string, string> = {
  '국내 대표지수': '#3b82f6',
  '해외 대표지수': '#06b6d4',
  '섹터/테마': '#8b5cf6',
  '액티브': '#a855f7',
  '채권': '#10b981',
  '혼합': '#14b8a6',
  '원자재': '#f59e0b',
  '레버리지/인버스': '#ef4444',
};

export function PerformancePanel() {
    const { comparing, selected, weights } = useCanvasStore();

    const timeframes = [
        { label: '1W', value: '1w' },
        { label: '1M', value: '1m' },
        { label: '3M', value: '3m' },
        { label: '6M', value: '6m' },
        { label: 'YTD', value: 'ytd' },
        { label: '1Y', value: '1y' },
        { label: '3Y', value: '3y' },
    ];
    const [timeframe, setTimeframe] = useState(timeframes[2]); // Default 3M
    const { performanceExpanded: expanded, togglePerformanceExpanded: toggleExpanded } = useCanvasStore();

    // comparing ETF 중 가장 최근 상장일 기준으로 선택 가능 기간 판단
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

    const isTimeframeAvailable = (value: string): boolean => {
        if (!latestListedDate) return true;
        const daysSinceListed = Math.ceil((Date.now() - latestListedDate.getTime()) / 86400000);
        return daysSinceListed >= periodToDays(value);
    };

    const totalWeight = comparing.reduce((sum, code) => sum + (weights[code] || 0), 0);
    const isValid = totalWeight === 100 && comparing.length > 0;

    const simulateReq: SimulateRequest = {
        codes: comparing,
        weights: comparing.map(code => weights[code] || 0),
        amount: 10000000, // 10M base
        period: timeframe.value,
    };

    const { data: simData, isLoading, isFetching } = useQuery({
        queryKey: ['etf-simulate', simulateReq],
        queryFn: () => api.simulate(simulateReq),
        enabled: isValid,
        placeholderData: keepPreviousData,
    });

    // Calculate synthesized expense ratio from the `selected` store items simply by weighted sum
    const synthExpense = (() => {
        if (!isValid || comparing.length === 0) return null;
        let sum = 0;
        for (const code of comparing) {
            const etf = selected.find(s => s.code === code);
            if (!etf?.expenseRatio) return null; // Can't calculate accurately if any is missing
            const w = (weights[code] || 0) / 100;
            sum += etf.expenseRatio * w;
        }
        return sum * 100;
    })();

    const synthReturn = simData?.totalReturn ?? null;
    const synthMdd = simData?.maxDrawdown ?? null;

    // 일별 수익률의 표준편차 → 연환산 변동성
    const synthVolatility = (() => {
        const dv = simData?.dailyValues;
        if (!dv || dv.length < 2) return null;
        const dailyReturns: number[] = [];
        for (let i = 1; i < dv.length; i++) {
            dailyReturns.push((dv[i].value - dv[i - 1].value) / dv[i - 1].value);
        }
        const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (dailyReturns.length - 1);
        const dailyStd = Math.sqrt(variance);
        return Math.round(dailyStd * Math.sqrt(252) * 10000) / 100; // 연환산 %
    })();

    const chartData = simData?.dailyValues?.map(d => {
        const [y, m, dd] = d.date.split('-');
        return {
            name: d.date, // full date for tooltip
            label: `${y.slice(2)}.${m}.${dd}`, // YY.MM.DD for X-axis
            value: Number((((d.value - 10000000) / 10000000) * 100).toFixed(2)),
        };
    }) || [];

    return (
        <div className={`${expanded ? 'flex-1' : 'h-[340px]'} border-t bg-background p-5 flex flex-col z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative`}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg">포트폴리오 퍼포먼스</h2>
                    <button
                        onClick={toggleExpanded}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/60"
                        title={expanded ? '축소' : '확대'}
                    >
                        {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
                <div className="flex bg-muted/40 rounded-md p-0.5 border">
                    {timeframes.map(tf => (
                        <button
                            key={tf.value}
                            disabled={!isValid || isLoading || !isTimeframeAvailable(tf.value)}
                            className={`px-3 py-1 text-xs font-semibold rounded-sm transition-colors ${(timeframe.value === tf.value) ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60'} disabled:opacity-50`}
                            onClick={() => setTimeframe(tf)}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {comparing.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm bg-muted/10 rounded-lg border border-dashed">
                    합성할 ETF를 선택해 주세요.
                </div>
            ) : !isValid ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm bg-muted/10 rounded-lg border border-dashed">
                    우측 속성 패널에서 비중의 합을 100%로 맞춰주시면 결과를 확인할 수 있습니다.
                </div>
            ) : isLoading || (!simData && isFetching) ? (
                <div className="flex-1 flex gap-8">
                    <div className="flex-[2]"><Skeleton className="h-full w-full rounded-lg" /></div>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-full rounded-lg" />)}
                    </div>
                </div>
            ) : expanded ? (
                /* Expanded: chart top, metrics bottom row */
                <div className={`flex-1 min-h-0 flex flex-col gap-4 transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="flex-1 min-h-0" style={{ minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={true} stroke="currentColor" className="text-muted/30" strokeOpacity={0.3} />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} dy={10} minTickGap={40} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} tickFormatter={(val) => `${val}%`} domain={[(min: number) => Math.floor(min / 10) * 10, (max: number) => Math.ceil(max / 10) * 10]} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0].payload;
                                        const [y, m, dd] = d.name.split('-');
                                        const val = d.value as number;
                                        const isPositive = val >= 0;
                                        return (
                                            <div className="rounded-lg border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-xl">
                                                <p className="text-[11px] text-muted-foreground mb-1">{`${y}.${m}.${dd}`}</p>
                                                <p className={`text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    수익률 {isPositive ? '+' : ''}{val.toFixed(2)}%
                                                </p>
                                            </div>
                                        );
                                    }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-8 shrink-0">
                        <MetricCard title={`수익률 (${timeframe.label})`} value={synthReturn} suffix="%" tooltip={<><p className="font-medium mb-1">선택 기간의 포트폴리오 총 수익률</p><p className="text-muted-foreground">(최종값 − 초기값) / 초기값 × 100</p></>} />
                        <MetricCard title="연환산 수익률" value={simData?.annualizedReturn ?? null} suffix="%" tooltip={<><p className="font-medium mb-1">복리(CAGR) 기준 1년 환산 수익률</p><p className="text-muted-foreground">(1 + R)<sup>365/기간일수</sup> − 1</p></>} />
                        <MetricCard title="최대낙폭(MDD)" value={synthMdd} suffix="%" tooltip={<><p className="font-medium mb-1">고점 대비 최대 하락 폭</p><p className="text-muted-foreground">(고점 − 저점) / 고점 × 100</p></>} />
                        <MetricCard title="평균 변동성" value={synthVolatility} suffix="%" tooltip={<><p className="font-medium mb-1">일별 수익률의 연환산 표준편차</p><p className="text-muted-foreground">σ<sub>daily</sub> × √252</p></>} />
                        <MetricCard title="종합 운용보수" value={synthExpense} suffix="%" formatter={(v) => v.toFixed(3)} tooltip={<><p className="font-medium mb-1">비중 가중 평균 운용보수</p><p className="text-muted-foreground">Σ(보수<sub>i</sub> × 비중<sub>i</sub>)</p></>} />
                        <div className="ml-auto">
                            <CategoryPie comparingCodes={comparing} selected={selected} />
                        </div>
                    </div>
                </div>
            ) : (
                /* Collapsed: chart left + metrics grid right */
                <div className={`flex-1 flex gap-4 min-h-0 transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
                    {/* 수익률 차트 카드 */}
                    <div className="flex-1 h-full rounded-xl bg-muted/15 border border-border/40 p-3" style={{ minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={true} stroke="currentColor" className="text-muted/30" strokeOpacity={0.3} />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} dy={10} minTickGap={40} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} tickFormatter={(val) => `${val}%`} domain={[(min: number) => Math.floor(min / 10) * 10, (max: number) => Math.ceil(max / 10) * 10]} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null;
                                        const d = payload[0].payload;
                                        const [y, m, dd] = d.name.split('-');
                                        const val = d.value as number;
                                        const isPositive = val >= 0;
                                        return (
                                            <div className="rounded-lg border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-xl">
                                                <p className="text-[11px] text-muted-foreground mb-1">{`${y}.${m}.${dd}`}</p>
                                                <p className={`text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    수익률 {isPositive ? '+' : ''}{val.toFixed(2)}%
                                                </p>
                                            </div>
                                        );
                                    }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* 카테고리 분포 카드 */}
                    <div className="shrink-0 rounded-xl bg-muted/15 border border-border/40 p-3 flex items-center">
                        <CategoryPie comparingCodes={comparing} selected={selected} />
                    </div>
                    {/* 메트릭 카드 */}
                    <div className="shrink-0 rounded-xl bg-muted/15 border border-border/40 p-4 flex flex-col justify-center gap-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <MetricCard title={`수익률 (${timeframe.label})`} value={synthReturn} suffix="%" tooltip={<><p className="font-medium mb-1">선택 기간의 포트폴리오 총 수익률</p><p className="text-muted-foreground">(최종값 − 초기값) / 초기값 × 100</p></>} />
                            <MetricCard title="연환산 수익률" value={simData?.annualizedReturn ?? null} suffix="%" tooltip={<><p className="font-medium mb-1">복리(CAGR) 기준 1년 환산 수익률</p><p className="text-muted-foreground">(1 + R)<sup>365/기간일수</sup> − 1</p></>} />
                            <MetricCard title="최대낙폭(MDD)" value={synthMdd} suffix="%" tooltip={<><p className="font-medium mb-1">고점 대비 최대 하락 폭</p><p className="text-muted-foreground">(고점 − 저점) / 고점 × 100</p></>} />
                            <MetricCard title="평균 변동성" value={synthVolatility} suffix="%" tooltip={<><p className="font-medium mb-1">일별 수익률의 연환산 표준편차</p><p className="text-muted-foreground">σ<sub>daily</sub> × √252</p></>} />
                        </div>
                        {synthExpense !== null && (
                            <div className="text-xs text-muted-foreground text-right">
                                종합 운용보수 <span className="font-bold text-foreground">{synthExpense.toFixed(3)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, suffix, formatter, tooltip }: { title: string, value: number | null, suffix: string, formatter?: (v: number) => string, tooltip?: React.ReactNode }) {
    const [showTip, setShowTip] = useState(false);
    const displayValue = value === null ? '-' : (formatter ? formatter(value) : Math.abs(value).toFixed(2));
    const isPositive = value !== null && value > 0 && title.includes('수익률');
    const isNegative = value !== null && value < 0;

    const valueColor = isPositive ? 'text-emerald-600' : (isNegative ? 'text-destructive' : 'text-foreground');
    const prefix = isPositive ? '+' : (isNegative ? '-' : '');

    return (
        <div className="flex flex-col justify-start text-right relative">
            <h3
                className={`text-sm font-semibold text-muted-foreground mb-1 ${tooltip ? 'cursor-help border-b border-dashed border-muted-foreground/30 inline-block ml-auto' : ''}`}
                onMouseEnter={() => tooltip && setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
            >
                {title}
            </h3>
            {showTip && tooltip && (
                <div className="absolute bottom-full right-0 mb-1 z-50 px-3 py-2 rounded-lg border bg-popover shadow-lg text-[11px] text-left w-[240px] animate-in fade-in zoom-in-95 duration-100">
                    {tooltip}
                </div>
            )}
            <div className={`text-[2rem] leading-none font-bold tracking-tight ${valueColor}`}>
                {value !== null ? `${prefix}${displayValue}` : '-'}{value !== null && <span className="text-lg opacity-80">{suffix}</span>}
            </div>
        </div>
    );
}

function CategoryPie({ comparingCodes, selected, compact }: { comparingCodes: string[]; selected: { code: string; categories: string[] }[]; compact?: boolean }) {
    const comparingEtfs = selected.filter((e) => comparingCodes.includes(e.code));
    const catCounts: Record<string, number> = {};
    for (const etf of comparingEtfs) {
        const cat = etf.categories[0] || '기타';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const data = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

    if (data.length === 0) return null;

    const pieSize = compact ? 60 : 120;
    const inner = compact ? 15 : 30;
    const outer = compact ? 28 : 55;

    return (
        <div className={`flex items-center shrink-0 ${compact ? 'gap-0' : 'gap-4 w-[240px]'}`}>
            <div className="shrink-0" style={{ width: pieSize, height: pieSize }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={inner}
                            outerRadius={outer}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry) => (
                                <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94a3b8'} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            {!compact && (
                <div className="flex flex-col gap-1 min-w-0">
                    {data.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[d.name] || '#94a3b8' }} />
                            <span className="text-muted-foreground truncate">{d.name}</span>
                            <span className="font-semibold ml-auto tabular-nums">{d.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
