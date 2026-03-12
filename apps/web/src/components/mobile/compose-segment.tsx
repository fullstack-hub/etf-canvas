'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { SwipeToDelete } from '@/components/mobile/swipe-to-delete';
import { LoginModal } from '@/components/login-modal';
import { SavePortfolioModal } from '@/components/save-portfolio-modal';
import { api } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CATEGORY_COLORS: Record<string, string> = {
  '국내 대표지수': 'bg-blue-500',
  '해외 대표지수': 'bg-red-500',
  '섹터/테마': 'bg-amber-500',
  '채권': 'bg-emerald-500',
  '원자재': 'bg-orange-500',
  '레버리지/인버스': 'bg-pink-500',
  '혼합': 'bg-violet-500',
  '액티브': 'bg-cyan-500',
  'New': 'bg-lime-500',
};

export function MobileComposeSegment() {
  const { data: session } = useSession();
  const { selected, comparing, amounts, weights, synthesized, removeFromCanvas, setAmount, clearCanvas, synthesize, setFeedbackLoading, setFeedback, setPendingSynthesize } = useCanvasStore();
  const { setCanvasSegment, showSaveModal, setShowSaveModal } = useMobileUIStore();
  const [showLogin, setShowLogin] = useState(false);

  const totalAmount = comparing.reduce((sum, code) => sum + (amounts[code] || 0), 0);

  const handleSynthesize = async () => {
    if (!session?.user) {
      setPendingSynthesize(true);
      setShowLogin(true);
      return;
    }
    synthesize();
    setCanvasSegment('performance');

    setFeedbackLoading(true);
    let fbResult: { feedback: string; actions: { category: string; label: string }[]; tags: string[]; snippet: string } | null = null;
    try {
      const items = comparing.map((code) => {
        const etf = selected.find((s) => s.code === code);
        return { code, name: etf?.name || code, weight: weights[code] || 0, category: etf?.categories[0] || '' };
      });
      fbResult = await api.getPortfolioFeedback(items);
      const hash = JSON.stringify(items);
      setFeedback(hash, fbResult.feedback, fbResult.actions || []);
    } catch {
      setFeedbackLoading(false);
    }

    try {
      const items = comparing.map((code) => {
        const etf = selected.find((s) => s.code === code);
        return { code, name: etf?.name || code, weight: weights[code] || 0, category: etf?.categories[0] };
      });
      await api.autoSavePortfolio(items, fbResult, totalAmount);
    } catch { /* ignore */ }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`;
    return amount.toLocaleString();
  };

  if (selected.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <p className="text-sm">탐색 탭에서 ETF를 추가해주세요</p>
        <button
          onClick={() => setCanvasSegment('discover')}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          ETF 탐색하기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <span className="text-xs text-muted-foreground">총 투자금</span>
          <p className="text-lg font-bold">{formatAmount(totalAmount)}원</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted">
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>캔버스 초기화</AlertDialogTitle>
              <AlertDialogDescription>모든 ETF가 제거됩니다. 계속하시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={clearCanvas}>초기화</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selected.filter((etf) => comparing.includes(etf.code)).map((etf) => (
          <SwipeToDelete key={etf.code} onDelete={() => removeFromCanvas(etf.code)}>
            <div className="flex items-start gap-3 px-4 py-3 border-b border-border/50">
              <div className={`w-1 h-full min-h-[48px] rounded-full shrink-0 ${CATEGORY_COLORS[etf.categories[0]] || 'bg-muted'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{etf.name}</p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {(weights[etf.code] || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setAmount(etf.code, Math.max(0, (amounts[etf.code] || 0) - 1000000))}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    value={formatAmount(amounts[etf.code] || 0)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setAmount(etf.code, Number(raw));
                    }}
                    className="flex-1 h-8 rounded-lg bg-muted text-center text-sm font-medium outline-none"
                  />
                  <button
                    onClick={() => setAmount(etf.code, (amounts[etf.code] || 0) + 1000000)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </SwipeToDelete>
        ))}
      </div>

      <div className="px-4 py-3 space-y-2 border-t">
        <button
          onClick={handleSynthesize}
          disabled={totalAmount === 0}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          합성하기
        </button>
        {synthesized && session?.user && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="w-full h-10 rounded-xl border text-sm font-medium"
          >
            저장하기
          </button>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showSaveModal && <SavePortfolioModal onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}
