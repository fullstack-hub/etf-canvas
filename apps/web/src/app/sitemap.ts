import type { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SITE_URL = 'https://etfcanva.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ];

  try {
    const res = await fetch(`${API_BASE}/portfolio/public/slugs`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const slugs: { slug: string; updatedAt: string }[] = await res.json();
      for (const { slug, updatedAt } of slugs) {
        entries.push({
          url: `${SITE_URL}/portfolio/${slug}`,
          lastModified: new Date(updatedAt),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  } catch {
    // sitemap 생성 실패해도 기본 엔트리는 반환
  }

  return entries;
}
