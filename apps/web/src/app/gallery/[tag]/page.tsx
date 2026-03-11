import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { PortfolioCard } from '@/components/portfolio-card';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getByTag(tag: string) {
  try {
    const res = await fetch(`${API_BASE}/portfolio/public/by-tag/${encodeURIComponent(tag)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata(
  { params }: { params: Promise<{ tag: string }> },
): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded} 포트폴리오 — ETF Canvas`,
    description: `${decoded} 관련 ETF 포트폴리오 모음. AI 분석과 성과 지표를 확인하세요.`,
    openGraph: {
      title: `#${decoded} 포트폴리오 — ETF Canvas`,
      description: `${decoded} 관련 ETF 포트폴리오 모음`,
      url: `https://etfcanva.com/gallery/${tag}`,
      siteName: 'ETF Canvas',
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const portfolios = await getByTag(decoded);
  if (!portfolios) notFound();

  return (
    <AppShell>
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/gallery" className="text-muted-foreground hover:text-foreground text-sm transition-colors">&larr; 갤러리</Link>
          </div>
          <h1 className="text-2xl font-bold mb-2">#{decoded}</h1>
          <p className="text-muted-foreground text-sm mb-8">{decoded} 관련 포트폴리오 {portfolios.length}개</p>

          {portfolios.length === 0 ? (
            <p className="text-muted-foreground text-sm py-12 text-center">해당 태그의 포트폴리오가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolios.map((p: any) => (
                <PortfolioCard key={p.slug} {...p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
