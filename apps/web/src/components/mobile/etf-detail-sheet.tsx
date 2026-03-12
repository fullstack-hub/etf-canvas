'use client';

import { useQuery } from '@tanstack/react-query';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { EtfDetailModal } from '@/components/etf-detail-modal';
import { useCanvasStore } from '@/lib/store';
import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { api } from '@/lib/api';
import type { ETFSummary } from '@etf-canvas/shared';

export function EtfDetailSheet() {
  const { etfDetailCode, setEtfDetailCode } = useMobileUIStore();
  const { selected, addToCanvas } = useCanvasStore();

  const existingEtf = selected.find((s) => s.code === etfDetailCode);

  const { data: fetchedEtf } = useQuery({
    queryKey: ['etf-detail-summary', etfDetailCode],
    queryFn: () => api.getDetail(etfDetailCode!),
    enabled: !!etfDetailCode && !existingEtf,
  });

  const etf = existingEtf || fetchedEtf;

  return (
    <Drawer open={!!etfDetailCode} onOpenChange={(open) => { if (!open) setEtfDetailCode(null); }}>
      <DrawerContent className="max-h-[85vh]">
        {etf && (
          <div className="overflow-y-auto max-h-[calc(85vh-2rem)]">
            <EtfDetailModal
              etf={etf as ETFSummary}
              onClose={() => setEtfDetailCode(null)}
              mode="inline"
              onAddToCanvas={addToCanvas}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
