'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { ETFDailyPrice } from '@etf-canvas/shared';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b'];

interface Props {
  datasets: { code: string; name: string; prices: ETFDailyPrice[] }[];
}

export function CompareChart({ datasets }: Props) {
  if (!datasets.length || !datasets[0].prices.length) {
    return <div className="text-muted-foreground text-center py-8">비교할 ETF를 선택해 주세요.</div>;
  }

  // Normalize to percentage returns from first day
  const dates = datasets[0].prices.map((p) => p.date);
  const chartData = dates.map((date, idx) => {
    const point: Record<string, string | number> = { date };
    datasets.forEach((ds) => {
      const basePrice = ds.prices[0]?.close || 1;
      const price = ds.prices[idx]?.close || basePrice;
      point[ds.code] = Math.round(((price - basePrice) / basePrice) * 10000) / 100;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => [`${value}%`, '']} />
        <Legend />
        {datasets.map((ds, i) => (
          <Line
            key={ds.code}
            type="monotone"
            dataKey={ds.code}
            name={ds.name}
            stroke={COLORS[i]}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
