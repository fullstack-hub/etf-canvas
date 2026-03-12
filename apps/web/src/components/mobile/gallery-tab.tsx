'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Trophy, Shield, Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { useReturnColors } from '@/lib/return-colors';

const GALLERY_TABS = [
  { id: 'return' as const, label: '수익률 TOP', icon: Trophy },
  { id: 'mdd' as const, label: '안정성 TOP', icon: Shield },
  { id: 'dividend' as const, label: '분배금 TOP', icon: Coins },
] as const;

type GallerySort = typeof GALLERY_TABS[number]['id'];

export function MobileGalleryTab() {
  const [activeSort, setActiveSort] = useState<GallerySort>('return');
  const rc = useReturnColors();

  const { data: portfolios, isPending } = useQuery({
    queryKey: ['gallery-top', activeSort],
    queryFn: () => api.getTopPortfolios(10, activeSort),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold mb-3">TOP 포트폴리오</h1>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {GALLERY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSort(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-all ${
                activeSort === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isPending && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse mb-2" />
        ))}
        {portfolios?.map((p, i) => (
          <Link
            key={p.slug}
            href={`/portfolio/${p.slug}`}
            className="flex items-center gap-3 py-3 border-b border-border/50"
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <span className="text-xs text-muted-foreground">ETF {p.items.length}개</span>
            </div>
            <div className="text-right">
              {p.returnRate != null && (
                <span className={`text-sm font-bold ${rc.cls(p.returnRate >= 0)}`}>
                  {p.returnRate >= 0 ? '+' : ''}{p.returnRate.toFixed(1)}%
                </span>
              )}
              {activeSort === 'mdd' && p.mdd != null && (
                <p className="text-xs text-muted-foreground">MDD {(p.mdd * 100).toFixed(1)}%</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
