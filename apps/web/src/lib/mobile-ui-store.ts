import { create } from 'zustand';

type MobileTab = 'home' | 'gallery' | 'canvas' | 'community' | 'my';
type CanvasSegment = 'discover' | 'compose' | 'performance';

interface MobileUIState {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  canvasSegment: CanvasSegment;
  setCanvasSegment: (segment: CanvasSegment) => void;
  etfDetailCode: string | null;
  setEtfDetailCode: (code: string | null) => void;
  showSaveModal: boolean;
  setShowSaveModal: (v: boolean) => void;
  showFilterSheet: boolean;
  setShowFilterSheet: (v: boolean) => void;
  discoverSearch: string;
  setDiscoverSearch: (q: string) => void;
  discoverCategory: string;
  setDiscoverCategory: (c: string) => void;
  showFullscreenAd: boolean;
  setShowFullscreenAd: (v: boolean) => void;
}

export const useMobileUIStore = create<MobileUIState>()((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
  canvasSegment: 'discover',
  setCanvasSegment: (segment) => set({ canvasSegment: segment }),
  etfDetailCode: null,
  setEtfDetailCode: (code) => set({ etfDetailCode: code }),
  showSaveModal: false,
  setShowSaveModal: (v) => set({ showSaveModal: v }),
  showFilterSheet: false,
  setShowFilterSheet: (v) => set({ showFilterSheet: v }),
  discoverSearch: '',
  setDiscoverSearch: (q) => set({ discoverSearch: q }),
  discoverCategory: '',
  setDiscoverCategory: (c) => set({ discoverCategory: c }),
  showFullscreenAd: false,
  setShowFullscreenAd: (v) => set({ showFullscreenAd: v }),
}));
