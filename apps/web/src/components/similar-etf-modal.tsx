'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { X, Loader2 } from 'lucide-react';
import { useReturnColors } from '@/lib/return-colors';
import { Button } from '@/components/ui/button';
import type { ETFSummary } from '@etf-canvas/shared';

interface Props {
  etf: ETFSummary;
  onClose: () => void;
}

export function SimilarEtfModal({ etf, onClose }: Props) {
  const rc = useReturnColors();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const { replaceOnCanvas } = useCanvasStore();

  // Get detail for benchmark info
  const { data: detail } = useQuery({
    queryKey: ['etf-detail', etf.code],
    queryFn: () => api.getDetail(etf.code),
  });

  const benchmark = detail?.benchmark;

  // Search same-benchmark ETFs (같은 기초지수 추종)
  const { data: similarEtfs, isLoading } = useQuery({
    queryKey: ['etf-similar', benchmark],
    queryFn: () => api.listByBenchmark(benchmark!, 'aum'),
    enabled: !!benchmark,
  });

  // Filter: exclude self
  const candidates = (similarEtfs || []).filter((s) => s.code !== etf.code);

  const handleReplace = () => {
    if (!selectedCode) return;
    const newEtf = candidates.find((c) => c.code === selectedCode);
    if (!newEtf) return;
    replaceOnCanvas(etf.code, newEtf);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-background rounded-xl shadow-2xl w-[520px] max-h-[70vh] overflow-hidden border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{etf.name}과 유사한 ETF</h2>
            {detail?.benchmark && (
              <p className="text-xs text-muted-foreground mt-0.5">
                기초지수: {detail.benchmark}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              유사한 ETF를 찾을 수 없어요.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium w-8">#</th>
                  <th className="text-left py-2 font-medium">ETF</th>
                  <th className="text-right py-2 font-medium">AUM</th>
                  <th className="text-right py-2 font-medium">운용보수</th>
                  <th className="text-right py-2 font-medium">3M 수익률</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => {
                  const isSelected = selectedCode === c.code;
                  return (
                    <tr
                      key={c.code}
                      onClick={() => setSelectedCode(c.code)}
                      className={`border-b cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-foreground/[0.04] dark:bg-foreground/[0.08]'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      <td className="py-2.5 text-muted-foreground relative">
                        {isSelected && (
                          <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-foreground" />
                        )}
                        {i + 1}.
                      </td>
                      <td className="py-2.5">
                        <div className={`font-medium truncate max-w-[180px] ${isSelected ? 'text-foreground' : ''}`}>{c.name}</div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {c.aum
                          ? c.aum >= 10000
                            ? `${(c.aum / 10000).toFixed(1)}조`
                            : `${c.aum.toLocaleString()}억`
                          : '-'}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                        {c.expenseRatio != null ? `${(c.expenseRatio * 100).toFixed(2)}%` : '-'}
                      </td>
                      <td className={`py-2.5 text-right tabular-nums ${
                        c.threeMonthEarnRate != null && c.threeMonthEarnRate > 0
                          ? rc.upClass
                          : c.threeMonthEarnRate != null && c.threeMonthEarnRate < 0
                          ? rc.downClass
                          : 'text-muted-foreground'
                      }`}>
                        {c.threeMonthEarnRate != null
                          ? `${c.threeMonthEarnRate > 0 ? '+' : ''}${c.threeMonthEarnRate.toFixed(1)}%`
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t">
          <Button
            className="w-full"
            disabled={!selectedCode}
            onClick={handleReplace}
          >
            ETF 교체
          </Button>
        </div>
      </div>
    </div>
  );
}
