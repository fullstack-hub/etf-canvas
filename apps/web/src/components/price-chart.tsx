'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import type { ETFDailyPrice } from '@etf-canvas/shared';

interface Props {
  data: ETFDailyPrice[];
  compact?: boolean;
}

export function PriceChart({ data, compact }: Props) {
  if (!data.length) return <div className="text-muted-foreground text-center py-8 text-sm">데이터 없음</div>;

  if (compact) {
    // Normalize to percentage returns
    const basePrice = data[0].close;
    const seenMonths = new Set<string>();
    const chartData = data.map((d) => {
      const month = d.date.slice(0, 7); // "YYYY-MM"
      const isFirstOfMonth = !seenMonths.has(month);
      if (isFirstOfMonth) seenMonths.add(month);
      return {
        date: d.date,
        value: Math.round(((d.close - basePrice) / basePrice) * 10000) / 100,
        isFirstOfMonth,
      };
    });

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="miniColorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b9bd5" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#5b9bd5" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#ddd' }} dy={8} tick={{ fontSize: 10, fill: '#999' }} ticks={chartData.filter(d => d.isFirstOfMonth).map(d => d.date)} tickFormatter={(d: string) => `${parseInt(d.slice(5, 7), 10)}월`} />
          <YAxis tickLine={false} axisLine={{ stroke: '#ddd' }} tick={{ fontSize: 10, fill: '#999' }} tickFormatter={(val) => `${Math.round(val)}%`} domain={['dataMin', 'dataMax']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const val = d.value as number;
              return (
                <div className="rounded border bg-popover/95 backdrop-blur-sm px-2 py-1 shadow-md">
                  <p className="text-[10px] text-muted-foreground">{d.date}</p>
                  <p className="text-xs font-bold">{val >= 0 ? '+' : ''}{val.toFixed(2)}%</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5b9bd5"
            strokeWidth={1.5}
            fillOpacity={1}
            baseValue="dataMin"
            fill="url(#miniColorValue)"
            dot={(props: any) => {
              if (!props.payload.isFirstOfMonth) return <circle key={`dot-${props.index}`} cx={0} cy={0} r={0} fill="none" />;
              return <circle key={`dot-${props.index}`} cx={props.cx} cy={props.cy} r={3} fill="#5b9bd5" stroke="#fff" strokeWidth={1.5} />;
            }}
            activeDot={{ r: 4, fill: '#5b9bd5', stroke: '#fff', strokeWidth: 2 }}
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
