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
    const chartData = data.map((d) => ({
      date: d.date,
      value: Math.round(((d.close - basePrice) / basePrice) * 10000) / 100,
    }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip
            formatter={(value: number) => [`${value}%`, '수익률']}
            labelFormatter={(label: string) => label}
            contentStyle={{ fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            strokeWidth={1.5}
            dot={false}
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
