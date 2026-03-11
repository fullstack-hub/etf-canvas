import type { Metadata } from 'next';
import Link from 'next/link';
import { PortfolioCard } from '@/components/portfolio-card';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const metadata: Metadata = {
  title: '포트폴리오 갤러리 — ETF Canvas',
  description: 'ETF Canvas 사용자들이 만든 포트폴리오를 탐색하세요. AI 분석과 성과 지표를 확인할 수 있습니다.',
  openGraph: {
    title: '포트폴리오 갤러리 — ETF Canvas',
    description: 'ETF Canvas 사용자들이 만든 포트폴리오를 탐색하세요.',
    url: 'https://etfcanva.com/gallery',
    siteName: 'ETF Canvas',
  },
};

async function getTop() {
  try {
    const res = await fetch(`${API_BASE}/portfolio/public/top?limit=20`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function getTags() {
  try {
    const res = await fetch(`${API_BASE}/portfolio/public/tags`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default async function GalleryPage() {
  const [portfolios, tags] = await Promise.all([getTop(), getTags()]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold">ETF Canvas</Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            나만의 포트폴리오 만들기
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">포트폴리오 갤러리</h1>
        <p className="text-muted-foreground text-sm mb-8">ETF Canvas 사용자들이 만든 포트폴리오를 탐색하세요</p>

        {/* 태그 필터 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {tags.map(({ tag, count }: { tag: string; count: number }) => (
              <Link
                key={tag}
                href={`/gallery/${encodeURIComponent(tag)}`}
                className="px-3 py-1.5 rounded-full border text-sm hover:bg-primary/10 hover:border-primary/40 transition-colors"
              >
                #{tag} <span className="text-muted-foreground text-xs ml-1">{count}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Top 20 */}
        <h2 className="text-lg font-bold mb-4">최근 포트폴리오</h2>
        {portfolios.length === 0 ? (
          <p className="text-muted-foreground text-sm py-12 text-center">아직 공개된 포트폴리오가 없습니다.</p>
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
