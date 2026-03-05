import { create } from 'zustand';
import type { ETFSummary } from '@etf-canvas/shared';

type View = 'explore' | 'canvas' | 'simulate';

interface CanvasStore {
  // Navigation
  activeView: View;
  setActiveView: (view: View) => void;

  // ETF selection (detail panel)
  selectedEtfCode: string | null;
  selectEtf: (code: string) => void;

  // Canvas (max 10 selected, max 3 comparing)
  selected: ETFSummary[];
  comparing: string[];
  addToCanvas: (etf: ETFSummary) => void;
  removeFromCanvas: (code: string) => void;
  toggleCompare: (code: string) => void;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  activeView: 'canvas',
  setActiveView: (view) => set({ activeView: view }),

  selectedEtfCode: null,
  selectEtf: (code) => set({ selectedEtfCode: code }),

  selected: [],
  comparing: [],
  addToCanvas: (etf) => {
    const { selected } = get();
    if (selected.length >= 10 || selected.some((s) => s.code === etf.code)) return;
    set({ selected: [...selected, etf] });
  },
  removeFromCanvas: (code) =>
    set((state) => ({
      selected: state.selected.filter((s) => s.code !== code),
      comparing: state.comparing.filter((c) => c !== code),
    })),
  toggleCompare: (code) => {
    const { comparing } = get();
    if (comparing.includes(code)) {
      set({ comparing: comparing.filter((c) => c !== code) });
    } else if (comparing.length < 3) {
      set({ comparing: [...comparing, code] });
    }
  },
  clearCanvas: () => set({ selected: [], comparing: [] }),
}));
