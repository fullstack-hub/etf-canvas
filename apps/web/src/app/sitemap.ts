import type { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SITE_URL = 'https://etfcanva.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/gallery`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    const [slugsRes, tagsRes] = await Promise.all([
      fetch(`${API_BASE}/portfolio/public/slugs`, { cache: 'no-store' }),
      fetch(`${API_BASE}/portfolio/public/tags`, { cache: 'no-store' }),
    ]);

    if (slugsRes.ok) {
      const slugs: { slug: string; updatedAt: string }[] = await slugsRes.json();
      for (const { slug, updatedAt } of slugs) {
        entries.push({
          url: `${SITE_URL}/portfolio/${slug}`,
          lastModified: new Date(updatedAt),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }

    if (tagsRes.ok) {
      const tags: { tag: string }[] = await tagsRes.json();
      for (const { tag } of tags) {
        entries.push({
          url: `${SITE_URL}/gallery/${encodeURIComponent(tag)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch {
    // sitemap 생성 실패해도 기본 엔트리는 반환
  }

  return entries;
}
