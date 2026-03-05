'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { SimulateResult } from '@etf-canvas/shared';

export function SimulationSummary({ result, amount }: { result: SimulateResult; amount: number }) {
  const items = [
    { label: '투자금액', value: `${amount.toLocaleString()}원` },
    { label: '최종금액', value: `${(result.dailyValues[result.dailyValues.length - 1]?.value || 0).toLocaleString()}원` },
    { label: '총 수익률', value: `${result.totalReturn > 0 ? '+' : ''}${result.totalReturn}%`, color: result.totalReturn >= 0 },
    { label: '연환산 수익률', value: `${result.annualizedReturn > 0 ? '+' : ''}${result.annualizedReturn}%`, color: result.annualizedReturn >= 0 },
    { label: '최대 낙폭', value: `-${result.maxDrawdown}%`, color: false },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`text-lg font-bold mt-1 ${item.color === true ? 'text-green-600' : item.color === false ? 'text-red-600' : ''}`}>
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
