'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Trophy, Shield, Coins, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useReturnColors } from '@/lib/return-colors';

const GALLERY_TABS = [
  { id: 'return' as const, label: '수익률', icon: Trophy, iconColor: 'text-red-500' },
  { id: 'mdd' as const, label: '안정성', icon: Shield, iconColor: 'text-emerald-500' },
  { id: 'dividend' as const, label: '분배금', icon: Coins, iconColor: 'text-amber-500' },
] as const;

type GallerySort = typeof GALLERY_TABS[number]['id'];

function getDaysAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return '오늘';
  return `${days}일 경과`;
}

const AGE_FILTERS = [
  { label: '전체', value: 0 },
  { label: '최근 7일', value: 7 },
  { label: '최근 30일', value: 30 },
  { label: '최근 3개월', value: 90 },
  { label: '최근 6개월', value: 180 },
  { label: '최근 1년', value: 365 },
] as const;

export function MobileGalleryTab() {
  const [activeSort, setActiveSort] = useState<GallerySort>('return');
  const [maxAge, setMaxAge] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeFilter = AGE_FILTERS.find((f) => f.value === maxAge) || AGE_FILTERS[0];
  const rc = useReturnColors();

  const { data: portfolios, isPending } = useQuery({
    queryKey: ['gallery-top', activeSort, maxAge],
    queryFn: () => api.getTopPortfolios(10, activeSort, maxAge),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">TOP 포트폴리오</h1>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-medium"
            >
              {activeFilter.label}
              <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-xl bg-card border border-border shadow-lg overflow-hidden">
                  {AGE_FILTERS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setMaxAge(opt.value); setDropdownOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                        maxAge === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {GALLERY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSort(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-all ${
                activeSort === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeSort === tab.id ? tab.iconColor : ''}`} />
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
              <p className="text-[11px] text-muted-foreground truncate">
                {[...p.items].sort((a, b) => b.weight - a.weight).slice(0, 2).map((i) => i.name).join(', ')}
                {p.items.length > 2 && ` 외 ${p.items.length - 2}개`}
              </p>
              {(p.tags || []).length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {(p.tags || []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right">
              {activeSort === 'return' && (
                p.sinceReturn != null ? (
                  <span className={`text-sm font-bold ${rc.cls(p.sinceReturn >= 0)}`}>
                    {p.sinceReturn >= 0 ? '+' : ''}{p.sinceReturn.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">대기 중</span>
                )
              )}
              {activeSort === 'mdd' && (
                p.sinceMdd != null ? (
                  <span className="text-sm font-bold text-emerald-500">
                    MDD {p.sinceMdd > 0 ? p.sinceMdd.toFixed(1) : '0.0'}%
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">대기 중</span>
                )
              )}
              {activeSort === 'dividend' && (
                p.weightedDividendYield != null ? (
                  <span className="text-sm font-bold text-amber-500">
                    연 {p.weightedDividendYield.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )
              )}
              <p className="text-[10px] text-muted-foreground">{getDaysAgo(p.createdAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
