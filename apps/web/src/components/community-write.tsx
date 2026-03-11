'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { ChevronLeft, Briefcase, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommunityPostDetail } from '@/lib/api';

export function CommunityWrite({
  editPost,
  onClose,
  onCreated,
}: {
  editPost?: CommunityPostDetail;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(editPost?.title || '');
  const [content, setContent] = useState(editPost?.content || '');
  const [portfolioId, setPortfolioId] = useState<string | undefined>(editPost?.portfolioId ?? undefined);
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);

  const { data: myPortfolios } = useQuery({
    queryKey: ['my-portfolios'],
    queryFn: () => api.listPortfolios(),
    enabled: !!session?.user && !editPost,
  });

  const createMutation = useMutation({
    mutationFn: () => api.communityCreatePost({ title: title.trim(), content: content.trim(), portfolioId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-weekly-best'] });
      onCreated(data.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api.communityUpdatePost(editPost!.id, { title: title.trim(), content: content.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-post', editPost!.id] });
      onCreated(editPost!.id);
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    if (editPost) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedPortfolio = myPortfolios?.find((p) => p.id === portfolioId);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            {editPost ? '수정 취소' : '돌아가기'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isPending}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {isPending ? '저장 중...' : editPost ? '수정' : '등록'}
          </button>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full text-lg font-bold bg-transparent outline-none border-b border-border/50 pb-3 mb-4 placeholder:text-muted-foreground/30"
          maxLength={200}
        />

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          className="w-full min-h-[300px] bg-transparent outline-none text-sm leading-relaxed resize-none placeholder:text-muted-foreground/30"
          maxLength={5000}
        />

        {/* Portfolio picker */}
        {!editPost && (
          <div className="mt-4 pt-4 border-t border-border/50">
            {portfolioId && selectedPortfolio ? (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-chart-5/30 bg-chart-5/5">
                <Briefcase className="w-3.5 h-3.5 text-chart-5 shrink-0" />
                <span className="text-xs font-medium text-chart-5 flex-1 truncate">{selectedPortfolio.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {selectedPortfolio.items.slice(0, 3).map((i) => i.name).join(', ')}
                </span>
                <button onClick={() => setPortfolioId(undefined)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPortfolioPicker(!showPortfolioPicker)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5" />
                포트폴리오 첨부 (선택)
              </button>
            )}

            {showPortfolioPicker && !portfolioId && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {myPortfolios?.filter((p) => !p.items.length || true).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPortfolioId(p.id); setShowPortfolioPicker(false); }}
                    className="w-full text-left p-2.5 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {p.items.slice(0, 3).map((i) => i.name).join(', ')}
                    </p>
                  </button>
                ))}
                {(!myPortfolios || myPortfolios.length === 0) && (
                  <p className="text-xs text-muted-foreground/50 py-2">저장된 포트폴리오가 없습니다</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Character count */}
        <div className="flex justify-end mt-4 text-[10px] text-muted-foreground/40">
          {content.length}/5000
        </div>
      </div>
    </div>
  );
}
