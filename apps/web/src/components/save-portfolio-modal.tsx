'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';

export function SavePortfolioModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const { comparing, selected, weights } = useCanvasStore();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !session?.user?.id) return;
    setSaving(true);
    try {
      const items = comparing.map((code) => {
        const etf = selected.find((s) => s.code === code);
        return { code, name: etf?.name || code, weight: weights[code] || 0 };
      });
      const result = await api.savePortfolio(session.user.id, name.trim(), items);
      setSavedSlug(result.slug);
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = savedSlug ? `${window.location.origin}/portfolio/${savedSlug}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={savedSlug ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-background rounded-2xl border shadow-2xl w-[360px] p-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {savedSlug ? (
          <div className="text-center">
            <div className="text-2xl mb-2">&#x2705;</div>
            <h2 className="text-lg font-bold mb-1">저장 완료!</h2>
            <p className="text-sm text-muted-foreground mb-4">공유 링크가 생성되었어요</p>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 mb-4">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-xs truncate outline-none"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                {copied ? '복사됨!' : '복사'}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full h-11 rounded-lg border font-medium text-sm hover:bg-muted/50 transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold">나만의 포트폴리오 저장하기</h2>
              <p className="text-sm text-muted-foreground mt-1">포트폴리오 이름을 입력하세요</p>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="예: 무조건 간다!"
              className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
              autoFocus
              maxLength={100}
            />

            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
