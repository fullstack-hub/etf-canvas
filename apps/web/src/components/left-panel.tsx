'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PriceChart } from '@/components/price-chart';
import type { ETFSummary } from '@etf-canvas/shared';

const categories = [
  { key: '주식', label: '주식', icon: '📈' },
  { key: '테마', label: '테마', icon: '🎯' },
  { key: '채권', label: '채권', icon: '📄' },
  { key: '원자재', label: '원자재', icon: '⛏️' },
  { key: '레버리지', label: '레버리지\n& 인버스', icon: '↕️' },
  { key: '운용사', label: '운용사', icon: '🏢' },
];

export function LeftPanel() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('');
  const [catOpen, setCatOpen] = useState(true);
  const { selectedEtfCode, selectEtf, addToCanvas } = useCanvasStore();

  // Debounced search
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    const timer = setTimeout(() => setDebouncedQuery(value), 300);
    return () => clearTimeout(timer);
  }, []);

  const { data: etfs } = useQuery({
    queryKey: ['etf-search', debouncedQuery, category],
    queryFn: () =>
      debouncedQuery
        ? api.search(debouncedQuery, category || undefined)
        : api.list(category || undefined),
  });

  const { data: selectedPrices } = useQuery({
    queryKey: ['etf-mini-prices', selectedEtfCode],
    queryFn: () => api.getDailyPrices(selectedEtfCode!, '1y'),
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
      <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b">
        ETF
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <TooltipProvider delayDuration={300}>
          <div className="px-1">
            {etfs?.map((etf) => (
              <EtfListItem
                key={etf.code}
                etf={etf}
                isSelected={selectedEtfCode === etf.code}
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
      </ScrollArea>

      {/* Mini Chart */}
      {selectedEtfCode && selectedDetail && (
        <div className="border-t px-3 py-2">
          <p className="text-xs font-medium mb-1">
            {selectedDetail.name}
          </p>
          <p className="text-[10px] text-muted-foreground mb-1">1년 수익률</p>
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
  onSelect,
  onAdd,
}: {
  etf: ETFSummary;
  isSelected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          onDoubleClick={onAdd}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
            isSelected
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'
          }`}
        >
          <span className="truncate text-left">{etf.name}</span>
          <span className="text-xs text-muted-foreground ml-2 shrink-0">
            {etf.expenseRatio ? `${(etf.expenseRatio * 100).toFixed(2)}%` : '-'}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs space-y-1 p-3">
        <p className="font-medium">{etf.name}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
          <span>카테고리</span><span className="text-foreground">{etf.category}</span>
          <span>AUM</span><span className="text-foreground">{etf.aum ? `${(etf.aum / 100_000_000).toFixed(0)}억` : '-'}</span>
          <span>운용보수</span><span className="text-foreground">{etf.expenseRatio ? `${(etf.expenseRatio * 100).toFixed(3)}%` : '-'}</span>
        </div>
        <p className="text-[10px] text-muted-foreground pt-1">더블클릭: 캔버스에 추가</p>
      </TooltipContent>
    </Tooltip>
  );
}
