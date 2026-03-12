'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type GalleryPortfolio } from '@/lib/api';
import { Loader2, Trophy, TrendingUp, Shield, Coins } from 'lucide-react';
import { useReturnColors } from '@/lib/return-colors';
import Link from 'next/link';

const AGE_FILTERS = [
  { label: '전체', value: 0 },
  { label: '최근 7일', value: 7 },
  { label: '최근 30일', value: 30 },
  { label: '최근 3개월', value: 90 },
  { label: '최근 6개월', value: 180 },
  { label: '최근 1년', value: 365 },
] as const;

function getDaysAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return '오늘';
  return `${days}일 경과`;
}

function GalleryCard({ p, variant }: { p: GalleryPortfolio; variant: 'return' | 'mdd' | 'dividend' }) {
  const rc = useReturnColors();
  const top3 = [...p.items].sort((a, b) => b.weight - a.weight).slice(0, 3);

  const sinceReturn = p.sinceReturn;
  const sinceMdd = p.sinceMdd;

  return (
    <Link
      href={`/portfolio/${p.slug}`}
      className="block rounded-xl border border-border/60 bg-card p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="font-bold text-[13px] truncate flex-1">{p.name}</h3>
        {variant === 'dividend' ? (
          p.weightedDividendYield != null ? (
            <span className="text-[13px] font-bold ml-2 shrink-0 text-amber-500">
              연 {p.weightedDividendYield.toFixed(1)}%
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground ml-2 shrink-0">-</span>
          )
        ) : variant === 'mdd' ? (
          sinceMdd != null ? (
            <span className="text-[13px] font-bold ml-2 shrink-0 text-emerald-500">
              MDD {sinceMdd > 0 ? `${sinceMdd.toFixed(1)}` : '0.0'}%
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground ml-2 shrink-0">대기 중</span>
          )
        ) : (
          sinceReturn != null ? (
            <span className={`text-[13px] font-bold ml-2 shrink-0 ${rc.cls(sinceReturn >= 0)}`}>
              {sinceReturn >= 0 ? '+' : ''}{sinceReturn.toFixed(1)}%
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground ml-2 shrink-0">대기 중</span>
          )
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mb-2 truncate">
        {top3.map((i) => i.name).join(', ')}
        {p.items.length > 3 && ` 외 ${p.items.length - 3}개`}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {(p.tags || []).slice(0, 3).map((tag: string) => (
            <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{getDaysAgo(p.createdAt)}</span>
      </div>
    </Link>
  );
}

function ColumnLoader() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
    </div>
  );
}

function ExpandableColumn({ items, variant, loading, icon, title }: {
  items: GalleryPortfolio[] | undefined;
  variant: 'return' | 'mdd' | 'dividend';
  loading: boolean;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-[15px] font-bold">{title}</h2>
      </div>
      {loading ? <ColumnLoader /> : (
        items && items.length > 0 ? (
          <>
            <div className="flex flex-col gap-3">
              {items.map((p) => (
                <GalleryCard key={p.slug} p={p} variant={variant} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
            <Coins className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">데이터 준비 중</p>
          </div>
        )
      )}
    </div>
  );
}

export function GalleryView() {
  const [maxAge, setMaxAge] = useState(0);

  const { data: topReturn, isLoading: loadingReturn } = useQuery({
    queryKey: ['gallery-top', 'return', maxAge],
    queryFn: () => api.getTopPortfolios(10, 'return', maxAge),
    staleTime: 1000 * 60 * 5,
  });

  const { data: topMdd, isLoading: loadingMdd } = useQuery({
    queryKey: ['gallery-top', 'mdd', maxAge],
    queryFn: () => api.getTopPortfolios(10, 'mdd', maxAge),
    staleTime: 1000 * 60 * 5,
  });

  const { data: topDividend, isLoading: loadingDividend } = useQuery({
    queryKey: ['gallery-top', 'dividend', maxAge],
    queryFn: () => api.getTopPortfolios(10, 'dividend', maxAge),
    staleTime: 1000 * 60 * 5,
  });

  const isEmpty = !loadingReturn && !loadingMdd && !loadingDividend
    && (!topReturn || topReturn.length === 0)
    && (!topMdd || topMdd.length === 0)
    && (!topDividend || topDividend.length === 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold">포트폴리오 갤러리</h1>
          </div>
          <p className="text-muted-foreground text-sm">ETF Canvas 사용자들이 만든 포트폴리오를 탐색하세요</p>
          <div className="flex gap-2 mt-3">
            {AGE_FILTERS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMaxAge(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  maxAge === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground rounded-2xl border border-dashed border-border/60 bg-muted/10">
            <Trophy className="w-10 h-10 opacity-20 mb-3" />
            <h3 className="text-[14px] font-semibold text-foreground/80 mb-1">아직 공개된 포트폴리오가 없어요</h3>
            <p className="text-[12px] text-muted-foreground/70">합성 후 저장하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ExpandableColumn
              items={topReturn}
              variant="return"
              loading={loadingReturn}
              icon={<TrendingUp className="w-4 h-4 text-red-500" />}
              title="수익률 TOP 10"
            />
            <ExpandableColumn
              items={topMdd}
              variant="mdd"
              loading={loadingMdd}
              icon={<Shield className="w-4 h-4 text-emerald-500" />}
              title="안정성 TOP 10"
            />
            <ExpandableColumn
              items={topDividend}
              variant="dividend"
              loading={loadingDividend}
              icon={<Coins className="w-4 h-4 text-amber-500" />}
              title="분배금 TOP 10"
            />
          </div>
        )}
      </div>
    </div>
  );
}
