'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PortfolioCard } from '@/components/portfolio-card';
import { Loader2, Trophy, TrendingUp, Shield } from 'lucide-react';

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      {children}
    </section>
  );
}

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
    </div>
  );
}

function PortfolioGrid({ data, showMdd }: { data: any[]; showMdd?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((p) => (
        <PortfolioCard key={p.slug} {...p} showMdd={showMdd} />
      ))}
    </div>
  );
}

export function GalleryView() {
  const { data: topReturn, isLoading: loadingReturn } = useQuery({
    queryKey: ['gallery-top', 'return'],
    queryFn: () => api.getTopPortfolios(6, 'return'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: topMdd, isLoading: loadingMdd } = useQuery({
    queryKey: ['gallery-top', 'mdd'],
    queryFn: () => api.getTopPortfolios(6, 'mdd'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: tags } = useQuery({
    queryKey: ['gallery-tags'],
    queryFn: () => api.getPortfolioTags(),
    staleTime: 1000 * 60 * 60,
  });

  const isEmpty = !loadingReturn && !loadingMdd && (!topReturn || topReturn.length === 0) && (!topMdd || topMdd.length === 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold">포트폴리오 갤러리</h1>
          </div>
          <p className="text-muted-foreground text-sm">ETF Canvas 사용자들이 만든 포트폴리오를 탐색하세요</p>
        </div>

        {/* 태그 필터 */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 -mt-4">
            {tags.map(({ tag, count }) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full border text-sm hover:bg-primary/10 hover:border-primary/40 transition-colors cursor-default"
              >
                #{tag} <span className="text-muted-foreground text-xs ml-1">{count}</span>
              </span>
            ))}
          </div>
        )}

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground rounded-2xl border border-dashed border-border/60 bg-muted/10">
            <Trophy className="w-10 h-10 opacity-20 mb-3" />
            <h3 className="text-[14px] font-semibold text-foreground/80 mb-1">아직 공개된 포트폴리오가 없어요</h3>
            <p className="text-[12px] text-muted-foreground/70">합성 후 저장하면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <>
            {/* 수익률 TOP */}
            <Section
              icon={<TrendingUp className="w-4.5 h-4.5 text-red-500" />}
              title="수익률 TOP"
              subtitle="저장 시점 대비 실전 수익률이 높은 포트폴리오"
            >
              {loadingReturn ? <SectionLoader /> : topReturn && topReturn.length > 0 ? (
                <PortfolioGrid data={topReturn} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">데이터 준비 중</p>
              )}
            </Section>

            {/* 안정성 TOP — 느린 쿼리, 독립 로딩 */}
            <Section
              icon={<Shield className="w-4.5 h-4.5 text-emerald-500" />}
              title="안정성 TOP"
              subtitle="실전 최대낙폭(MDD)이 낮은 포트폴리오"
            >
              {loadingMdd ? <SectionLoader /> : topMdd && topMdd.length > 0 ? (
                <PortfolioGrid data={topMdd} showMdd />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">데이터 준비 중</p>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
