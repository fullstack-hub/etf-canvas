'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { SimulateResult } from '@etf-canvas/shared';

export function SimulationChart({ result }: { result: SimulateResult }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={result.dailyValues}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value: number) => [value.toLocaleString() + '원', '포트폴리오']} />
        <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
