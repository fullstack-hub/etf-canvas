'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Info, ArrowLeftRight, Loader2, Check } from 'lucide-react';
import { EtfDetailModal } from '@/components/etf-detail-modal';
import { SimilarEtfModal } from '@/components/similar-etf-modal';
import type { ETFSummary } from '@etf-canvas/shared';

export function CanvasPanel() {
  const { selected, comparing, loadingCodes, removeFromCanvas, toggleCompare, clearCanvas } = useCanvasStore();
  const [detailTarget, setDetailTarget] = useState<ETFSummary | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ETFSummary | null>(null);

  return (
    <div className="flex-1 overflow-auto p-6 space-y-5 bg-canvas-dot bg-[length:24px_24px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight">캔버스</h2>
          {selected.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{selected.length}/10</span>
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
            comparingFull={comparing.length >= 3}
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
          <p className="text-xs text-muted-foreground/70">좌측에서 ETF를 더블클릭하여 추가해 주세요</p>
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
  comparingFull,
  onToggleCompare,
  onRemove,
  onDetail,
  onReplace,
}: {
  etf: ETFSummary;
  isComparing: boolean;
  isLoading: boolean;
  comparingFull: boolean;
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

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 cursor-pointer select-none overflow-hidden
        ${isComparing
          ? 'bg-background shadow-md border-transparent ring-[1.5px] ring-blue-500/80'
          : 'bg-background/80 hover:bg-background border-border/60 hover:border-border hover:shadow-sm'
        }`}
      onClick={() => {
        if (!isComparing && comparingFull) return;
        onToggleCompare();
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center z-20 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">데이터 로딩</span>
          </div>
        </div>
      )}

      {/* Compare checkbox - top right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isComparing && comparingFull) return;
          onToggleCompare();
        }}
        disabled={!isComparing && comparingFull}
        className={`absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center transition-colors z-10
          ${isComparing
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-muted-foreground/30 hover:border-muted-foreground/60 disabled:opacity-40'
          }`}
        title={isComparing ? '선택 해제' : '합성 대상 선택 (최대 3개)'}
      >
        {isComparing && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
      </button>

      {/* Remove button - hover only */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-2.5 right-7 p-0.5 rounded text-muted-foreground/40 hover:text-destructive transition-all opacity-0 group-hover:opacity-100 z-10"
        title="삭제"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="px-3 py-2.5 pr-8 h-[100px] flex flex-col justify-between">
        {/* Top: category chip + name */}
        <div className="space-y-1">
          {etf.categories[0] && (
            <span className={`inline-block text-[9px] font-medium px-1.5 py-[1px] rounded-full leading-normal ${getCategoryChipStyle(etf.categories[0])}`}>{etf.categories[0]}</span>
          )}
          <h3 className="font-semibold text-[13px] leading-[1.3] line-clamp-2 h-[34px]" title={etf.name}>
            {etf.name}
          </h3>
        </div>

        {/* Bottom: benchmark left, action icons right */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/50 truncate max-w-[60%]" title={benchmark || ''}>
            {benchmark || ''}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onDetail(); }}
              className="p-1 rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted/80 transition-colors"
              title="상세 정보"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReplace(); }}
              className="p-1 rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted/80 transition-colors"
              title="유사 ETF로 교체"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_CHIP_STYLES: Record<string, string> = {
  '국내 대표지수': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  '해외 대표지수': 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  '섹터/테마': 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  '액티브': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  '채권': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  '혼합': 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  '원자재': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  '레버리지/인버스': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

function getCategoryChipStyle(category: string): string {
  return CATEGORY_CHIP_STYLES[category] || 'bg-muted/60 text-muted-foreground';
}
