'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/lib/store';
import type { ETFSummary } from '@etf-canvas/shared';

export function EtfCard({ etf }: { etf: ETFSummary }) {
  const { addToCanvas, selected } = useCanvasStore();
  const isInCanvas = selected.some((s) => s.code === etf.code);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Link href={`/etf/${etf.code}`} className="hover:underline">
            <CardTitle className="text-base">{etf.name}</CardTitle>
          </Link>
          <Badge variant="secondary" className="text-xs">{etf.category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{etf.code} · {etf.issuer}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">AUM</span>
            <p className="font-medium">
              {etf.aum ? `${(etf.aum / 100_000_000).toFixed(0)}억` : '-'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">보수율</span>
            <p className="font-medium">
              {etf.expenseRatio ? `${(etf.expenseRatio * 100).toFixed(2)}%` : '-'}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={isInCanvas ? 'secondary' : 'default'}
          className="w-full"
          onClick={() => addToCanvas(etf)}
          disabled={isInCanvas}
        >
          {isInCanvas ? '캔버스에 추가됨' : '캔버스에 추가'}
        </Button>
      </CardContent>
    </Card>
  );
}
