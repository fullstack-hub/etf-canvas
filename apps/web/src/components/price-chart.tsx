'use client';

import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, LineChart, Line, ReferenceLine } from 'recharts';
import type { ETFDailyPrice } from '@etf-canvas/shared';
import { useReturnColors } from '@/lib/return-colors';

interface Props {
  data: ETFDailyPrice[];
  compact?: boolean;
}

export function PriceChart({ data, compact }: Props) {
  if (!data.length) return <div className="text-muted-foreground text-center py-8 text-sm">데이터 없음</div>;

  const rc = useReturnColors();

  if (compact) {
    const basePrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const isPositive = lastPrice >= basePrice;
    const lineColor = rc.hex(isPositive);
    const gradId = isPositive ? 'areaGrad-pos' : 'areaGrad-neg';
    const chartData = data.map((d) => ({
      date: d.date,
      value: Math.round(((d.close - basePrice) / basePrice) * 10000) / 100,
    }));

    // X축: 데이터 기간에 따라 월 단위 or 균등 분할
    const len = chartData.length;
    const spanMonths = (() => {
      const first = chartData[0].date.split('-');
      const last = chartData[len - 1].date.split('-');
      return (Number(last[0]) - Number(first[0])) * 12 + Number(last[1]) - Number(first[1]);
    })();
    const xTicks = (() => {
      const seen = new Set<string>();
      const ticks: string[] = [];
      // 월 건너뛰기: 6개월 이상이면 2개월마다, 아니면 매월
      const skip = spanMonths >= 6 ? 2 : 1;
      let count = 0;
      chartData.forEach(d => {
        const m = d.date.slice(0, 7);
        if (!seen.has(m)) {
          seen.add(m);
          if (count % skip === 0) ticks.push(d.date);
          count++;
        }
      });
      return ticks;
    })();

    // Y축 틱
    const vals = chartData.map(d => d.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const visualMin = Math.min(0, rawMin);
    const visualMax = Math.max(0, rawMax);
    const visualRange = visualMax - visualMin || 1;

    const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500];
    const boundUnit = nice.find(s => visualRange / s <= 20) ?? 10;
    
    const domainMin = Math.floor(visualMin / boundUnit) * boundUnit;
    const domainMax = Math.ceil(visualMax / boundUnit) * boundUnit;
    
    const roughStep = (domainMax - domainMin) / 2;
    const step = nice.find(s => s >= roughStep) ?? 10;

    const yTicks: number[] = [];
    const minTickMultiplier = Math.ceil(domainMin / step);
    const maxTickMultiplier = Math.floor(domainMax / step);
    
    for (let i = minTickMultiplier; i <= maxTickMultiplier; i++) {
      yTicks.push(i * step);
    }
    
    // 0%는 언제나 표시되도록 억지라도 추가
    if (!yTicks.includes(0) && domainMin <= 0 && domainMax >= 0) {
      yTicks.push(0);
      yTicks.sort((a, b) => a - b);
    }
    
    const pad = visualRange * 0.05 || 2;
    const yDomain: [number, number] = [domainMin - pad, domainMax + pad];

    const fmtDate = (d: string) => `${Number(d.split('-')[1])}월`;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 12, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            dy={8}
            tick={{ fontSize: 10, fill: '#666' }}
            ticks={xTicks}
            tickFormatter={fmtDate}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#666' }}
            tickFormatter={(val) => `${Math.round(val)}%`}
            ticks={yTicks}
            domain={yDomain}
            width={38}
            interval={0}
          />
          <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="3 3" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const val = d.value as number;
              return (
                <div className="rounded border border-border bg-popover/95 backdrop-blur-sm px-2 py-1 shadow-md">
                  <p className="text-[10px] text-muted-foreground">{d.date}</p>
                  <p className="text-xs font-bold">{val >= 0 ? '+' : ''}{val.toFixed(2)}%</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: lineColor, stroke: 'var(--background)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v: number) => v.toLocaleString()}
        />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString() + '원', '종가']}
          labelFormatter={(label: string) => label}
        />
        <Line type="monotone" dataKey="close" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
