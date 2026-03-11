import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { CommunityList } from './community-list';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const metadata: Metadata = {
  title: '커뮤니티 — ETF Canvas',
  description: 'ETF Canvas 커뮤니티에서 투자 아이디어와 포트폴리오를 공유하세요.',
  alternates: { canonical: 'https://etf-canvas.com/community' },
  openGraph: {
    title: '커뮤니티 — ETF Canvas',
    description: 'ETF Canvas 커뮤니티에서 투자 아이디어와 포트폴리오를 공유하세요.',
    url: 'https://etf-canvas.com/community',
    siteName: 'ETF Canvas',
  },
};

async function getCategories() {
  try {
    const res = await fetch(`${API_BASE}/community/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function getPosts() {
  try {
    const res = await fetch(`${API_BASE}/community/posts?page=1&limit=20&sort=latest`, { cache: 'no-store' });
    if (!res.ok) return { posts: [], total: 0, page: 1, totalPages: 1 };
    return res.json();
  } catch { return { posts: [], total: 0, page: 1, totalPages: 1 }; }
}

async function getWeeklyBest() {
  try {
    const res = await fetch(`${API_BASE}/community/posts/weekly-best?limit=5`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default async function CommunityPage() {
  const [categories, postsData, weeklyBest] = await Promise.all([
    getCategories(), getPosts(), getWeeklyBest(),
  ]);

  return (
    <AppShell>
      <Suspense>
        <CommunityList
          initialCategories={categories}
          initialPosts={postsData}
          initialWeeklyBest={weeklyBest}
        />
      </Suspense>
    </AppShell>
  );
}
