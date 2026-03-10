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
    const monthList: string[] = [];
    const chartData = data.map((d) => {
      const month = d.date.slice(0, 7);
      const isFirstOfMonth = !seenMonths.has(month);
      if (isFirstOfMonth) {
        seenMonths.add(month);
        monthList.push(month);
      }
      return {
        date: d.date,
        value: Math.round(((d.close - basePrice) / basePrice) * 10000) / 100,
        isFirstOfMonth,
        month,
      };
    });

    // 월 수에 따라 간격 결정: 6개월 이하 → 매월, 12개월 이하 → 2개월, 그 이상 → 3개월
    const totalMonths = monthList.length;
    const interval = totalMonths <= 6 ? 1 : totalMonths <= 13 ? 2 : 3;
    const visibleMonths = new Set(monthList.filter((_, i) => i % interval === 0));

    // Y축 균등 틱 계산
    const yTicks = (() => {
      const vals = chartData.map(d => d.value);
      const min = Math.floor(Math.min(...vals) / 10) * 10;
      const max = Math.ceil(Math.max(...vals) / 10) * 10;
      const step = Math.max(10, Math.ceil((max - min) / 4 / 10) * 10);
      const ticks: number[] = [];
      for (let v = min; v <= max; v += step) ticks.push(v);
      if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
      return ticks;
    })();

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#ddd' }} dy={8} tick={{ fontSize: 10, fill: '#999' }} ticks={chartData.filter(d => d.isFirstOfMonth && visibleMonths.has(d.month)).map(d => d.date)} tickFormatter={(d: string) => `${parseInt(d.slice(5, 7), 10)}월`} />
          <YAxis tickLine={false} axisLine={{ stroke: '#ddd' }} tick={{ fontSize: 10, fill: '#999' }} tickFormatter={(val) => `${Math.round(val)}%`} ticks={yTicks} domain={[yTicks[0] ?? 0, yTicks[yTicks.length - 1] ?? 0]} width={45} />
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
            fillOpacity={0}
            fill="none"
            dot={(props: any) => {
              if (!props.payload.isFirstOfMonth || !visibleMonths.has(props.payload.month)) return <circle key={`dot-${props.index}`} cx={0} cy={0} r={0} fill="none" />;
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
