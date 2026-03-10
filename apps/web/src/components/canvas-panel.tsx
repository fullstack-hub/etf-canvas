'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeftRight, Loader2, Check, Info, Trash2, Sparkles, RotateCcw, EllipsisVertical, AlertTriangle, CheckCircle2, Search, X, GripVertical } from 'lucide-react';
import { EtfDetailModal } from '@/components/etf-detail-modal';
import { SimilarEtfModal } from '@/components/similar-etf-modal';
import { LoginModal } from '@/components/login-modal';
import { toast } from 'sonner';
import { IssuerBadge } from '@/components/issuer-badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CATEGORY_COLORS } from '@/lib/category-colors';
import type { ETFSummary } from '@etf-canvas/shared';

export function CanvasPanel() {
  const { selected, comparing, weights, amounts, setAmount, loadingCodes, removeFromCanvas, toggleCompare, clearCanvas, addToCanvas, addLoadingCode, removeLoadingCode, updateEtfData, synthesize, synthesized, pendingSynthesize, setPendingSynthesize, feedbackEnabled, setFeedbackEnabled, feedbackHash, feedbackText, feedbackActions, feedbackLoading, setFeedback, setFeedbackLoading, setBrowseCategory } = useCanvasStore();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [detailTarget, setDetailTarget] = useState<ETFSummary | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ETFSummary | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    if (session && pendingSynthesize) {
      synthesize();
    }
  }, [session, pendingSynthesize, synthesize]);

  const [dragOver, setDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData('application/etf');
    if (!raw) return;
    try {
      const etf: ETFSummary = JSON.parse(raw);
      if (selected.some((s) => s.code === etf.code)) return;
      addToCanvas(etf);
      if (etf.expenseRatio == null) {
        addLoadingCode(etf.code);
        try {
          const detail = await api.getDetail(etf.code);
          updateEtfData(etf.code, { expenseRatio: detail.expenseRatio });
        } finally {
          removeLoadingCode(etf.code);
        }
      }
    } catch { /* ignore */ }
  };

  const totalAmount = comparing.reduce((sum, code) => sum + (amounts[code] || 0), 0);

  return (
    <div
      className={`flex-1 overflow-auto p-6 space-y-5 bg-canvas-dot bg-[length:24px_24px] transition-all duration-200 relative border-2 ${dragOver ? 'border-dashed border-primary/30 bg-primary/[0.03]' : 'border-transparent'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold tracking-tight">캔버스</h2>
          {selected.length > 0 && (
            <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium tabular-nums ${selected.length >= 20 ? 'bg-red-500/15 text-red-500' : 'bg-muted text-muted-foreground'}`}>
              {selected.length}/20
            </span>
          )}
          {/* Feedback toggle — dev only, always on in prod */}
          {comparing.length > 0 && process.env.NODE_ENV === 'development' && (
            <button
              onClick={() => setFeedbackEnabled(!feedbackEnabled)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              <div className={`relative w-7 h-4 rounded-full transition-colors ${feedbackEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${feedbackEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
              </div>
              <span>피드백</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Total investment amount */}
          {comparing.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">총 투자금</span>
              <span className="text-xs font-bold tabular-nums text-foreground">
                {totalAmount >= 100_000_000
                  ? `${(totalAmount / 100_000_000).toFixed(1)}억원`
                  : `${(totalAmount / 10_000).toLocaleString()}만원`}
              </span>
            </div>
          )}
          {selected.length > 0 && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowResetDialog(true)}>
                <RotateCcw className="w-3.5 h-3.5" />
                초기화
              </Button>
              {comparing.length > 0 && !synthesized && (
                <Button size="sm" disabled={totalAmount === 0} onClick={() => {
                  if (totalAmount === 0) return;
                  if (!session) {
                    setPendingSynthesize(true);
                    setShowLogin(true);
                  } else {
                    synthesize();
                    const items = comparing.map((code) => {
                      const etf = selected.find((s) => s.code === code);
                      return { code, name: etf?.name || '', weight: weights[code] || 0, category: etf?.categories?.[0] || '' };
                    });
                    if (feedbackEnabled || process.env.NODE_ENV === 'production') {
                      const hash = [...comparing].sort().map((c) => `${c}:${weights[c] || 0}`).join(',');
                      if (hash !== feedbackHash) {
                        setFeedbackLoading(true);
                        api.getPortfolioFeedback(items)
                          .then((res) => {
                            setFeedback(hash, res.feedback, res.actions);
                            // 자동저장 (피드백 포함)
                            const fb = { feedback: res.feedback, actions: res.actions, tags: (res as any).tags || [], snippet: (res as any).snippet || '' };
                            api.autoSavePortfolio(items, fb, totalAmount).catch((e) => console.error('auto-save failed:', e));
                          })
                          .catch(() => {
                            setFeedback('', '피드백을 생성할 수 없어요.', []);
                            // 피드백 실패해도 자동저장
                            api.autoSavePortfolio(items, null, totalAmount).catch((e) => console.error('auto-save failed:', e));
                          });
                      } else {
                        // 같은 구성이어도 자동저장
                        api.autoSavePortfolio(items, null).catch((e) => console.error('auto-save failed:', e));
                      }
                    } else {
                      // 피드백 비활성화 상태에서도 자동저장
                      api.autoSavePortfolio(items, null).catch((e) => console.error('auto-save failed:', e));
                    }
                  }
                }} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  합성
                </Button>
              )}
              {synthesized && session && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowSave(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  저장
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {selected.map((etf) => (
          <EtfCard
            key={etf.code}
            etf={etf}
            isComparing={comparing.includes(etf.code)}
            isLoading={loadingCodes.includes(etf.code)}
            dimmed={comparing.length > 0 && !comparing.includes(etf.code)}
            weight={weights[etf.code] || 0}
            amount={amounts[etf.code] || 0}
            onAmountChange={(a) => setAmount(etf.code, a)}
            onToggleCompare={() => toggleCompare(etf.code)}
            onRemove={() => removeFromCanvas(etf.code)}
            onDetail={() => setDetailTarget(etf)}
            onReplace={() => setReplaceTarget(etf)}
          />
        ))}
      </div>

      {selected.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground rounded-xl border border-dashed border-border/50 mt-8">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-foreground/80 mb-1">캔버스가 비어있습니다</h3>
          <p className="text-xs text-muted-foreground/70">좌측에서 ETF를 더블클릭하거나 드래그하여 추가해 주세요</p>
        </div>
      )}

      {detailTarget && <EtfDetailModal etf={detailTarget} onClose={() => setDetailTarget(null)} />}
      {replaceTarget && <SimilarEtfModal etf={replaceTarget} onClose={() => setReplaceTarget(null)} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showSave && (
        <SaveModal
          onClose={() => setShowSave(false)}
          onSave={async (name) => {
            const items = comparing.map((code) => {
              const etf = selected.find((s) => s.code === code);
              return { code, name: etf?.name || code, weight: weights[code] || 0, category: etf?.categories?.[0] || '' };
            });
            const fb = feedbackText ? { feedback: feedbackText, actions: feedbackActions, tags: [] as string[], snippet: '' } : null;
            await api.savePortfolio(name, items, fb, totalAmount);
            queryClient.invalidateQueries({ queryKey: ['portfolios'] });
            queryClient.invalidateQueries({ queryKey: ['gallery-top'] });
            queryClient.invalidateQueries({ queryKey: ['gallery-tags'] });
          }}
        />
      )}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>캔버스를 초기화할까요?</AlertDialogTitle>
            <AlertDialogDescription>선택한 ETF와 합성 결과가 모두 초기화돼요.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={clearCanvas}>초기화</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SaveModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(name.trim() || '나의 포트폴리오');
      toast.success('포트폴리오가 성공적으로 저장되었어요');
      onClose();
    } catch {
      toast.error('저장에 실패했어요. 다시 시도해 주세요');
      savingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-background rounded-xl border shadow-lg p-5 w-[340px] space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-base">포트폴리오 저장</h3>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="포트폴리오 이름을 입력하세요"
          className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-ring/30 transition-all"
          maxLength={100}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>취소</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(value > 0 ? String(value) : '');

  useEffect(() => {
    setText(value > 0 ? String(value) : '');
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setText(raw);
        onChange(Math.max(0, Number(raw) || 0));
      }}
      onBlur={() => {
        const n = Math.max(0, Number(text) || 0);
        setText(n > 0 ? String(n) : '');
        onChange(n);
      }}
      className="h-6 flex-1 px-1.5 text-right text-xs tabular-nums"
      placeholder="0"
    />
  );
}

function EtfCard({
  etf,
  isComparing,
  isLoading,
  dimmed,
  weight,
  amount,
  onAmountChange,
  onToggleCompare,
  onRemove,
  onDetail,
  onReplace,
}: {
  etf: ETFSummary;
  isComparing: boolean;
  isLoading: boolean;
  dimmed: boolean;
  weight: number;
  amount: number;
  onAmountChange: (a: number) => void;
  onToggleCompare: () => void;
  onRemove: () => void;
  onDetail: () => void;
  onReplace: () => void;
}) {
  const cat = etf.categories[0];
  const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS._default;

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const timer = setTimeout(() => {
      window.addEventListener('click', close);
      window.addEventListener('contextmenu', close);
      window.addEventListener('scroll', close, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [ctxMenu]);

  return (
    <div
      ref={cardRef}
      className={`group relative rounded-lg overflow-visible select-none cursor-pointer transition-all duration-200
        ${ctxMenu ? 'z-50' : ''}
        ${isComparing
          ? 'shadow-md ring-1 ring-foreground/70'
          : 'shadow-sm hover:shadow-md border border-border/50 hover:border-border'
        }
        ${dimmed ? 'opacity-65 hover:opacity-95' : ''}`}
      onClick={() => {
        onToggleCompare();
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-2.5 h-7 rounded-t-lg ${catColor.bg}`}>
        <span className="text-[10px] font-semibold truncate text-foreground/70">
          {cat || ''}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare();
          }}
          className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-colors shrink-0
            ${isComparing
              ? 'bg-foreground border-foreground text-background'
              : 'border-muted-foreground/30 hover:border-muted-foreground/60 disabled:opacity-20'
            }`}
          title={isComparing ? '선택 해제' : '합성 대상 선택'}
        >
          {isComparing && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
        </button>
      </div>

      {/* Card body */}
      <div className={`bg-background relative ${isComparing ? '' : 'rounded-b-lg'} overflow-hidden`}>
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="px-2.5 pt-2 pb-2 flex flex-col flex-1 gap-1">
          {/* Title + menu */}
          <div className="flex items-start gap-1">
            <h3 className="font-bold text-[13px] leading-snug line-clamp-2 min-h-[2.5em] flex-1" title={etf.name}>
              {etf.name}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new MouseEvent('click'));
                const rect = cardRef.current?.getBoundingClientRect();
                if (!rect) return;
                setTimeout(() => setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top }), 0);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-all shrink-0"
            >
              <EllipsisVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          {/* Bottom: price + issuer */}
          <div className="mt-auto pt-1.5 border-t border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {etf.price?.toLocaleString()}원
              </span>
              {etf.issuer && <span className="text-[9px] text-muted-foreground/60">{etf.issuer}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Amount controls (only when comparing) */}
      {isComparing && (
        <div
          className="bg-background border-t px-2.5 py-2 rounded-b-lg space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground/70 shrink-0 tabular-nums w-[40px]">
              {weight.toFixed(1)}%
            </span>
            <AmountInput value={amount / 10000} onChange={(v) => onAmountChange(v * 10000)} />
            <span className="text-[10px] text-muted-foreground shrink-0">만원</span>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="absolute z-50 min-w-[140px] rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ right: 4, top: ctxMenu.y }}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
            onClick={(e) => { e.stopPropagation(); setCtxMenu(null); onReplace(); }}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
            유사한 ETF
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
            onClick={(e) => { e.stopPropagation(); setCtxMenu(null); onDetail(); }}
          >
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
            상세보기
          </button>
          <div className="h-px bg-border my-1" />
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
            onClick={(e) => { e.stopPropagation(); setCtxMenu(null); onRemove(); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export function FloatingFeedback({ loading, text, actions, onAction }: {
  loading: boolean;
  text: string;
  actions: { category: string; label: string }[];
  onAction: (cat: string) => void;
}) {
  const { feedbackMinimized, setFeedbackMinimized } = useCanvasStore();
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const posRef = useRef({ x: 0, y: 0 });

  const applyTransform = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.left = `${posRef.current.x}px`;
      cardRef.current.style.top = `${posRef.current.y}px`;
      cardRef.current.style.transform = 'none';
    }
  }, []);

  // On first mount, read CSS-centered position into posRef
  useEffect(() => {
    if (!cardRef.current || initialized.current) return;
    initialized.current = true;
    requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      posRef.current = { x: rect.left, y: rect.top };
    });
  });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (feedbackMinimized) return;
    dragging.current = true;
    offset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
    e.preventDefault();
  }, [feedbackMinimized]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      posRef.current = { x: e.clientX - offset.current.x, y: e.clientY - offset.current.y };
      applyTransform();
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  if (feedbackMinimized) return null;

  return (
    <div
      ref={cardRef}
      className="fixed z-40 w-[640px] rounded-xl border bg-background shadow-2xl left-1/2 top-1/2"
      style={{ willChange: 'transform', transform: 'translate(-50%, -50%)' }}
    >
      {/* Drag handle + header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
        <h3 className="font-bold text-sm flex-1">포트폴리오 피드백</h3>
        <button onClick={() => setFeedbackMinimized(true)} className="p-0.5 rounded hover:bg-muted transition-colors" title="최소화">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
      </div>
      {/* Feedback content */}
      <div className="flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 px-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-500 animate-[sparkle_1.5s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 0 3px #f59e0b)' }} />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-[spin_3s_linear_infinite]" style={{ borderTopColor: '#f59e0b' }} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-foreground/80">포트폴리오를 분석중이에요</p>
              <p className="text-[10px] text-muted-foreground/60">잠시만 기다려 주세요</p>
            </div>
          </div>
        ) : text ? (
          <>
            {/* Scrollable feedback text */}
            <div className="max-h-[200px] overflow-y-auto px-3 pt-2">
              <div className={`rounded-lg border p-2.5 ${actions.length > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30'}`}>
                <div className="flex gap-2 items-start">
                  {actions.length > 0
                    ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  }
                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{text}</p>
                </div>
              </div>
            </div>
            {/* Action buttons */}
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-2">
                {actions.map((action) => (
                  <button
                    key={action.category}
                    onClick={() => onAction(action.category)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-muted/50 text-foreground/80 text-[11px] hover:bg-muted transition-colors"
                  >
                    <Search className="w-2.5 h-2.5 text-muted-foreground" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            {/* Disclaimer */}
            <p className="text-[9px] text-muted-foreground/50 leading-relaxed px-3 pt-2 pb-2">
              본 정보는 공시 자료 기반의 일반적인 분석이며 투자 자문이 아닙니다. 투자 판단은 본인의 책임하에 이루어져야 합니다.
            </p>
          </>
        ) : null}
        {/* Bottom: 16:9 ad area */}
        <div className="px-3 pb-3">
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ads/etf-canvas-hero.jpg"
              alt="ETF Canvas"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

