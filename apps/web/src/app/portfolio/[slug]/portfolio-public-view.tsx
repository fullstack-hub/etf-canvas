'use client';

import Link from 'next/link';

interface PortfolioData {
  name: string;
  slug: string;
  items: { code: string; name: string; weight: number; category?: string }[];
  snapshot: {
    periods: Record<string, { totalReturn: number; annualizedReturn: number; maxDrawdown: number }>;
    avgVolatility: number;
  } | null;
  returnRate: number | null;
  mdd: number | null;
  feedbackText: string | null;
  feedbackActions: { category: string; label: string }[] | null;
  feedbackSnippet: string | null;
  tags: string[];
  createdAt: string;
}

const PERIOD_LABELS: Record<string, string> = {
  '1w': '1주', '1m': '1개월', '3m': '3개월', '6m': '6개월', '1y': '1년', '3y': '3년',
};

export function PortfolioPublicView({ data }: { data: PortfolioData }) {
  const etfNames = data.items.map((i) => i.name).join(' + ');
  const createdDate = new Date(data.createdAt).toLocaleDateString('ko-KR');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">ETF Canvas</Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            나만의 포트폴리오 만들기
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 제목 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{etfNames} &middot; {createdDate}</p>
        </div>

        {/* 구성 ETF */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">구성 ETF</h2>
          <div className="grid gap-2">
            {data.items
              .sort((a, b) => b.weight - a.weight)
              .map((item) => (
                <div key={item.code} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.code}</span>
                    {item.category && (
                      <span className="text-xs text-muted-foreground ml-2">{item.category}</span>
                    )}
                  </div>
                  <span className="font-bold text-sm">{item.weight.toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </section>

        {/* 성과 지표 */}
        {data.snapshot && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3">성과 지표</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(data.snapshot.periods).map(([period, metrics]) => (
                <div key={period} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">{PERIOD_LABELS[period] || period}</p>
                  <p className={`text-lg font-bold ${metrics.totalReturn >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MDD {metrics.maxDrawdown.toFixed(1)}%
                  </p>
                </div>
              ))}
              {data.snapshot.avgVolatility > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">변동성 (1Y)</p>
                  <p className="text-lg font-bold">{data.snapshot.avgVolatility.toFixed(1)}%</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* AI 피드백 */}
        {data.feedbackText && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3">AI 포트폴리오 분석</h2>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.feedbackText}</p>
            </div>
            {data.feedbackActions && data.feedbackActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {data.feedbackActions.map((action, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-muted text-xs">
                    {action.label}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 태그 */}
        {data.tags.length > 0 && (
          <section className="mb-8">
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-8 border-t">
          <p className="text-muted-foreground text-sm mb-3">나만의 ETF 포트폴리오를 만들어보세요</p>
          <Link
            href="/"
            className="inline-flex px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            ETF Canvas 시작하기
          </Link>
        </section>
      </main>
    </div>
  );
}
