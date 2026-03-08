import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { ETFSummary } from '@etf-canvas/shared';

interface CanvasStore {
  // View
  currentView: 'canvas' | 'portfolio';
  setCurrentView: (view: 'canvas' | 'portfolio') => void;

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
  pendingSynthesize: boolean;
  setPendingSynthesize: (v: boolean) => void;
  portfolioName: string;
  setPortfolioName: (name: string) => void;
  performanceExpanded: boolean;
  togglePerformanceExpanded: () => void;
  addLoadingCode: (code: string) => void;
  removeLoadingCode: (code: string) => void;
  updateEtfData: (code: string, data: Partial<ETFSummary>) => void;
  replaceOnCanvas: (oldCode: string, newEtf: ETFSummary) => void;
  // Feedback
  feedbackEnabled: boolean;
  setFeedbackEnabled: (v: boolean) => void;
  feedbackHash: string;
  feedbackText: string;
  feedbackActions: { category: string; label: string }[];
  feedbackLoading: boolean;
  setFeedback: (hash: string, text: string, actions: { category: string; label: string }[]) => void;
  setFeedbackLoading: (v: boolean) => void;
  feedbackMinimized: boolean;
  setFeedbackMinimized: (v: boolean) => void;
  browseCategory: string | null;
  setBrowseCategory: (cat: string | null) => void;
}

export const useCanvasStore = create<CanvasStore>()(persist((set, get) => ({
  currentView: 'canvas',
  setCurrentView: (view) => set({ currentView: view }),

  selectedEtfCode: null,
  selectEtf: (code) => set({ selectedEtfCode: code }),

  selected: [],
  comparing: [],
  weights: {},
  loadingCodes: [],
  addToCanvas: (etf) => {
    const { selected, comparing, weights } = get();
    if (selected.some((s) => s.code === etf.code)) {
      get().removeFromCanvas(etf.code);
      return;
    }
    if (selected.length >= 20) {
      toast('최대 20개까지 추가할 수 있어요', { icon: false });
      return;
    }

    const newSelected = [...selected, etf];

    // 3개 미만이면 자동으로 comparing에 추가 + 비중 균등 재분배
    const newComparing = [...comparing, etf.code];
    const newWeights: Record<string, number> = {};
    const equal = Math.floor(100 / newComparing.length);
    newComparing.forEach((c, idx) => {
      newWeights[c] = idx === newComparing.length - 1 ? 100 - equal * (newComparing.length - 1) : equal;
    });
    set({ selected: newSelected, comparing: newComparing, weights: newWeights, synthesized: false });
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

      return { selected: newSelected, comparing: newComparing, weights: newWeights, synthesized: false };
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
      set({ comparing: newComparing, weights: newWeights, synthesized: false });
    } else {
      const newComparing = [...comparing, code];
      const newWeights: Record<string, number> = {};
      const equalWeight = Math.floor(100 / newComparing.length);
      newComparing.forEach((c, idx) => {
        newWeights[c] = idx === newComparing.length - 1 ? 100 - equalWeight * (newComparing.length - 1) : equalWeight;
      });
      set({ comparing: newComparing, weights: newWeights, synthesized: false });
    }
  },
  setWeight: (code, weight) => {
    set((state) => ({
      weights: { ...state.weights, [code]: weight },
      synthesized: false,
    }));
  },
  clearCanvas: () => set({ selected: [], comparing: [], weights: {}, loadingCodes: [], synthesized: false, performanceExpanded: false, portfolioName: '', feedbackHash: '', feedbackText: '', feedbackActions: [], feedbackLoading: false, browseCategory: null }),
  synthesized: false,
  synthesize: () => set({ synthesized: true, pendingSynthesize: false, feedbackMinimized: false }),
  pendingSynthesize: false,
  setPendingSynthesize: (v) => set({ pendingSynthesize: v }),
  portfolioName: '',
  setPortfolioName: (name) => set({ portfolioName: name }),
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
  feedbackEnabled: true,
  setFeedbackEnabled: (v) => set({ feedbackEnabled: v }),
  feedbackHash: '',
  feedbackText: '',
  feedbackActions: [],
  feedbackLoading: false,
  setFeedback: (hash, text, actions) => set({ feedbackHash: hash, feedbackText: text, feedbackActions: actions, feedbackLoading: false, feedbackMinimized: false }),
  setFeedbackLoading: (v) => set({ feedbackLoading: v, ...(v ? { feedbackMinimized: false } : {}) }),
  feedbackMinimized: false,
  setFeedbackMinimized: (v) => set({ feedbackMinimized: v }),
  browseCategory: null,
  setBrowseCategory: (cat) => set({ browseCategory: cat }),
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
}), { name: 'etf-canvas-store' }));
