import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PortfolioPublicView } from './portfolio-public-view';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
  totalAmount: number;
  createdAt: string;
}

async function getPortfolio(slug: string): Promise<PortfolioData | null> {
  try {
    const res = await fetch(`${API_BASE}/portfolio/public/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPortfolio(slug);
  if (!data) return { title: '포트폴리오를 찾을 수 없습니다 | ETF Canvas' };

  const etfNames = data.items.map((i) => i.name).join(' + ');
  const title = `${data.name} — ${etfNames} 포트폴리오 분석 | ETF Canvas`;
  const returnText = data.returnRate != null ? `1Y 수익률 ${data.returnRate > 0 ? '+' : ''}${data.returnRate}%` : '';
  const description = data.feedbackSnippet
    || data.feedbackText?.slice(0, 150)
    || `${etfNames} 조합 포트폴리오. ${returnText}. ETF Canvas에서 AI 분석을 확인하세요.`;

  return {
    title,
    description,
    alternates: { canonical: `https://etfcanva.com/portfolio/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://etfcanva.com/portfolio/${slug}`,
      siteName: 'ETF Canvas',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPortfolio(slug);
  if (!data) notFound();

  const etfNames = data.items.map((i) => i.name).join(' + ');
  const returnText = data.returnRate != null ? `1Y 수익률 ${data.returnRate > 0 ? '+' : ''}${data.returnRate}%` : '';

  // JSON-LD: 값은 모두 서버 데이터에서 생성된 안전한 문자열
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: `${data.name} — ${etfNames} 포트폴리오`,
    description: data.feedbackSnippet || data.feedbackText?.slice(0, 200) || `${etfNames} 조합 포트폴리오. ${returnText}`,
    provider: { '@type': 'Organization', name: 'ETF Canvas' },
    url: `https://etfcanva.com/portfolio/${slug}`,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PortfolioPublicView data={data} />
    </>
  );
}
