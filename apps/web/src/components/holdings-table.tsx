'use client';

import type { ETFHolding } from '@etf-canvas/shared';

export function HoldingsTable({ holdings }: { holdings: ETFHolding[] }) {
  if (!holdings.length) return <p className="text-muted-foreground">보유종목 데이터 없음</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3">종목명</th>
            <th className="text-left py-2 px-3">종목코드</th>
            <th className="text-right py-2 px-3">비중</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 px-3">{h.stockName}</td>
              <td className="py-2 px-3 text-muted-foreground">{h.stockCode}</td>
              <td className="py-2 px-3 text-right font-medium">{h.weight.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
