import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type { ETFSummary } from '@etf-canvas/shared';

const DEFAULT_AMOUNT = 5_000_000; // 종목당 기본 500만원

/** amounts → weights 자동 계산 */
function deriveWeights(amounts: Record<string, number>, comparing: string[]): Record<string, number> {
  const total = comparing.reduce((s, c) => s + (amounts[c] || 0), 0);
  if (total === 0) return {};
  const result: Record<string, number> = {};
  comparing.forEach(c => {
    result[c] = Math.round((amounts[c] || 0) / total * 10000) / 100;
  });
  return result;
}

interface CanvasStore {
  // View
  currentView: 'canvas' | 'portfolio';
  setCurrentView: (view: 'canvas' | 'portfolio') => void;

  // ETF selection (left panel)
  selectedEtfCode: string | null;
  selectEtf: (code: string) => void;

  // Canvas (max 20 selected)
  selected: ETFSummary[];
  comparing: string[];
  weights: Record<string, number>;
  amounts: Record<string, number>;
  loadingCodes: string[];
  addToCanvas: (etf: ETFSummary) => void;
  removeFromCanvas: (code: string) => void;
  toggleCompare: (code: string) => void;
  setWeight: (code: string, weight: number) => void;
  setAmount: (code: string, amount: number) => void;
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
  amounts: {},
  loadingCodes: [],

  addToCanvas: (etf) => {
    const { selected, comparing } = get();
    if (selected.some((s) => s.code === etf.code)) {
      get().removeFromCanvas(etf.code);
      return;
    }
    if (selected.length >= 20) {
      toast('최대 20개까지 추가할 수 있어요', { icon: false });
      return;
    }

    const newSelected = [...selected, etf];
    const newComparing = [...comparing, etf.code];
    // 새 ETF에 기본 금액 부여, 기존 유지
    const newAmounts = { ...get().amounts, [etf.code]: DEFAULT_AMOUNT };
    const newWeights = deriveWeights(newAmounts, newComparing);
    set({ selected: newSelected, comparing: newComparing, amounts: newAmounts, weights: newWeights, synthesized: false });
  },

  removeFromCanvas: (code) =>
    set((state) => {
      const newSelected = state.selected.filter((s) => s.code !== code);
      const newComparing = state.comparing.filter((c) => c !== code);
      // 해당 ETF만 제거, 나머지 금액 유지
      const newAmounts = { ...state.amounts };
      delete newAmounts[code];
      const newWeights = deriveWeights(newAmounts, newComparing);
      return { selected: newSelected, comparing: newComparing, amounts: newAmounts, weights: newWeights, synthesized: false };
    }),

  toggleCompare: (code) => {
    const { comparing, amounts } = get();
    if (comparing.includes(code)) {
      // 제거: 나머지 금액 유지
      const newComparing = comparing.filter((c) => c !== code);
      const newAmounts = { ...amounts };
      delete newAmounts[code];
      const newWeights = deriveWeights(newAmounts, newComparing);
      set({ comparing: newComparing, amounts: newAmounts, weights: newWeights, synthesized: false });
    } else {
      // 추가: 새 ETF에 기본 금액, 기존 유지
      const newComparing = [...comparing, code];
      const newAmounts = { ...amounts, [code]: DEFAULT_AMOUNT };
      const newWeights = deriveWeights(newAmounts, newComparing);
      set({ comparing: newComparing, amounts: newAmounts, weights: newWeights, synthesized: false });
    }
  },

  setAmount: (code, amount) => {
    const { amounts, comparing } = get();
    const newAmounts = { ...amounts, [code]: Math.max(0, amount) };
    const newWeights = deriveWeights(newAmounts, comparing);
    set({ amounts: newAmounts, weights: newWeights, synthesized: false });
  },

  // 레거시: weights 직접 세팅 (저장된 포트폴리오 로드 등)
  setWeight: (code, weight) => {
    set((state) => ({
      weights: { ...state.weights, [code]: weight },
      synthesized: false,
    }));
  },

  clearCanvas: () => set({ selected: [], comparing: [], weights: {}, amounts: {}, loadingCodes: [], synthesized: false, performanceExpanded: false, portfolioName: '', feedbackHash: '', feedbackText: '', feedbackActions: [], feedbackLoading: false, browseCategory: null }),
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
      const newAmounts = Object.fromEntries(
        Object.entries(state.amounts).map(([k, v]) => [k === oldCode ? newEtf.code : k, v]),
      );
      const newComparing = state.comparing.map((c) => (c === oldCode ? newEtf.code : c));
      return {
        selected: state.selected.map((s) => (s.code === oldCode ? newEtf : s)),
        comparing: newComparing,
        amounts: newAmounts,
        weights: deriveWeights(newAmounts, newComparing),
      };
    }),
}), { name: 'etf-canvas-store' }));
