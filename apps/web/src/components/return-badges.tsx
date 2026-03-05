'use client';

import { Badge } from '@/components/ui/badge';
import type { ETFReturn } from '@etf-canvas/shared';

const periodLabels: Record<string, string> = {
  '1w': '1주', '1m': '1개월', '3m': '3개월', '6m': '6개월',
  '1y': '1년', '3y': '3년', 'ytd': 'YTD',
};

export function ReturnBadges({ returns }: { returns: ETFReturn[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {returns.map((r) => (
        <Badge
          key={r.period}
          variant={r.returnRate >= 0 ? 'default' : 'destructive'}
        >
          {periodLabels[r.period] || r.period}: {r.returnRate > 0 ? '+' : ''}{r.returnRate.toFixed(2)}%
        </Badge>
      ))}
    </div>
  );
}
