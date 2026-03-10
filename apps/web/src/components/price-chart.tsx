'use client';

import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, LineChart, Line } from 'recharts';
import type { ETFDailyPrice } from '@etf-canvas/shared';

interface Props {
  data: ETFDailyPrice[];
  compact?: boolean;
}

export function PriceChart({ data, compact }: Props) {
  if (!data.length) return <div className="text-muted-foreground text-center py-8 text-sm">데이터 없음</div>;

  if (compact) {
    const basePrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const isPositive = lastPrice >= basePrice;
    const lineColor = isPositive ? '#ef4444' : '#3b82f6';
    const gradId = isPositive ? 'areaGrad-pos' : 'areaGrad-neg';
    const chartData = data.map((d) => ({
      date: d.date,
      value: Math.round(((d.close - basePrice) / basePrice) * 10000) / 100,
    }));

    // X축 균등 4분할 tick (시작, 1/4, 2/4, 3/4, 끝)
    const len = chartData.length;
    const xTicks = [0, Math.round(len / 4), Math.round(len / 2), Math.round((len * 3) / 4), len - 1]
      .map(i => chartData[Math.min(i, len - 1)].date);

    // Y축 틱
    const vals = chartData.map(d => d.value);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const range = rawMax - rawMin || 10;
    const step = Math.max(10, Math.ceil(range / 4 / 10) * 10);
    const yMin = Math.floor(rawMin / step) * step;
    const yMax = Math.ceil(rawMax / step) * step;
    const yTicks: number[] = [];
    for (let v = yMin; v <= yMax; v += step) yTicks.push(v);
    if (yTicks[yTicks.length - 1] < rawMax) yTicks.push(yTicks[yTicks.length - 1] + step);

    // 날짜 포맷: YY.MM.DD
    const fmtDate = (d: string) => {
      const [y, m, dd] = d.split('-');
      return `${y.slice(2)}.${m}.${dd}`;
    };

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
            domain={[yTicks[0], yTicks[yTicks.length - 1]]}
            width={38}
          />
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
