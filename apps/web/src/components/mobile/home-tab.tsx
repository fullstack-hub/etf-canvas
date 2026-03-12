'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { useReturnColors } from '@/lib/return-colors';
import { AdBannerSlider } from '@/components/mobile/ad-banner-slider';

export function MobileHomeTab() {
  const setActiveTab = useMobileUIStore((s) => s.setActiveTab);

  const { data: topPortfolios } = useQuery({
    queryKey: ['gallery-top', 'return'],
    queryFn: () => api.getTopPortfolios(5, 'return'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: weeklyBest } = useQuery({
    queryKey: ['community-weekly-best'],
    queryFn: () => api.communityWeeklyBest(5),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="px-4 py-4 space-y-6">
      <AdBannerSlider />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">TOP 포트폴리오</h2>
          <button
            onClick={() => setActiveTab('gallery')}
            className="flex items-center text-xs text-muted-foreground"
          >
            더보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 scroll-x-hide -mx-4 px-4">
          {topPortfolios?.map((p, i) => (
            <TopPortfolioCard key={p.slug} portfolio={p} rank={i + 1} />
          ))}
          {!topPortfolios && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-36 h-24 shrink-0 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">인기 게시글</h2>
          <button
            onClick={() => setActiveTab('community')}
            className="flex items-center text-xs text-muted-foreground"
          >
            더보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {weeklyBest?.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{post.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {post.category && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{post.category.name}</span>
                  )}
                  <span>❤ {post.likeCount}</span>
                  <span>💬 {post.commentCount}</span>
                </div>
              </div>
            </Link>
          ))}
          {!weeklyBest && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  );
}

function TopPortfolioCard({ portfolio, rank }: { portfolio: { name: string; slug: string; returnRate: number | null; items: { code: string; name: string; weight: number }[] }; rank: number }) {
  const rc = useReturnColors();
  const returnRate = portfolio.returnRate;

  return (
    <Link
      href={`/portfolio/${portfolio.slug}`}
      className="w-36 shrink-0 rounded-xl border bg-card p-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs font-bold text-primary">#{rank}</span>
      </div>
      <p className="text-xs font-medium truncate mb-1">{portfolio.name}</p>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${returnRate != null ? rc.cls(returnRate >= 0) : ''}`}>
          {returnRate != null ? `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(1)}%` : '-'}
        </span>
        <span className="text-[10px] text-muted-foreground">ETF {portfolio.items.length}개</span>
      </div>
    </Link>
  );
}
