'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Loader2, Check, Info, Trash2 } from 'lucide-react';
import { EtfDetailModal } from '@/components/etf-detail-modal';
import { SimilarEtfModal } from '@/components/similar-etf-modal';
import type { ETFSummary } from '@etf-canvas/shared';

export function CanvasPanel() {
  const { selected, comparing, loadingCodes, removeFromCanvas, toggleCompare, clearCanvas, addToCanvas, addLoadingCode, removeLoadingCode, updateEtfData } = useCanvasStore();
  const [detailTarget, setDetailTarget] = useState<ETFSummary | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ETFSummary | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData('application/etf');
    if (!raw) return;
    try {
      const etf: ETFSummary = JSON.parse(raw);
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

  return (
    <div
      className={`flex-1 overflow-auto p-6 space-y-5 bg-canvas-dot bg-[length:24px_24px] transition-colors ${dragOver ? 'bg-primary/5 ring-2 ring-primary/30 ring-inset' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight">캔버스</h2>
          {selected.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{selected.length}/20</span>
          )}
        </div>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={clearCanvas}>초기화</Button>
          )}
        </div>
      </div>

      {/* ETF Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {selected.map((etf) => (
          <EtfCard
            key={etf.code}
            etf={etf}
            isComparing={comparing.includes(etf.code)}
            isLoading={loadingCodes.includes(etf.code)}
            dimmed={comparing.length > 0 && !comparing.includes(etf.code)}
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
    </div>
  );
}

function EtfCard({
  etf,
  isComparing,
  isLoading,
  dimmed,
  onToggleCompare,
  onRemove,
  onDetail,
  onReplace,
}: {
  etf: ETFSummary;
  isComparing: boolean;
  isLoading: boolean;
  dimmed: boolean;
  onToggleCompare: () => void;
  onRemove: () => void;
  onDetail: () => void;
  onReplace: () => void;
}) {
  const { data: detail } = useQuery({
    queryKey: ['etf-detail', etf.code],
    queryFn: () => api.getDetail(etf.code),
    staleTime: 1000 * 60 * 10,
  });

  const benchmark = detail?.benchmark;
  const cat = etf.categories[0];
  const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS._default;

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [ctxMenu]);

  return (
    <div
      ref={cardRef}
      className={`group relative rounded-lg overflow-visible select-none cursor-pointer transition-all duration-200
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
      <div className={`flex items-center justify-between px-2.5 h-7 rounded-t-lg ${colors.headerBg}`}>
        <span className={`text-[10px] font-semibold truncate ${colors.headerText}`}>
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
      <div className="bg-background relative rounded-b-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="px-2.5 pt-2.5 pb-2.5 flex flex-col gap-2">
          <h3 className="font-bold text-sm leading-snug line-clamp-2 min-h-[2.6em]" title={etf.name}>
            {etf.name}
          </h3>
          <span className="text-[10px] text-muted-foreground/60 truncate" title={benchmark || ''}>
            {benchmark || '\u00A0'}
          </span>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="absolute z-50 min-w-[140px] rounded-lg border bg-popover shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
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

const CATEGORY_COLORS: Record<string, { accent: string; headerBg: string; headerText: string }> = {
  '국내 대표지수': { accent: 'bg-blue-500', headerBg: 'bg-blue-50 dark:bg-blue-950/40', headerText: 'text-blue-700/70 dark:text-blue-300/70' },
  '해외 대표지수': { accent: 'bg-cyan-500', headerBg: 'bg-cyan-50 dark:bg-cyan-950/40', headerText: 'text-cyan-700/70 dark:text-cyan-300/70' },
  '섹터/테마': { accent: 'bg-violet-500', headerBg: 'bg-violet-50 dark:bg-violet-950/40', headerText: 'text-violet-700/70 dark:text-violet-300/70' },
  '액티브': { accent: 'bg-purple-500', headerBg: 'bg-purple-50 dark:bg-purple-950/40', headerText: 'text-purple-700/70 dark:text-purple-300/70' },
  '채권': { accent: 'bg-emerald-500', headerBg: 'bg-emerald-50 dark:bg-emerald-950/40', headerText: 'text-emerald-700/70 dark:text-emerald-300/70' },
  '혼합': { accent: 'bg-teal-500', headerBg: 'bg-teal-50 dark:bg-teal-950/40', headerText: 'text-teal-700/70 dark:text-teal-300/70' },
  '원자재': { accent: 'bg-amber-500', headerBg: 'bg-amber-50 dark:bg-amber-950/40', headerText: 'text-amber-700/70 dark:text-amber-300/70' },
  '레버리지/인버스': { accent: 'bg-red-500', headerBg: 'bg-red-50 dark:bg-red-950/40', headerText: 'text-red-700/70 dark:text-red-300/70' },
  _default: { accent: 'bg-muted-foreground', headerBg: 'bg-muted/50', headerText: 'text-muted-foreground' },
};

