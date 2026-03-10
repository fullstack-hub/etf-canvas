import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PortfolioCard } from '@/components/portfolio-card';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getByTag(tag: string) {
  try {
    const res = await fetch(`${API_BASE}/portfolio/public/by-tag/${encodeURIComponent(tag)}`, {
      next: { revalidate: 3600 },
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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">ETF Canvas</Link>
          <Link
            href="/gallery"
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            갤러리로 돌아가기
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}
