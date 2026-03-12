'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useIsMobile } from '@/lib/use-is-mobile';

import { IconSidebar } from '@/components/icon-sidebar';
import { AttributePanel } from '@/components/attribute-panel';
import { SnapshotSection } from '@/components/snapshot-section';
import { SinceStatsHero } from '@/components/since-stats-hero';
import { HoldingsSection } from '@/components/holdings-section';
import { FeedbackSection } from '@/components/feedback-section';
import { DividendSection } from '@/components/dividend-section';

interface PortfolioData {
  name: string;
  slug: string;
  items: { code: string; name: string; weight: number; category?: string }[];
  feedbackText: string | null;
  feedbackActions: { category: string; label: string }[] | null;
  feedbackSnippet: string | null;
  tags: string[];
  totalAmount: number;
  createdAt: string;
}

export function PortfolioPublicView({ data }: { data: PortfolioData }) {

  const [period, setPeriod] = useState('1y');
  const isMobile = useIsMobile();
  const router = useRouter();

  if (isMobile) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>
        </div>
        <div className="px-4 py-5 flex flex-col gap-6 pb-10">
          {/* 헤더 */}
          <div className="border-b pb-4">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">{data.name}</h1>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2 font-medium">
              저장일: {new Date(data.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/30" />
              {data.items.length}개 종목
            </p>
            {data.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {data.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/gallery/${encodeURIComponent(tag)}`}
                    className="px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <SinceStatsHero
            fetchKey={['public-since', data.slug]}
            fetchFn={() => api.getPublicSince(data.slug)}
            saveDate={data.createdAt}
          />
          <SnapshotSection items={data.items} period={period} onPeriodChange={setPeriod} totalAmount={Number(data.totalAmount)} />

          {data.feedbackText && (
            <FeedbackSection feedbackText={data.feedbackText} feedbackActions={data.feedbackActions} />
          )}

          <DividendSection items={data.items} period={period} totalAmount={Number(data.totalAmount)} />
          <HoldingsSection items={data.items} />

          <section className="text-center py-6 border-t">
            <p className="text-muted-foreground text-sm mb-3">나만의 ETF 포트폴리오를 만들어보세요</p>
            <Link
              href="/"
              className="inline-flex px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
            >
              ETF Canvas 시작하기
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-37px)] flex overflow-hidden">
      <IconSidebar />
      <div className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-5xl mx-auto px-6 md:px-8 lg:px-10 py-8 flex flex-col gap-8 pb-10">
          {/* 헤더 */}
          <div className="border-b pb-4">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{data.name}</h1>
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2 font-medium">
              저장일: {new Date(data.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              {data.items.length}개 종목 구성
            </p>
            {data.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {data.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/gallery/${encodeURIComponent(tag)}`}
                    className="px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 실전 시뮬레이션 + 성과 지표 */}
          <div className="flex flex-col gap-6">
            <SinceStatsHero
              fetchKey={['public-since', data.slug]}
              fetchFn={() => api.getPublicSince(data.slug)}
              saveDate={data.createdAt}
            />
            <SnapshotSection items={data.items} period={period} onPeriodChange={setPeriod} totalAmount={Number(data.totalAmount)} />
          </div>

          {/* 포트폴리오 분석 */}
          {data.feedbackText && (
            <FeedbackSection feedbackText={data.feedbackText} feedbackActions={data.feedbackActions} />
          )}

          {/* 분배금 */}
          <DividendSection items={data.items} period={period} totalAmount={Number(data.totalAmount)} />

          {/* 구성 종목 */}
          <HoldingsSection items={data.items} />

          {/* CTA */}
          <section className="text-center py-8 border-t">
            <p className="text-muted-foreground text-sm mb-3">나만의 ETF 포트폴리오를 만들어보세요</p>
            <Link
              href="/?view=canvas"
              className="inline-flex px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              ETF Canvas 시작하기
            </Link>
          </section>
        </div>
      </div>
      <AttributePanel />
    </div>
  );
}
