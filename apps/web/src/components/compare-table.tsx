'use client';

import type { ETFDetail } from '@etf-canvas/shared';

export function CompareTable({ etfs }: { etfs: ETFDetail[] }) {
  if (!etfs.length) return null;

  const metrics = [
    { label: '카테고리', get: (e: ETFDetail) => e.category },
    { label: '운용사', get: (e: ETFDetail) => e.issuer },
    { label: '벤치마크', get: (e: ETFDetail) => e.benchmark || '-' },
    { label: 'AUM', get: (e: ETFDetail) => e.aum ? `${(e.aum / 100_000_000).toFixed(0)}억` : '-' },
    { label: '총보수율', get: (e: ETFDetail) => e.expenseRatio ? `${(e.expenseRatio * 100).toFixed(2)}%` : '-' },
  ];

  // Add return periods
  const allPeriods = ['1w', '1m', '3m', '6m', '1y', '3y', 'ytd'];
  const periodLabels: Record<string, string> = {
    '1w': '1주 수익률', '1m': '1개월', '3m': '3개월', '6m': '6개월',
    '1y': '1년', '3y': '3년', 'ytd': 'YTD',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3"></th>
            {etfs.map((e) => (
              <th key={e.code} className="text-left py-2 px-3 font-semibold">{e.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.label} className="border-b">
              <td className="py-2 px-3 text-muted-foreground">{m.label}</td>
              {etfs.map((e) => (
                <td key={e.code} className="py-2 px-3">{m.get(e)}</td>
              ))}
            </tr>
          ))}
          {allPeriods.map((period) => (
            <tr key={period} className="border-b">
              <td className="py-2 px-3 text-muted-foreground">{periodLabels[period]}</td>
              {etfs.map((e) => {
                const r = e.returns.find((ret) => ret.period === period);
                return (
                  <td key={e.code} className={`py-2 px-3 font-medium ${r && r.returnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r ? `${r.returnRate > 0 ? '+' : ''}${r.returnRate.toFixed(2)}%` : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
