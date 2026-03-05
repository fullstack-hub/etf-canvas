'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ETFDailyPrice } from '@etf-canvas/shared';

export function PriceChart({ data }: { data: ETFDailyPrice[] }) {
  if (!data.length) return <div className="text-muted-foreground text-center py-8">데이터 없음</div>;

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
