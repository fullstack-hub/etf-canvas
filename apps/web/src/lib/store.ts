import { create } from 'zustand';
import type { ETFSummary } from '@etf-canvas/shared';

interface CanvasStore {
  // ETF selection (left panel)
  selectedEtfCode: string | null;
  selectEtf: (code: string) => void;

  // Canvas (max 10 selected, max 3 comparing)
  selected: ETFSummary[];
  comparing: string[];
  weights: Record<string, number>;
  loadingCodes: string[];
  addToCanvas: (etf: ETFSummary) => void;
  removeFromCanvas: (code: string) => void;
  toggleCompare: (code: string) => void;
  setWeight: (code: string, weight: number) => void;
  clearCanvas: () => void;
  synthesized: boolean;
  synthesize: () => void;
  performanceExpanded: boolean;
  togglePerformanceExpanded: () => void;
  addLoadingCode: (code: string) => void;
  removeLoadingCode: (code: string) => void;
  updateEtfData: (code: string, data: Partial<ETFSummary>) => void;
  replaceOnCanvas: (oldCode: string, newEtf: ETFSummary) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  selectedEtfCode: null,
  selectEtf: (code) => set({ selectedEtfCode: code }),

  selected: [],
  comparing: [],
  weights: {},
  loadingCodes: [],
  addToCanvas: (etf) => {
    const { selected, comparing, weights } = get();
    if (selected.length >= 20 || selected.some((s) => s.code === etf.code)) return;

    const newSelected = [...selected, etf];

    // 3개 미만이면 자동으로 comparing에 추가 + 비중 균등 재분배
    const newComparing = [...comparing, etf.code];
    const newWeights: Record<string, number> = {};
    const equal = Math.floor(100 / newComparing.length);
    newComparing.forEach((c, idx) => {
      newWeights[c] = idx === newComparing.length - 1 ? 100 - equal * (newComparing.length - 1) : equal;
    });
    set({ selected: newSelected, comparing: newComparing, weights: newWeights });
  },
  removeFromCanvas: (code) =>
    set((state) => {
      const newSelected = state.selected.filter((s) => s.code !== code);
      const newComparing = state.comparing.filter((c) => c !== code);

      // 남은 comparing ETF 비중 균등 재분배
      const newWeights: Record<string, number> = {};
      if (newComparing.length > 0) {
        const equal = Math.floor(100 / newComparing.length);
        newComparing.forEach((c, idx) => {
          newWeights[c] = idx === newComparing.length - 1 ? 100 - equal * (newComparing.length - 1) : equal;
        });
      }

      return { selected: newSelected, comparing: newComparing, weights: newWeights };
    }),
  toggleCompare: (code) => {
    const { comparing } = get();
    if (comparing.includes(code)) {
      const newComparing = comparing.filter((c) => c !== code);
      const newWeights: Record<string, number> = {};
      if (newComparing.length > 0) {
        const equal = Math.floor(100 / newComparing.length);
        newComparing.forEach((c, idx) => {
          newWeights[c] = idx === newComparing.length - 1 ? 100 - equal * (newComparing.length - 1) : equal;
        });
      }
      set({ comparing: newComparing, weights: newWeights });
    } else {
      // Default weight logic. If 1st element, 100%. If 2nd, 50% each. If 3rd, 33/33/34.
      // For simplicity, just set to 0 initially and let user adjust, or split evenly.
      const newComparing = [...comparing, code];
      const newWeights: Record<string, number> = {};
      const equalWeight = Math.floor(100 / newComparing.length);
      newComparing.forEach((c, idx) => {
        newWeights[c] = idx === newComparing.length - 1 ? 100 - equalWeight * (newComparing.length - 1) : equalWeight;
      });
      set({ comparing: newComparing, weights: newWeights });
    }
  },
  setWeight: (code, weight) => {
    set((state) => ({
      weights: { ...state.weights, [code]: weight },
    }));
  },
  clearCanvas: () => set({ selected: [], comparing: [], weights: {}, loadingCodes: [], synthesized: false, performanceExpanded: false }),
  synthesized: false,
  synthesize: () => set({ synthesized: true }),
  performanceExpanded: false,
  togglePerformanceExpanded: () => set((state) => ({ performanceExpanded: !state.performanceExpanded })),
  addLoadingCode: (code) =>
    set((state) => ({ loadingCodes: [...state.loadingCodes, code] })),
  removeLoadingCode: (code) =>
    set((state) => ({ loadingCodes: state.loadingCodes.filter((c) => c !== code) })),
  updateEtfData: (code, data) =>
    set((state) => ({
      selected: state.selected.map((s) => (s.code === code ? { ...s, ...data } : s)),
    })),
  replaceOnCanvas: (oldCode, newEtf) =>
    set((state) => {
      if (state.selected.some((s) => s.code === newEtf.code)) return state;
      return {
        selected: state.selected.map((s) => (s.code === oldCode ? newEtf : s)),
        comparing: state.comparing.map((c) => (c === oldCode ? newEtf.code : c)),
        weights: Object.fromEntries(
          Object.entries(state.weights).map(([k, v]) => [k === oldCode ? newEtf.code : k, v]),
        ),
      };
    }),
}));
