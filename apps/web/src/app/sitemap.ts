import type { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SITE_URL = 'https://etfcanva.com';
const ITEMS_PER_SITEMAP = 5000;

/**
 * sitemap index 자동 생성
 * /sitemap/0.xml — 정적 페이지 + 갤러리 태그
 * /sitemap/1~P.xml — 포트폴리오 (5000개씩)
 * /sitemap/(P+1)~(P+C).xml — 커뮤니티 글 (5000개씩)
 */
export async function generateSitemaps() {
  let totalPortfolios = 0;
  let totalPosts = 0;

  try {
    const [slugsRes, postsRes] = await Promise.all([
      fetch(`${API_BASE}/portfolio/public/slugs?page=1&limit=1`, { cache: 'no-store' }),
      fetch(`${API_BASE}/community/posts?page=1&limit=1`, { cache: 'no-store' }),
    ]);

    if (slugsRes.ok) {
      const data = await slugsRes.json();
      totalPortfolios = data.total ?? 0;
    }
    if (postsRes.ok) {
      const data = await postsRes.json();
      totalPosts = data.total ?? 0;
    }
  } catch { /* fallback */ }

  const portfolioChunks = Math.max(0, Math.ceil(totalPortfolios / ITEMS_PER_SITEMAP));
  const communityChunks = Math.max(0, Math.ceil(totalPosts / ITEMS_PER_SITEMAP));

  // id 0: 정적
  // id 1~P: 포트폴리오
  // id (P+1)~(P+C): 커뮤니티
  const ids = [{ id: 0 }];
  for (let i = 0; i < portfolioChunks; i++) ids.push({ id: i + 1 });
  for (let i = 0; i < communityChunks; i++) ids.push({ id: portfolioChunks + i + 1 });

  return ids;
}

async function getChunkMeta() {
  let portfolioChunks = 0;
  try {
    const res = await fetch(`${API_BASE}/portfolio/public/slugs?page=1&limit=1`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      portfolioChunks = Math.max(0, Math.ceil((data.total ?? 0) / ITEMS_PER_SITEMAP));
    }
  } catch { /* */ }
  return { portfolioChunks };
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // id 0: 정적 페이지 + 갤러리 태그
  if (id === 0) {
    const entries: MetadataRoute.Sitemap = [
      { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
      { url: `${SITE_URL}/gallery`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      { url: `${SITE_URL}/community`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
      { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
      { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    ];

    try {
      const res = await fetch(`${API_BASE}/portfolio/public/tags`, { cache: 'no-store' });
      if (res.ok) {
        const tags: { tag: string }[] = await res.json();
        for (const { tag } of tags) {
          entries.push({
            url: `${SITE_URL}/gallery/${encodeURIComponent(tag)}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      }
    } catch { /* */ }

    return entries;
  }

  const { portfolioChunks } = await getChunkMeta();

  // id 1~P: 포트폴리오 (5000개씩)
  if (id <= portfolioChunks) {
    const entries: MetadataRoute.Sitemap = [];
    try {
      const res = await fetch(
        `${API_BASE}/portfolio/public/slugs?page=${id}&limit=${ITEMS_PER_SITEMAP}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const data = await res.json();
        const slugs = data.slugs ?? data; // 하위호환
        for (const item of slugs) {
          entries.push({
            url: `${SITE_URL}/portfolio/${item.slug}`,
            lastModified: new Date(item.updatedAt),
            changeFrequency: 'monthly',
            priority: 0.7,
          });
        }
      }
    } catch { /* */ }
    return entries;
  }

  // id (P+1)~: 커뮤니티 글
  const communityPage = id - portfolioChunks;
  const entries: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(
      `${API_BASE}/community/posts?page=${communityPage}&limit=${ITEMS_PER_SITEMAP}&sort=latest`,
      { cache: 'no-store' },
    );
    if (res.ok) {
      const { posts } = await res.json();
      for (const post of posts) {
        entries.push({
          url: `${SITE_URL}/community/${post.id}`,
          lastModified: new Date(post.createdAt),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  } catch { /* */ }
  return entries;
}
