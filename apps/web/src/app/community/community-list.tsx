'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Pencil, Heart, MessageCircle, Eye, Flame, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommunityPost } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { CommunityWrite } from '@/components/community-write';

function formatCount(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

interface CommunityListProps {
  initialCategories: { id: number; slug: string; name: string }[];
  initialPosts: { posts: CommunityPost[]; total: number; page: number; totalPages: number };
  initialWeeklyBest: CommunityPost[];
}

export function CommunityList({ initialCategories, initialPosts, initialWeeklyBest }: CommunityListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'latest' | 'popular'>((searchParams.get('sort') as 'latest' | 'popular') || 'latest');
  const [categoryId, setCategoryId] = useState<number | undefined>(searchParams.get('category') ? Number(searchParams.get('category')) : undefined);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [showWrite, setShowWrite] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const buildUrl = useCallback((p: number, sort: string, catId?: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (sort !== 'latest') params.set('sort', sort);
    if (catId) params.set('category', String(catId));
    const qs = params.toString();
    return qs ? `/community?${qs}` : '/community';
  }, []);

  const updateUrl = useCallback((p: number, sort: string, catId?: number) => {
    window.history.replaceState(null, '', buildUrl(p, sort, catId));
  }, [buildUrl]);

  const { data: categories } = useQuery({
    queryKey: ['community-categories'],
    queryFn: () => api.communityCategories(),
    staleTime: 60_000 * 10,
    initialData: initialCategories,
  });

  const isInitialQuery = tab === 'latest' && !categoryId && page === 1;
  const { data: postsData, isLoading } = useQuery({
    queryKey: ['community-posts', tab, categoryId, page],
    queryFn: () => api.communityPosts({ page, sort: tab, categoryId }),
    initialData: isInitialQuery ? initialPosts : undefined,
  });

  const { data: weeklyBest } = useQuery({
    queryKey: ['community-weekly-best'],
    queryFn: () => api.communityWeeklyBest(5),
    staleTime: 60_000 * 5,
    initialData: initialWeeklyBest,
  });

  const posts = postsData?.posts ?? [];
  const totalPages = postsData?.totalPages ?? 1;

  const { data: me } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.getMe(),
    enabled: !!session?.user,
  });

  const handleWriteClick = () => {
    if (!session?.user) return;
    if (!me?.nickname) { setShowNicknameModal(true); return; }
    setShowWrite(true);
  };

  if (showWrite) {
    return (
      <CommunityWrite
        onClose={() => setShowWrite(false)}
        onCreated={(id: string) => { setShowWrite(false); router.push(`/community/${id}`); }}
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex max-w-6xl mx-auto px-6 py-8 gap-8">
        {/* Main Feed */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">커뮤니티</h1>
            </div>
            {session?.user && (
              <button onClick={handleWriteClick} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                <Pencil className="w-3 h-3" />
                글쓰기
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-6">포트폴리오를 공유하고, 투자 전략을 나눠보세요</p>

          {/* Tabs + Category */}
          <div className="flex items-center gap-1 mb-5 pb-4 border-b border-border">
            <div className="flex items-center gap-1 mr-3">
              {(['latest', 'popular'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setPage(1); updateUrl(1, t, categoryId); }}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    tab === t ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'latest' ? '최신' : '인기'}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1 ml-3 overflow-x-auto">
              <button
                onClick={() => { setCategoryId(undefined); setPage(1); updateUrl(1, tab, undefined); }}
                className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap ${!categoryId ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                전체
              </button>
              {categories?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategoryId(c.id); setPage(1); updateUrl(1, tab, c.id); }}
                  className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap ${categoryId === c.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Post List */}
          {isLoading ? (
            <div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="py-3 border-b border-border animate-pulse">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">아직 게시글이 없습니다</div>
          ) : (
            <div>
              {posts.map((post) => (
                <PostRow key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Pagination — <a> 태그로 크롤러 추적 가능 */}
          {totalPages >= 1 && (
            <nav aria-label="페이지네이션" className="flex items-center justify-center gap-1 pt-6 pb-2">
              {page > 1 ? (
                <Link
                  href={buildUrl(page - 1, tab, categoryId)}
                  onClick={(e) => { e.preventDefault(); const np = page - 1; setPage(np); updateUrl(np, tab, categoryId); }}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              ) : (
                <span className="p-1.5 rounded-md opacity-30"><ChevronLeft className="w-4 h-4" /></span>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1]) > 1) acc.push('dots');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === 'dots' ? (
                    <span key={`dots-${i}`} className="px-1 text-muted-foreground text-xs">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildUrl(p, tab, categoryId)}
                      onClick={(e) => { e.preventDefault(); setPage(p); updateUrl(p, tab, categoryId); }}
                      aria-current={page === p ? 'page' : undefined}
                      className={`min-w-[32px] h-8 rounded-md text-xs font-medium transition-colors flex items-center justify-center ${
                        page === p ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {p}
                    </Link>
                  ),
                )}
              {page < totalPages ? (
                <Link
                  href={buildUrl(page + 1, tab, categoryId)}
                  onClick={(e) => { e.preventDefault(); const np = page + 1; setPage(np); updateUrl(np, tab, categoryId); }}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="p-1.5 rounded-md opacity-30"><ChevronRight className="w-4 h-4" /></span>
              )}
            </nav>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-72 shrink-0 hidden lg:block space-y-6">
          {/* Weekly Best */}
          {weeklyBest && weeklyBest.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-border">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold">주간 베스트</span>
              </div>
              <div className="space-y-0.5">
                {weeklyBest.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/community/${p.id}`}
                    className="w-full text-left flex items-start gap-2.5 py-2 px-1 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className={`text-[11px] font-bold mt-px shrink-0 w-4 text-center ${i < 3 ? 'text-amber-400' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <p className="text-[12px] font-medium truncate leading-snug min-w-0 flex-1">{p.title}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums flex items-center gap-1.5">
                      <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{p.likeCount}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{p.commentCount}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Nickname modal */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-xl border border-border p-6 w-80 shadow-2xl">
            <p className="text-sm font-semibold mb-1">닉네임 설정이 필요합니다</p>
            <p className="text-xs text-muted-foreground mb-5">커뮤니티에 참여하려면 먼저 닉네임을 설정해주세요.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNicknameModal(false)} className="px-3 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:opacity-80 transition-opacity">취소</button>
              <Link href="/mypage" onClick={() => setShowNicknameModal(false)} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">설정하러 가기</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 포스트 행 — Link로 SEO 크롤링 가능 */
function PostRow({ post }: { post: CommunityPost }) {
  const isHot = post.likeCount >= 5 || post.commentCount >= 10;

  return (
    <Link
      href={`/community/${post.id}`}
      className="block w-full text-left py-4 border-b border-border hover:bg-card/40 transition-colors group"
    >
      {/* Row 1: Title line */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
          post.category.slug === 'portfolio-review'
            ? 'bg-chart-5/10 text-chart-5'
            : 'bg-primary/10 text-primary'
        }`}>
          {post.category.slug === 'portfolio-review' ? (
            <><Briefcase className="w-2.5 h-2.5 inline -mt-px mr-0.5" />포트폴리오</>
          ) : (
            post.category.name
          )}
        </span>
        {isHot && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 font-semibold">HOT</span>
        )}
        <h3 className="text-[13px] font-semibold truncate group-hover:text-foreground transition-colors">{post.title}</h3>
      </div>

      {/* Row 2: Meta line */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-sky-400">{post.author.nickname}</span>
        <span className="text-border">·</span>
        <span>{timeAgo(post.createdAt)}</span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{formatCount(post.viewCount)}</span>
        {post.likeCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{post.likeCount}</span>
          </>
        )}
        {post.commentCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{post.commentCount}</span>
          </>
        )}
      </div>
    </Link>
  );
}
