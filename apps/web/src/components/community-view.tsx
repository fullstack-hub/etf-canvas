'use client';

import { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Pencil, Heart, MessageCircle, Eye, Trophy, Briefcase } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommunityPost } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { CommunityPostDetail } from '@/components/community-post-detail';
import { CommunityWrite } from '@/components/community-write';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export function CommunityView() {
  const { data: session } = useSession();
  const { setCurrentView } = useCanvasStore();
  const [tab, setTab] = useState<'latest' | 'popular'>('latest');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showWrite, setShowWrite] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['community-categories'],
    queryFn: () => api.communityCategories(),
    staleTime: 60_000 * 10,
  });

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['community-posts', tab, categoryId],
    queryFn: ({ pageParam }) => api.communityPosts({ cursor: pageParam, sort: tab, categoryId }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const { data: weeklyBest } = useQuery({
    queryKey: ['community-weekly-best'],
    queryFn: () => api.communityWeeklyBest(5),
    staleTime: 60_000 * 5,
    enabled: tab === 'latest',
  });

  const posts = postsData?.pages.flatMap((p) => p.posts) ?? [];

  // infinite scroll
  const observerRef = useRef<IntersectionObserver>(null);
  const lastRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      observerRef.current?.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  const { data: me } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => api.getMe(),
    enabled: !!session?.user,
  });

  const handleWriteClick = () => {
    if (!session?.user) return;
    if (!me?.nickname) {
      setShowNicknameModal(true);
      return;
    }
    setShowWrite(true);
  };

  // detail/write 모드
  if (selectedPostId) {
    return <CommunityPostDetail postId={selectedPostId} onBack={() => setSelectedPostId(null)} />;
  }
  if (showWrite) {
    return <CommunityWrite onClose={() => setShowWrite(false)} onCreated={(id) => { setShowWrite(false); setSelectedPostId(id); }} />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">커뮤니티</h1>
          {session?.user && (
            <button
              onClick={handleWriteClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              글쓰기
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-4 border-b border-border">
          {(['latest', 'popular'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'latest' ? '최신' : '인기'}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setCategoryId(undefined)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !categoryId ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            전체
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                categoryId === c.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Weekly Best */}
        {tab === 'latest' && weeklyBest && weeklyBest.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold">주간 베스트</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {weeklyBest.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  className="shrink-0 w-56 rounded-xl border border-border/60 bg-card p-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-amber-500">#{i + 1}</span>
                    <span className="text-[10px] text-muted-foreground">{p.author.nickname}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{p.likeCount}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{p.commentCount}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border/40 bg-card p-4 h-24" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">아직 게시글이 없습니다</div>
        ) : (
          <div className="space-y-2">
            {posts.map((post, idx) => (
              <div
                key={post.id}
                ref={idx === posts.length - 1 ? lastRef : undefined}
              >
                <PostCard post={post} onClick={() => setSelectedPostId(post.id)} />
              </div>
            ))}
            {isFetchingNextPage && (
              <div className="text-center py-4 text-muted-foreground text-xs">불러오는 중...</div>
            )}
          </div>
        )}
      </div>

      {/* Nickname modal */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 w-80 shadow-xl">
            <p className="text-sm font-medium mb-4">닉네임 설정이 필요합니다</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNicknameModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => { setShowNicknameModal(false); setCurrentView('mypage'); }}
                className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                설정하러 가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onClick }: { post: CommunityPost; onClick: () => void }) {
  const badges: string[] = [];
  if (post.author.showInvestExp && post.author.investExp) badges.push(post.author.investExp);
  if (post.author.showInvestStyle && post.author.investStyle) badges.push(post.author.investStyle);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/60 bg-card p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {post.category.slug === 'portfolio-review' && (
          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-chart-5/15 text-chart-5">
            <Briefcase className="w-2.5 h-2.5" />
            포트폴리오
          </span>
        )}
        <span className="text-[11px] text-muted-foreground">{post.author.nickname}</span>
        {badges.map((b) => (
          <span key={b} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{b}</span>
        ))}
        <span className="text-[10px] text-muted-foreground/50 ml-auto">{timeAgo(post.createdAt)}</span>
      </div>
      <h3 className="text-sm font-semibold mb-1 line-clamp-1">{post.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-1">{post.contentPreview}</p>
      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likeCount}</span>
        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.commentCount}</span>
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.viewCount}</span>
      </div>
    </button>
  );
}
