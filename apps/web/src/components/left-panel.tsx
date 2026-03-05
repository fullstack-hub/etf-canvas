'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PriceChart } from '@/components/price-chart';
import type { ETFSummary, ETFSortBy } from '@etf-canvas/shared';

const categories = [
  { key: '국내 대표지수', label: '국내\n대표지수', icon: '🇰🇷' },
  { key: '해외 대표지수', label: '해외\n대표지수', icon: '🌍' },
  { key: '섹터/테마', label: '섹터/테마', icon: '🎯' },
  { key: '채권', label: '채권', icon: '📄' },
  { key: '원자재', label: '원자재', icon: '⛏️' },
  { key: '레버리지/인버스', label: '레버리지\n/인버스', icon: '↕️' },
  { key: '혼합', label: '혼합', icon: '🔀' },
  { key: '액티브', label: '액티브', icon: '⚡' },
  { key: 'New', label: 'New', icon: '🆕' },
];

export function LeftPanel() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('국내 대표지수');
  const [sortBy, setSortBy] = useState<ETFSortBy>('aum');
  const [catOpen, setCatOpen] = useState(true);
  const { selectedEtfCode, selectEtf, addToCanvas } = useCanvasStore();

  // Debounced search
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    const timer = setTimeout(() => setDebouncedQuery(value), 300);
    return () => clearTimeout(timer);
  }, []);

  const { data: etfs } = useQuery({
    queryKey: ['etf-search', debouncedQuery, category, sortBy],
    queryFn: () =>
      debouncedQuery
        ? api.search(debouncedQuery, category || undefined, sortBy)
        : api.list(category || undefined, sortBy),
  });

  // 첫 번째 종목 자동 선택
  useEffect(() => {
    if (etfs && etfs.length > 0 && !selectedEtfCode) {
      selectEtf(etfs[0].code);
    }
  }, [etfs, selectedEtfCode, selectEtf]);

  const { data: selectedPrices } = useQuery({
    queryKey: ['etf-mini-prices', selectedEtfCode],
    queryFn: () => api.getDailyPrices(selectedEtfCode!, '3m'),
    enabled: !!selectedEtfCode,
  });

  const { data: selectedDetail } = useQuery({
    queryKey: ['etf-detail', selectedEtfCode],
    queryFn: () => api.getDetail(selectedEtfCode!),
    enabled: !!selectedEtfCode,
  });

  return (
    <div className="w-72 border-r flex flex-col h-full shrink-0 bg-background">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <h2 className="text-lg font-bold mb-2">ETF</h2>
        <Input
          placeholder="검색"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Categories */}
      <div className="px-3 py-2 border-b">
        <button
          onClick={() => setCatOpen(!catOpen)}
          className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground"
        >
          ETF 카테고리
          <span className="text-xs">{catOpen ? '▲' : '▼'}</span>
        </button>
        {catOpen && (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(category === cat.key ? '' : cat.key)}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-colors ${
                  category === cat.key
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span className="whitespace-pre-wrap text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ETF List */}
      <div className="px-3 py-2 flex items-center justify-between border-b">
        <span className="text-sm font-medium text-muted-foreground">ETF</span>
        <div className="flex gap-1">
          <button
            onClick={() => setSortBy('returnRate')}
            className={`text-[10px] px-1.5 py-0.5 rounded ${sortBy === 'returnRate' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
          >
            수익률
          </button>
          <button
            onClick={() => setSortBy('aum')}
            className={`text-[10px] px-1.5 py-0.5 rounded ${sortBy === 'aum' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
          >
            AUM
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <TooltipProvider delayDuration={300}>
          <div className="px-1">
            {etfs?.map((etf) => (
              <EtfListItem
                key={etf.code}
                etf={etf}
                isSelected={selectedEtfCode === etf.code}
                sortBy={sortBy}
                onSelect={() => selectEtf(etf.code)}
                onAdd={() => addToCanvas(etf)}
              />
            ))}
            {etfs?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                검색 결과 없음
              </p>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Mini Chart / Return Rate */}
      {selectedEtfCode && selectedDetail && (
        <div className="border-t px-3 py-2">
          <p className="text-xs font-medium mb-1">
            {selectedDetail.name}
          </p>
          <p className="text-[10px] text-muted-foreground mb-1">3개월 수익률</p>
          <div className="h-28">
            <PriceChart data={selectedPrices || []} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function EtfListItem({
  etf,
  isSelected,
  sortBy,
  onSelect,
  onAdd,
}: {
  etf: ETFSummary;
  isSelected: boolean;
  sortBy: ETFSortBy;
  onSelect: () => void;
  onAdd: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const { data: detail } = useQuery({
    queryKey: ['etf-detail', etf.code],
    queryFn: () => api.getDetail(etf.code),
    enabled: hovered && etf.expenseRatio == null,
    staleTime: Infinity,
  });

  const expenseRatio = etf.expenseRatio ?? detail?.expenseRatio ?? null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          onDoubleClick={onAdd}
          onMouseEnter={() => setHovered(true)}
          className={`w-full max-w-full flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors overflow-hidden ${
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'
          }`}
        >
          <span className="flex-1 min-w-0 truncate text-left">{etf.name}</span>
          {sortBy === 'returnRate' ? (
            <span className={`text-xs shrink-0 text-right tabular-nums ${
              etf.threeMonthEarnRate != null && etf.threeMonthEarnRate > 0 ? 'text-red-500'
              : etf.threeMonthEarnRate != null && etf.threeMonthEarnRate < 0 ? 'text-blue-500'
              : 'text-muted-foreground'
            }`}>
              {etf.threeMonthEarnRate != null ? `${etf.threeMonthEarnRate.toFixed(1)}%` : '-'}
            </span>
          ) : (
            <span className="text-xs shrink-0 text-right tabular-nums text-muted-foreground">
              {etf.aum ? (etf.aum >= 10000 ? `${(etf.aum / 10000).toFixed(1)}조` : `${etf.aum.toLocaleString()}억`) : '-'}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs space-y-1.5 p-3">
        <p className="font-medium text-sm">{etf.name}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="opacity-60">자산</span><span>{etf.categories[0] || '-'}</span>
          <span className="opacity-60">국가</span><span>{etf.categories.some((c: string) => c === '국내 대표지수' || c === '섹터/테마') ? '한국' : '해외'}</span>
          <span className="opacity-60">AUM</span><span>{etf.aum ? `${etf.aum.toLocaleString()}억` : '-'}</span>
          <span className="opacity-60">3개월 수익률</span><span className={etf.threeMonthEarnRate != null && etf.threeMonthEarnRate > 0 ? 'text-red-400' : etf.threeMonthEarnRate != null && etf.threeMonthEarnRate < 0 ? 'text-blue-400' : ''}>{etf.threeMonthEarnRate != null ? `${etf.threeMonthEarnRate > 0 ? '+' : ''}${etf.threeMonthEarnRate.toFixed(2)}%` : '-'}</span>
          <span className="opacity-60">운용보수</span><span>{expenseRatio != null ? `${(expenseRatio * 100).toFixed(3)}%` : <span className="inline-block w-3 h-3 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin" />}</span>
        </div>
        <p className="text-[10px] opacity-40 pt-1">더블클릭: 캔버스에 추가</p>
      </TooltipContent>
    </Tooltip>
  );
}
