# Mobile Responsive UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 PC 기능의 모바일 반응형 UI 레이어 추가 (신규 기능 없음, re-layout only)

**Architecture:** Tailwind `md:` breakpoint(768px) 기준 반응형 분기. `useIsMobile` 훅으로 런타임 감지하여 데스크톱/모바일 레이아웃 전환. 모바일은 5-탭 Bottom Navigation + 캔버스 탭 내 3-segment 구조. ETF 상세는 vaul(shadcn Drawer)로 Bottom Sheet 전환.

**Tech Stack:** Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + Zustand 5 + Recharts 3.8 + vaul (shadcn Drawer)

**Spec:** `docs/superpowers/specs/2026-03-12-mobile-responsive-ui-design.md`

---

## File Structure

### New Files (16)

| File | Responsibility |
|---|---|
| `src/lib/use-is-mobile.ts` | `useIsMobile` 훅 — `useSyncExternalStore` 기반 반응형 감지 |
| `src/lib/mobile-ui-store.ts` | `useMobileUIStore` — 모바일 탭/세그먼트 전환 상태 (Zustand, no persist) |
| `src/components/ui/drawer.tsx` | shadcn Drawer 컴포넌트 (vaul 래퍼, `pnpm dlx shadcn@latest add drawer`로 생성) |
| `src/components/mobile/bottom-nav.tsx` | 하단 5-탭 네비게이션 바 |
| `src/components/mobile/segmented-control.tsx` | iOS 스타일 세그먼트 컨트롤 (재사용 가능) |
| `src/components/mobile/home-tab.tsx` | 홈 탭 (광고 슬라이더 + TOP 프리뷰 + 인기글) |
| `src/components/mobile/ad-banner-slider.tsx` | 광고 배너 자동 롤링 슬라이더 |
| `src/components/mobile/canvas-tab.tsx` | 캔버스 탭 — 세그먼트 라우터 |
| `src/components/mobile/discover-segment.tsx` | 탐색 세그먼트 — ETF 검색/목록/추가 |
| `src/components/mobile/compose-segment.tsx` | 조합 세그먼트 — ETF 카드 리스트/합성/저장 |
| `src/components/mobile/performance-segment.tsx` | 실적 세그먼트 — 차트/지표 |
| `src/components/mobile/swipe-to-delete.tsx` | 스와이프 삭제 제스처 래퍼 |
| `src/components/mobile/floating-canvas-bar.tsx` | "캔버스에 N개 ETF 담김" 플로팅 바 |
| `src/components/mobile/etf-detail-sheet.tsx` | ETF 상세 Bottom Sheet (Drawer 래핑) |
| `src/components/mobile/gallery-tab.tsx` | 갤러리 탭 — 탭형 전환 |
| `src/components/mobile/my-tab.tsx` | 마이 탭 — 메뉴 리스트 |

### Modified Files (10)

| File | Change |
|---|---|
| `src/app/layout.tsx` | Footer에 `hidden md:block` |
| `src/app/globals.css` | 모바일 유틸리티 클래스 추가 |
| `src/components/app-shell.tsx` | `useIsMobile` 분기 — 모바일: BottomNav, 데스크톱: IconSidebar |
| `src/app/page.tsx` | 모바일 분기 — MobileHomeTab/MobileCanvasTab + FloatingFeedback 모바일 미렌더 |
| `src/components/etf-detail-modal.tsx` | `onAddToCanvas` optional prop 추가 + 모바일 Drawer 분기 |
| `src/components/gallery-view.tsx` | 모바일 탭 UI 추가 |
| `src/app/community/community-list.tsx` | 사이드바 `hidden md:block` + 모바일 상단 가로 스크롤 |
| `src/app/portfolio/[slug]/portfolio-public-view.tsx` | 모바일: Sidebar/AttributePanel 숨김 + 뒤로가기 헤더 |
| `src/components/settings-view.tsx` | 카드 grid 반응형 |
| `src/components/mypage-view.tsx` | 모바일 메뉴 리스트 형태 |

---

## Chunk 1: Foundation

### Task 1: Install vaul (shadcn Drawer) + 모바일 CSS 유틸리티

**Files:**
- Create: `src/components/ui/drawer.tsx` (shadcn CLI 자동 생성)
- Modify: `src/app/globals.css`
- Modify: `apps/web/package.json` + `pnpm-lock.yaml`

- [ ] **Step 1: shadcn Drawer 컴포넌트 추가**

```bash
cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas
pnpm dlx shadcn@latest add drawer --cwd apps/web
```

이 명령이 `vaul` 패키지를 자동 설치하고 `src/components/ui/drawer.tsx`를 생성한다.

- [ ] **Step 2: globals.css에 모바일 유틸리티 추가**

`apps/web/src/app/globals.css` 파일 끝에 추가:

```css
/* Mobile utilities */
.pb-safe-bottom {
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}

.scroll-x-hide {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scroll-x-hide::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas
pnpm turbo build --filter=web
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/drawer.tsx apps/web/src/app/globals.css apps/web/package.json pnpm-lock.yaml
git commit -m "feat: vaul (shadcn Drawer) 추가 + 모바일 CSS 유틸리티"
```

---

### Task 2: useIsMobile 훅

**Files:**
- Create: `apps/web/src/lib/use-is-mobile.ts`

- [ ] **Step 1: useIsMobile 훅 작성**

```typescript
// apps/web/src/lib/use-is-mobile.ts
'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;

function subscribe(cb: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 2: typecheck 확인**

```bash
cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas
pnpm --filter=web typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/use-is-mobile.ts
git commit -m "feat: useIsMobile 반응형 감지 훅 추가"
```

---

### Task 3: useMobileUIStore

**Files:**
- Create: `apps/web/src/lib/mobile-ui-store.ts`

- [ ] **Step 1: 모바일 UI 상태 스토어 작성**

```typescript
// apps/web/src/lib/mobile-ui-store.ts
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
}));
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter=web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/mobile-ui-store.ts
git commit -m "feat: useMobileUIStore 모바일 전용 상태 스토어 추가"
```

---

### Task 4: MobileBottomNav

**Files:**
- Create: `apps/web/src/components/mobile/bottom-nav.tsx`

- [ ] **Step 1: Bottom Navigation 컴포넌트 작성**

```tsx
// apps/web/src/components/mobile/bottom-nav.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Home, Trophy, Layers, MessageSquare, User } from 'lucide-react';
import { useMobileUIStore } from '@/lib/mobile-ui-store';

const tabs = [
  { id: 'home' as const, label: '홈', icon: Home, href: '/' },
  { id: 'gallery' as const, label: '갤러리', icon: Trophy, href: '/gallery' },
  { id: 'canvas' as const, label: '캔버스', icon: Layers, href: '/' },
  { id: 'community' as const, label: '커뮤니티', icon: MessageSquare, href: '/community' },
  { id: 'my' as const, label: '마이', icon: User, href: '/mypage' },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { activeTab, setActiveTab } = useMobileUIStore();

  const getIsActive = (tabId: typeof tabs[number]['id']) => {
    // 갤러리, 커뮤니티, 마이: URL 기반 판단
    if (tabId === 'gallery') return pathname.startsWith('/gallery');
    if (tabId === 'community') return pathname.startsWith('/community');
    if (tabId === 'my') return pathname === '/mypage' || pathname === '/settings' || pathname === '/portfolio';
    // 홈/캔버스: `/`에서 activeTab으로 판단
    if (pathname === '/') return activeTab === tabId;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl bg-background/80 md:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex h-14">
        {tabs.map((tab) => {
          const isActive = getIsActive(tab.id);
          const Icon = tab.icon;

          // 홈/캔버스 탭은 Link 대신 상태 전환
          if (tab.id === 'home' || tab.id === 'canvas') {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {tab.id === 'my' && session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className={`w-5 h-5 rounded-full object-cover ${isActive ? 'ring-2 ring-primary' : ''}`} />
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter=web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/mobile/bottom-nav.tsx
git commit -m "feat: MobileBottomNav 하단 네비게이션 컴포넌트"
```

---

### Task 5: SegmentedControl

**Files:**
- Create: `apps/web/src/components/mobile/segmented-control.tsx`

- [ ] **Step 1: 세그먼트 컨트롤 작성**

```tsx
// apps/web/src/components/mobile/segmented-control.tsx
'use client';

interface SegmentedControlProps<T extends string> {
  segments: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export function SegmentedControl<T extends string>({ segments, active, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex h-9 rounded-lg bg-muted p-1 gap-0.5">
      {segments.map((seg) => (
        <button
          key={seg.id}
          onClick={() => onChange(seg.id)}
          className={`flex-1 rounded-md text-xs font-medium transition-all ${
            active === seg.id
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/mobile/segmented-control.tsx
git commit -m "feat: SegmentedControl iOS 스타일 세그먼트 컨트롤"
```

---

### Task 6: Layout 리팩토링 (layout.tsx + app-shell.tsx)

**Files:**
- Modify: `apps/web/src/app/layout.tsx:49` — Footer 숨김
- Modify: `apps/web/src/components/app-shell.tsx` — 전체 리팩토링

- [ ] **Step 1: layout.tsx — Footer 모바일 숨김**

`apps/web/src/app/layout.tsx:49` 수정:

```tsx
// Before:
<Footer />

// After:
<div className="hidden md:block"><Footer /></div>
```

- [ ] **Step 2: app-shell.tsx — 반응형 분기**

`apps/web/src/components/app-shell.tsx` 전체 교체:

```tsx
'use client';

import { IconSidebar } from '@/components/icon-sidebar';
import { MobileBottomNav } from '@/components/mobile/bottom-nav';
import { useIsMobile } from '@/lib/use-is-mobile';

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col">
        <div className="flex-1 overflow-y-auto pb-safe-bottom">
          {children}
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-37px)] flex overflow-hidden">
      <IconSidebar />
      <div className="flex-1 flex min-w-0 bg-background">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
pnpm turbo build --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/src/components/app-shell.tsx
git commit -m "feat: 반응형 AppShell — 모바일 BottomNav / 데스크톱 IconSidebar 분기"
```

---

### Task 7: page.tsx 모바일 분기 (스켈레톤)

**Files:**
- Modify: `apps/web/src/app/page.tsx`

이 단계에서는 모바일 분기 구조만 잡고, 실제 MobileHomeTab/MobileCanvasTab은 다음 chunk에서 구현한다.

- [ ] **Step 1: page.tsx에 모바일 분기 추가**

`apps/web/src/app/page.tsx`를 다음과 같이 수정:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { IconSidebar } from '@/components/icon-sidebar';
import { LeftPanel } from '@/components/left-panel';
import { CanvasPanel, FloatingFeedback } from '@/components/canvas-panel';
import { AttributePanel } from '@/components/attribute-panel';
import { PerformancePanel } from '@/components/performance-panel';
import { MobileBottomNav } from '@/components/mobile/bottom-nav';
import { useCanvasStore } from '@/lib/store';
import { useIsMobile } from '@/lib/use-is-mobile';
import { useMobileUIStore } from '@/lib/mobile-ui-store';

function useIsAuthed() {
  const [authed, setAuthed] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: must check cookie only on client
  useEffect(() => { setAuthed(document.cookie.includes('etf-canvas-authed=1')); }, []);
  return authed;
}

export default function HomePage() {
  const { performanceExpanded, synthesized, feedbackEnabled, feedbackLoading, feedbackText, feedbackActions, setBrowseCategory } = useCanvasStore();
  const authed = useIsAuthed();
  const isMobile = useIsMobile();

  if (!authed) return <LandingPage />;

  if (isMobile) return <MobileHome />;

  return (
    <>
      <div className="h-[calc(100vh-37px)] flex overflow-hidden">
        <IconSidebar />
        <LeftPanel />
        <div className="flex-1 flex min-w-0 bg-background">
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {!(performanceExpanded && synthesized) && <CanvasPanel />}
            {synthesized && <PerformancePanel />}
          </div>
          <AttributePanel />
        </div>
      </div>
      {feedbackEnabled && synthesized && (feedbackLoading || feedbackText) && (
        <FloatingFeedback
          loading={feedbackLoading}
          text={feedbackText}
          actions={feedbackActions}
          onAction={setBrowseCategory}
        />
      )}
    </>
  );
}

function MobileHome() {
  const { activeTab } = useMobileUIStore();

  return (
    <div className="h-[100dvh] flex flex-col">
      <div className="flex-1 overflow-y-auto pb-safe-bottom">
        {activeTab === 'home' && (
          <div className="p-4 text-center text-muted-foreground">홈 탭 (구현 예정)</div>
        )}
        {activeTab === 'canvas' && (
          <div className="p-4 text-center text-muted-foreground">캔버스 탭 (구현 예정)</div>
        )}
      </div>
      <MobileBottomNav />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-4 md:px-6 py-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="ETF Canvas" width={28} height={28} />
          <span className="font-bold text-lg">ETF Canvas</span>
        </div>
        <a
          href="/gate"
          className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
        >
          시작하기
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">나만의 ETF 포트폴리오를 그리다</h1>
          <p className="text-muted-foreground text-sm md:text-base">ETF를 골라 담고, 비중을 조절하고, 성과를 시뮬레이션하세요</p>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
pnpm turbo build --filter=web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat: page.tsx 모바일 분기 구조 — MobileHome 스켈레톤"
```

---

## Chunk 2: Home Tab

### Task 8: AdBannerSlider

**Files:**
- Create: `apps/web/src/components/mobile/ad-banner-slider.tsx`

- [ ] **Step 1: 광고 배너 슬라이더 작성**

```tsx
// apps/web/src/components/mobile/ad-banner-slider.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const PLACEHOLDER_BANNERS = [
  { id: 1, gradient: 'from-blue-600 to-indigo-700', text: '나만의 ETF 포트폴리오' },
  { id: 2, gradient: 'from-emerald-600 to-teal-700', text: 'ETF로 시작하는 투자' },
  { id: 3, gradient: 'from-violet-600 to-purple-700', text: '수익률 시뮬레이션' },
];

export function AdBannerSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const scrollTo = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ left: index * scrollRef.current.clientWidth, behavior: 'smooth' });
  }, []);

  // 자동 롤링
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % PLACEHOLDER_BANNERS.length;
        scrollTo(next);
        return next;
      });
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [scrollTo]);

  // 수동 스와이프 감지
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== current) {
      setCurrent(index);
      // 수동 스와이프 시 타이머 리셋
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCurrent((prev) => {
          const next = (prev + 1) % PLACEHOLDER_BANNERS.length;
          scrollTo(next);
          return next;
        });
      }, 3000);
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory scroll-x-hide"
      >
        {PLACEHOLDER_BANNERS.map((banner) => (
          <div
            key={banner.id}
            className={`w-full shrink-0 snap-center aspect-[2.5/1] rounded-xl bg-gradient-to-br ${banner.gradient} flex items-center justify-center`}
          >
            <span className="text-white font-bold text-lg">{banner.text}</span>
          </div>
        ))}
      </div>
      {/* Dot indicator */}
      <div className="flex justify-center gap-1.5 mt-2">
        {PLACEHOLDER_BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => { scrollTo(i); setCurrent(i); }}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === current ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/mobile/ad-banner-slider.tsx
git commit -m "feat: AdBannerSlider 광고 배너 슬라이더 (플레이스홀더)"
```

---

### Task 9: MobileHomeTab

**Files:**
- Create: `apps/web/src/components/mobile/home-tab.tsx`

- [ ] **Step 1: 홈 탭 작성**

```tsx
// apps/web/src/components/mobile/home-tab.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { useReturnColors } from '@/lib/return-colors';
import { AdBannerSlider } from '@/components/mobile/ad-banner-slider';

export function MobileHomeTab() {
  const setActiveTab = useMobileUIStore((s) => s.setActiveTab);

  const { data: topPortfolios } = useQuery({
    queryKey: ['gallery-top', 'return'],
    queryFn: () => api.getTopPortfolios(5, 'return'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: weeklyBest } = useQuery({
    queryKey: ['community-weekly-best'],
    queryFn: () => api.communityWeeklyBest(5),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="px-4 py-4 space-y-6">
      {/* 광고 배너 */}
      <AdBannerSlider />

      {/* TOP 포트폴리오 프리뷰 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">TOP 포트폴리오</h2>
          <button
            onClick={() => setActiveTab('gallery')}
            className="flex items-center text-xs text-muted-foreground"
          >
            더보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 scroll-x-hide -mx-4 px-4">
          {topPortfolios?.map((p, i) => (
            <TopPortfolioCard key={p.slug} portfolio={p} rank={i + 1} />
          ))}
          {!topPortfolios && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-36 h-24 shrink-0 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>

      {/* 인기 게시글 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">인기 게시글</h2>
          <button
            onClick={() => setActiveTab('community')}
            className="flex items-center text-xs text-muted-foreground"
          >
            더보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {weeklyBest?.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{post.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  {post.category && (
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{post.category.name}</span>
                  )}
                  <span>❤ {post.likeCount}</span>
                  <span>💬 {post.commentCount}</span>
                </div>
              </div>
            </Link>
          ))}
          {!weeklyBest && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    </div>
  );
}

function TopPortfolioCard({ portfolio, rank }: { portfolio: { name: string; slug: string; returnRate: number | null; items: { code: string; name: string; weight: number }[] }; rank: number }) {
  const rc = useReturnColors();
  const returnRate = portfolio.returnRate;

  return (
    <Link
      href={`/portfolio/${portfolio.slug}`}
      className="w-36 shrink-0 rounded-xl border bg-card p-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-1 mb-2">
        <span className="text-xs font-bold text-primary">#{rank}</span>
      </div>
      <p className="text-xs font-medium truncate mb-1">{portfolio.name}</p>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${returnRate != null ? rc.cls(returnRate >= 0) : ''}`}>
          {returnRate != null ? `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(1)}%` : '-'}
        </span>
        <span className="text-[10px] text-muted-foreground">ETF {portfolio.items.length}개</span>
      </div>
    </Link>
  );
}
```

`useReturnColors`는 `@/lib/return-colors`에서 export된다. 반환 API: `{ upClass, downClass, cls(positive), hex(positive), ... }`. `.up`/`.down` 필드는 없으므로 `rc.cls(value >= 0)` 패턴 사용.

- [ ] **Step 2: typecheck**

```bash
pnpm --filter=web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/mobile/home-tab.tsx
git commit -m "feat: MobileHomeTab — TOP 포트폴리오 + 인기글 프리뷰"
```

---

### Task 10: page.tsx — MobileHome에 HomeTab 연결

**Files:**
- Modify: `apps/web/src/app/page.tsx` — `MobileHome` 함수 내부

- [ ] **Step 1: MobileHome 스켈레톤을 실제 컴포넌트로 교체**

`page.tsx`의 `MobileHome` 함수에서:

```tsx
// Before (스켈레톤):
{activeTab === 'home' && (
  <div className="p-4 text-center text-muted-foreground">홈 탭 (구현 예정)</div>
)}

// After:
{activeTab === 'home' && <MobileHomeTab />}
```

import 추가: `import { MobileHomeTab } from '@/components/mobile/home-tab';`

- [ ] **Step 2: 빌드 확인**

```bash
pnpm turbo build --filter=web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat: 홈 탭 연결 — MobileHomeTab 렌더링"
```

---

## Chunk 3: Canvas Tab — Discover

### Task 11: FloatingCanvasBar

**Files:**
- Create: `apps/web/src/components/mobile/floating-canvas-bar.tsx`

- [ ] **Step 1: 플로팅 캔버스 바 작성**

```tsx
// apps/web/src/components/mobile/floating-canvas-bar.tsx
'use client';

import { Layers } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { useMobileUIStore } from '@/lib/mobile-ui-store';

export function FloatingCanvasBar() {
  const selected = useCanvasStore((s) => s.selected);
  const setCanvasSegment = useMobileUIStore((s) => s.setCanvasSegment);

  if (selected.length === 0) return null;

  return (
    <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom)+16px)] mx-4 z-40">
      <button
        onClick={() => setCanvasSegment('compose')}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-primary text-primary-foreground shadow-lg"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span className="text-sm font-medium">캔버스에 {selected.length}개 ETF 담김</span>
        </div>
        <span className="text-sm font-bold">조합하기 →</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/mobile/floating-canvas-bar.tsx
git commit -m "feat: FloatingCanvasBar — 캔버스 ETF 수 + 조합하기 바"
```

---

### Task 12: MobileDiscoverSegment

**Files:**
- Create: `apps/web/src/components/mobile/discover-segment.tsx`

이 컴포넌트는 기존 `LeftPanel`의 카테고리/검색/ETF 목록 로직을 모바일용으로 재구성한다.
기존 `LeftPanel`의 API 호출 패턴(`useInfiniteQuery`, 카테고리, 검색)을 동일하게 사용.

- [ ] **Step 1: 탐색 세그먼트 작성**

```tsx
// apps/web/src/components/mobile/discover-segment.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, X, Plus, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';
import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { FloatingCanvasBar } from '@/components/mobile/floating-canvas-bar';
import type { ETFSummary } from '@etf-canvas/shared';

// ETFCategory 실제 값 (packages/shared/src/index.ts 참조)
const CATEGORIES = [
  { id: '국내 대표지수', label: '국내대표', color: 'bg-blue-500' },
  { id: '해외 대표지수', label: '해외', color: 'bg-red-500' },
  { id: '섹터/테마', label: '섹터', color: 'bg-amber-500' },
  { id: '채권', label: '채권', color: 'bg-emerald-500' },
  { id: '원자재', label: '원자재', color: 'bg-orange-500' },
  { id: '레버리지/인버스', label: '레버리지', color: 'bg-pink-500' },
  { id: '혼합', label: '혼합', color: 'bg-violet-500' },
  { id: '액티브', label: '액티브', color: 'bg-cyan-500' },
  { id: 'New', label: 'New', color: 'bg-lime-500' },
];

const PAGE_SIZE = 30;

export function MobileDiscoverSegment() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const { selected, addToCanvas } = useCanvasStore();
  const setEtfDetailCode = useMobileUIStore((s) => s.setEtfDetailCode);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value) setCategory(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  // api.list / api.search — offset 기반 페이지네이션
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['etf-browse', category, debouncedSearch],
    queryFn: ({ pageParam = 0 }) =>
      debouncedSearch
        ? api.search(debouncedSearch, category || undefined, undefined, pageParam, PAGE_SIZE)
        : api.list(category || undefined, undefined, pageParam, PAGE_SIZE),
    getNextPageParam: (last, allPages) => (last.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined),
    initialPageParam: 0,
  });

  const etfs = data?.pages.flat() ?? [];
  const selectedCodes = new Set(selected.map((s) => s.code));

  // IntersectionObserver 기반 무한 스크롤 — useEffect + ref 패턴
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNextPage(); },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col h-full">
      {/* 검색 */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ETF 검색"
            className="w-full h-10 pl-9 pr-9 rounded-lg bg-muted text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 칩 */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 scroll-x-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(category === cat.id ? null : cat.id); setSearch(''); setDebouncedSearch(''); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ETF 리스트 */}
      <div className="flex-1 overflow-y-auto">
        {etfs.map((etf) => (
          <EtfListRow
            key={etf.code}
            etf={etf}
            isAdded={selectedCodes.has(etf.code)}
            onAdd={() => addToCanvas(etf)}
            onDetail={() => setEtfDetailCode(etf.code)}
          />
        ))}
        {hasNextPage && <div ref={sentinelRef} className="h-10" />}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <FloatingCanvasBar />
    </div>
  );
}

function EtfListRow({ etf, isAdded, onAdd, onDetail }: {
  etf: ETFSummary; isAdded: boolean; onAdd: () => void; onDetail: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
      <button onClick={onDetail} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium truncate">{etf.name}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{etf.categories[0] || '-'}</span>
          {etf.aum && <span>AUM {(etf.aum / 100000000).toFixed(1)}억</span>}
        </div>
      </button>
      <div className="text-right mr-2">
        {etf.oneYearEarnRate != null && (
          <span className={`text-sm font-medium ${etf.oneYearEarnRate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {etf.oneYearEarnRate >= 0 ? '+' : ''}{etf.oneYearEarnRate.toFixed(1)}%
          </span>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isAdded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
        }`}
      >
        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    </div>
  );
}
```

API 참조: `api.list(category?, sort?, offset, limit)` / `api.search(q, category?, sort?, offset, limit)`. ETFSummary 필드: `categories: string[]`, `oneYearEarnRate: number | null`. 기존 `LeftPanel`의 API 호출 패턴 참조.

- [ ] **Step 2: typecheck + 빌드**

```bash
pnpm --filter=web typecheck && pnpm turbo build --filter=web
```

타입 에러 시 `api.browseETFs`의 실제 파라미터에 맞게 수정.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/mobile/discover-segment.tsx
git commit -m "feat: MobileDiscoverSegment — ETF 검색/카테고리/목록 + 캔버스 추가"
```

---

### Task 13: MobileCanvasTab + 연결

**Files:**
- Create: `apps/web/src/components/mobile/canvas-tab.tsx`
- Modify: `apps/web/src/app/page.tsx` — MobileHome에 캔버스 탭 연결

- [ ] **Step 1: 캔버스 탭 (세그먼트 라우터) 작성**

```tsx
// apps/web/src/components/mobile/canvas-tab.tsx
'use client';

import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { SegmentedControl } from '@/components/mobile/segmented-control';
import { MobileDiscoverSegment } from '@/components/mobile/discover-segment';

const SEGMENTS = [
  { id: 'discover' as const, label: '탐색' },
  { id: 'compose' as const, label: '조합' },
  { id: 'performance' as const, label: '실적' },
];

export function MobileCanvasTab() {
  const { canvasSegment, setCanvasSegment } = useMobileUIStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <SegmentedControl segments={SEGMENTS} active={canvasSegment} onChange={setCanvasSegment} />
      </div>

      <div className="flex-1 min-h-0">
        {canvasSegment === 'discover' && <MobileDiscoverSegment />}
        {canvasSegment === 'compose' && (
          <div className="p-4 text-center text-muted-foreground">조합 세그먼트 (구현 예정)</div>
        )}
        {canvasSegment === 'performance' && (
          <div className="p-4 text-center text-muted-foreground">실적 세그먼트 (구현 예정)</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: page.tsx에 캔버스 탭 연결**

`page.tsx`의 `MobileHome` 함수에서:

```tsx
// Before:
{activeTab === 'canvas' && (
  <div className="p-4 text-center text-muted-foreground">캔버스 탭 (구현 예정)</div>
)}

// After:
{activeTab === 'canvas' && <MobileCanvasTab />}
```

import 추가: `import { MobileCanvasTab } from '@/components/mobile/canvas-tab';`

- [ ] **Step 3: 빌드 확인**

```bash
pnpm turbo build --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/mobile/canvas-tab.tsx apps/web/src/app/page.tsx
git commit -m "feat: MobileCanvasTab — 탐색/조합/실적 세그먼트 라우터"
```

---

## Chunk 4: Canvas Tab — Compose & Performance

### Task 14: SwipeToDelete

**Files:**
- Create: `apps/web/src/components/mobile/swipe-to-delete.tsx`

- [ ] **Step 1: 스와이프 삭제 래퍼 작성**

```tsx
// apps/web/src/components/mobile/swipe-to-delete.tsx
'use client';

import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
}

const DELETE_THRESHOLD = 80;

export function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = startXRef.current - e.touches[0].clientX;
    currentXRef.current = diff;
    // 왼쪽으로만 스와이프 허용
    if (diff > 0) {
      setOffsetX(Math.min(diff, DELETE_THRESHOLD + 20));
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (currentXRef.current > DELETE_THRESHOLD) {
      setOffsetX(DELETE_THRESHOLD);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* 삭제 버튼 배경 */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={onDelete}
          className="w-20 h-full bg-destructive flex items-center justify-center text-destructive-foreground"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* 슬라이딩 콘텐츠 */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-background transition-transform"
        style={{
          transform: `translateX(-${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/mobile/swipe-to-delete.tsx
git commit -m "feat: SwipeToDelete 스와이프 삭제 제스처 래퍼"
```

---

### Task 15: MobileComposeSegment

**Files:**
- Create: `apps/web/src/components/mobile/compose-segment.tsx`

- [ ] **Step 1: 조합 세그먼트 작성**

```tsx
// apps/web/src/components/mobile/compose-segment.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { useMobileUIStore } from '@/lib/mobile-ui-store';
import { SwipeToDelete } from '@/components/mobile/swipe-to-delete';
import { LoginModal } from '@/components/login-modal';
import { SavePortfolioModal } from '@/components/save-portfolio-modal';
import { api } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ETFCategory 실제 값 기준 (packages/shared/src/index.ts)
const CATEGORY_COLORS: Record<string, string> = {
  '국내 대표지수': 'bg-blue-500',
  '해외 대표지수': 'bg-red-500',
  '섹터/테마': 'bg-amber-500',
  '채권': 'bg-emerald-500',
  '원자재': 'bg-orange-500',
  '레버리지/인버스': 'bg-pink-500',
  '혼합': 'bg-violet-500',
  '액티브': 'bg-cyan-500',
  'New': 'bg-lime-500',
};

export function MobileComposeSegment() {
  const { data: session } = useSession();
  const { selected, comparing, amounts, weights, synthesized, removeFromCanvas, setAmount, clearCanvas, synthesize, setFeedbackLoading, setFeedback, pendingSynthesize, setPendingSynthesize } = useCanvasStore();
  const { setCanvasSegment, showSaveModal, setShowSaveModal } = useMobileUIStore();
  const [showLogin, setShowLogin] = useState(false);

  const totalAmount = comparing.reduce((sum, code) => sum + (amounts[code] || 0), 0);

  const handleSynthesize = async () => {
    if (!session?.user) {
      setPendingSynthesize(true);
      setShowLogin(true);
      return;
    }
    synthesize();
    setCanvasSegment('performance');

    // AI feedback — api.getPortfolioFeedback(items) (totalAmount 인자 없음, category 필수)
    setFeedbackLoading(true);
    let fbResult: { feedback: string; actions: { category: string; label: string }[]; tags: string[]; snippet: string } | null = null;
    try {
      const items = comparing.map((code) => {
        const etf = selected.find((s) => s.code === code);
        return { code, name: etf?.name || code, weight: weights[code] || 0, category: etf?.categories[0] || '' };
      });
      fbResult = await api.getPortfolioFeedback(items);
      const hash = JSON.stringify(items);
      setFeedback(hash, fbResult.feedback, fbResult.actions || []);
    } catch {
      setFeedbackLoading(false);
    }

    // auto-save — api.autoSavePortfolio(items, feedback, totalAmount?)
    try {
      const items = comparing.map((code) => {
        const etf = selected.find((s) => s.code === code);
        return { code, name: etf?.name || code, weight: weights[code] || 0, category: etf?.categories[0] };
      });
      await api.autoSavePortfolio(items, fbResult, totalAmount);
    } catch { /* ignore */ }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만`;
    return amount.toLocaleString();
  };

  if (selected.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <p className="text-sm">탐색 탭에서 ETF를 추가해주세요</p>
        <button
          onClick={() => setCanvasSegment('discover')}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          ETF 탐색하기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더: 총 투자금 + 초기화 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <span className="text-xs text-muted-foreground">총 투자금</span>
          <p className="text-lg font-bold">{formatAmount(totalAmount)}원</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted">
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>캔버스 초기화</AlertDialogTitle>
              <AlertDialogDescription>모든 ETF가 제거됩니다. 계속하시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={clearCanvas}>초기화</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ETF 카드 리스트 */}
      <div className="flex-1 overflow-y-auto">
        {selected.filter((etf) => comparing.includes(etf.code)).map((etf) => (
          <SwipeToDelete key={etf.code} onDelete={() => removeFromCanvas(etf.code)}>
            <div className="flex items-start gap-3 px-4 py-3 border-b border-border/50">
              <div className={`w-1 h-full min-h-[48px] rounded-full shrink-0 ${CATEGORY_COLORS[etf.categories[0]] || 'bg-muted'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{etf.name}</p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {(weights[etf.code] || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => setAmount(etf.code, Math.max(0, (amounts[etf.code] || 0) - 1000000))}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    value={formatAmount(amounts[etf.code] || 0)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setAmount(etf.code, Number(raw));
                    }}
                    className="flex-1 h-8 rounded-lg bg-muted text-center text-sm font-medium outline-none"
                  />
                  <button
                    onClick={() => setAmount(etf.code, (amounts[etf.code] || 0) + 1000000)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </SwipeToDelete>
        ))}
      </div>

      {/* CTA 버튼 */}
      <div className="px-4 py-3 space-y-2 border-t">
        <button
          onClick={handleSynthesize}
          disabled={totalAmount === 0}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          합성하기
        </button>
        {synthesized && session?.user && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="w-full h-10 rounded-xl border text-sm font-medium"
          >
            저장하기
          </button>
        )}
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showSaveModal && <SavePortfolioModal onClose={() => setShowSaveModal(false)} />}
    </div>
  );
}
```

API 시그니처는 계획 하단의 "API Reference" 섹션 참조. `getPortfolioFeedback`은 인자 1개 (items with category 필수), 반환 `.feedback` 필드. `autoSavePortfolio`는 `(items, feedback, totalAmount?)` 순서.

- [ ] **Step 2: typecheck + 빌드**

```bash
pnpm --filter=web typecheck && pnpm turbo build --filter=web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/mobile/compose-segment.tsx
git commit -m "feat: MobileComposeSegment — ETF 카드 + 투자금 + 합성/저장"
```

---

### Task 16: MobilePerformanceSegment

**Files:**
- Create: `apps/web/src/components/mobile/performance-segment.tsx`

이 컴포넌트는 기존 `PerformancePanel` 내부의 차트/지표를 세로 스크롤로 재배치한다.
기존 `PerformancePanel`의 내부 컴포넌트들 (`MetricCard`, `CategoryPie`, `DividendChart` 등)을 재사용하기 위해, 이들을 직접 import할 수 없으므로 (unexported), PerformancePanel 로직을 참조하여 동일한 API 호출 + Recharts 차트를 모바일 레이아웃으로 렌더링한다.

**핵심 접근**: `PerformancePanel`에서 내부 sub-component들을 별도 파일로 추출하여 공유하는 리팩토링이 이상적이지만, 최소 침습 원칙에 따라 모바일 세그먼트에서 동일한 simulate API 호출을 수행하고 간소화된 차트를 렌더링한다.

- [ ] **Step 1: 실적 세그먼트 작성**

```tsx
// apps/web/src/components/mobile/performance-segment.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCanvasStore } from '@/lib/store';
import { api } from '@/lib/api';
import { FeedbackSection } from '@/components/feedback-section';
import type { SimulateRequest } from '@etf-canvas/shared';

const PERIODS = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y'] as const;
type Period = typeof PERIODS[number];

export function MobilePerformanceSegment() {
  const { comparing, weights, amounts, synthesized, feedbackText, feedbackActions } = useCanvasStore();
  const [period, setPeriod] = useState<Period>('1Y');

  const totalAmount = comparing.reduce((sum, code) => sum + (amounts[code] || 0), 0);

  // SimulateRequest: { codes: string[], weights: number[], amount: number, period: string }
  const simulateReq: SimulateRequest | null = synthesized && comparing.length > 0
    ? { codes: comparing, weights: comparing.map((c) => weights[c] || 0), amount: totalAmount, period: period.toLowerCase() }
    : null;

  const { data: simResult, isPending } = useQuery({
    queryKey: ['etf-simulate', simulateReq],
    queryFn: () => api.simulate(simulateReq!),
    enabled: !!simulateReq,
    placeholderData: (prev) => prev,
  });

  if (!synthesized) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">합성 후 실적을 확인할 수 있습니다</p>
      </div>
    );
  }

  const chartData = simResult?.dailyValues?.map((v) => ({
    date: v.date,
    value: ((v.value - 1) * 100),
  })) ?? [];

  // SimulateResult already provides computed metrics
  const totalReturn = (simResult?.totalReturn ?? 0) * 100;
  const cagr = (simResult?.annualizedReturn ?? 0) * 100;
  const mdd = simResult?.maxDrawdown ?? 0;
  const volatility = (simResult?.volatility ?? 0) * 100;

  return (
    <div className="overflow-y-auto h-full px-4 py-3 space-y-4">
      {/* 기간 선택 */}
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* 4 MetricCards — 2×2 */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="수익률" value={totalReturn} suffix="%" />
        <MetricCard label="연환산" value={cagr} suffix="%" />
        <MetricCard label="MDD" value={mdd * 100} suffix="%" negative />
        <MetricCard label="변동성" value={volatility} suffix="%" neutral />
      </div>

      {/* 성장 추이 차트 */}
      {chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="mobileGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="date" tick={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 10 }} width={40} axisLine={false} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, '수익률']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#mobileGrowthGrad)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {isPending && chartData.length === 0 && (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      )}

      {/* 포트폴리오 분석 (FloatingFeedback 대체) */}
      {feedbackText && (
        <FeedbackSection feedbackText={feedbackText} feedbackActions={feedbackActions} />
      )}
    </div>
  );
}

function MetricCard({ label, value, suffix, negative, neutral }: {
  label: string; value: number; suffix: string; negative?: boolean; neutral?: boolean;
}) {
  const colorClass = neutral
    ? 'text-foreground'
    : negative
      ? 'text-blue-500'
      : value >= 0 ? 'text-red-500' : 'text-blue-500';

  return (
    <div className="rounded-xl border bg-card p-3 min-w-0">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-bold ${colorClass}`}>
        {!negative && value >= 0 ? '+' : ''}{value.toFixed(1)}{suffix}
      </p>
    </div>
  );
}
```

API 시그니처: `api.simulate({ codes, weights, amount, period })`. `SimulateResult`에는 `totalReturn`, `annualizedReturn`, `maxDrawdown`, `volatility`, `sharpeRatio`, `dailyValues`, `perEtf` 필드가 있다. 하단 "API Reference" 참조.

- [ ] **Step 2: typecheck + 빌드**

```bash
pnpm --filter=web typecheck && pnpm turbo build --filter=web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/mobile/performance-segment.tsx
git commit -m "feat: MobilePerformanceSegment — 차트/지표 + 인라인 피드백"
```

---

### Task 17: canvas-tab.tsx에 조합/실적 세그먼트 연결

**Files:**
- Modify: `apps/web/src/components/mobile/canvas-tab.tsx`

- [ ] **Step 1: 스켈레톤을 실제 컴포넌트로 교체**

```tsx
// canvas-tab.tsx 수정
import { MobileComposeSegment } from '@/components/mobile/compose-segment';
import { MobilePerformanceSegment } from '@/components/mobile/performance-segment';

// 기존 스켈레톤 교체:
{canvasSegment === 'compose' && <MobileComposeSegment />}
{canvasSegment === 'performance' && <MobilePerformanceSegment />}
```

- [ ] **Step 2: 빌드 확인**

```bash
pnpm turbo build --filter=web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/mobile/canvas-tab.tsx
git commit -m "feat: 캔버스 탭 — 조합/실적 세그먼트 연결"
```

---

## Chunk 5: ETF Detail Sheet + Gallery Tab

### Task 18: EtfDetailSheet (Bottom Sheet)

**Files:**
- Create: `apps/web/src/components/mobile/etf-detail-sheet.tsx`
- Modify: `apps/web/src/components/etf-detail-modal.tsx` — `onAddToCanvas` prop 추가

- [ ] **Step 1: etf-detail-modal.tsx에 onAddToCanvas prop 추가**

`apps/web/src/components/etf-detail-modal.tsx`의 props 인터페이스와 컴포넌트에 추가:

```tsx
// 기존:
export function EtfDetailModal({ etf, onClose }: { etf: ETFSummary; onClose: () => void }) {

// 변경:
export function EtfDetailModal({ etf, onClose, onAddToCanvas }: {
  etf: ETFSummary;
  onClose: () => void;
  onAddToCanvas?: (etf: ETFSummary) => void;
}) {
```

모달 하단 (닫기 전) 에 CTA 버튼 추가:

```tsx
{/* Holdings 섹션 끝 뒤에 추가 */}
{onAddToCanvas && (
  <div className="sticky bottom-0 p-4 border-t bg-background/95 backdrop-blur">
    <button
      onClick={() => { onAddToCanvas(etf); onClose(); }}
      className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
    >
      캔버스에 추가하기
    </button>
  </div>
)}
```

- [ ] **Step 2: EtfDetailSheet 작성**

```tsx
// apps/web/src/components/mobile/etf-detail-sheet.tsx
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

  // ETF 데이터: 이미 canvas에 있으면 그것 사용, 아니면 API 조회
  const existingEtf = selected.find((s) => s.code === etfDetailCode);

  const { data: fetchedEtf } = useQuery({
    queryKey: ['etf-detail-summary', etfDetailCode],
    queryFn: () => api.getETFDetail(etfDetailCode!),
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
              onAddToCanvas={addToCanvas}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
```

**필수**: `EtfDetailModal`은 `fixed inset-0 z-50 backdrop-blur-sm` overlay를 자체 포함한다. Drawer 내부에서 사용 시 overlay가 중복되므로, **`mode?: 'modal' | 'inline'` prop을 추가**하여:
- `mode='modal'` (기본값): 기존 fixed overlay + 콘텐츠 (데스크톱)
- `mode='inline'`: overlay 없이 콘텐츠만 렌더 (모바일 Drawer 내부)

`EtfDetailSheet`에서는 `<EtfDetailModal mode="inline" .../>` 으로 호출한다.

- [ ] **Step 3: MobileHome에 EtfDetailSheet 추가**

`apps/web/src/app/page.tsx`의 `MobileHome` 함수에:

```tsx
import { EtfDetailSheet } from '@/components/mobile/etf-detail-sheet';

// MobileHome return문에 추가:
<EtfDetailSheet />
```

- [ ] **Step 4: typecheck + 빌드**

```bash
pnpm --filter=web typecheck && pnpm turbo build --filter=web
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/mobile/etf-detail-sheet.tsx apps/web/src/components/etf-detail-modal.tsx apps/web/src/app/page.tsx
git commit -m "feat: EtfDetailSheet Bottom Sheet + onAddToCanvas prop"
```

---

### Task 19: MobileGalleryTab

**Files:**
- Create: `apps/web/src/components/mobile/gallery-tab.tsx`

- [ ] **Step 1: 갤러리 탭 작성**

```tsx
// apps/web/src/components/mobile/gallery-tab.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Trophy, Shield, Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { useReturnColors } from '@/lib/return-colors';

const GALLERY_TABS = [
  { id: 'return' as const, label: '수익률 TOP', icon: Trophy },
  { id: 'mdd' as const, label: '안정성 TOP', icon: Shield },
  { id: 'dividend' as const, label: '분배금 TOP', icon: Coins },
] as const;

type GallerySort = typeof GALLERY_TABS[number]['id'];

export function MobileGalleryTab() {
  const [activeSort, setActiveSort] = useState<GallerySort>('return');
  const rc = useReturnColors();

  const { data: portfolios, isPending } = useQuery({
    queryKey: ['gallery-top', activeSort],
    queryFn: () => api.getTopPortfolios(10, activeSort),
    staleTime: 5 * 60 * 1000,
  });

  // useReturnColors: { upClass, downClass, cls(positive), ... }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold mb-3">TOP 포트폴리오</h1>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {GALLERY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSort(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-medium transition-all ${
                activeSort === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {isPending && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse mb-2" />
        ))}
        {portfolios?.map((p, i) => (
          <Link
            key={p.slug}
            href={`/portfolio/${p.slug}`}
            className="flex items-center gap-3 py-3 border-b border-border/50"
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <span className="text-xs text-muted-foreground">ETF {p.items.length}개</span>
            </div>
            <div className="text-right">
              {p.returnRate != null && (
                <span className={`text-sm font-bold ${rc.cls(p.returnRate >= 0)}`}>
                  {p.returnRate >= 0 ? '+' : ''}{p.returnRate.toFixed(1)}%
                </span>
              )}
              {activeSort === 'mdd' && p.mdd != null && (
                <p className="text-xs text-muted-foreground">MDD {(p.mdd * 100).toFixed(1)}%</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/mobile/gallery-tab.tsx
git commit -m "feat: MobileGalleryTab — TOP 포트폴리오 탭형 전환"
```

---

## Chunk 6: My Tab + Existing Component Modifications

### Task 20: MobileMyTab

**Files:**
- Create: `apps/web/src/components/mobile/my-tab.tsx`

- [ ] **Step 1: 마이 탭 작성**

```tsx
// apps/web/src/components/mobile/my-tab.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FolderOpen, Settings, UserCog, Eye, ChevronRight, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { LoginModal } from '@/components/login-modal';
import { useState } from 'react';

export function MobileMyTab() {
  const { data: session } = useSession();
  const [showLogin, setShowLogin] = useState(false);

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-sm text-muted-foreground">로그인하고 시작하세요</p>
        <button
          onClick={() => setShowLogin(true)}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
        >
          로그인
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </div>
    );
  }

  return <AuthedMyTab session={session} />;
}

function AuthedMyTab({ session }: { session: NonNullable<ReturnType<typeof useSession>['data']> }) {
  const { data: portfolios } = useQuery({
    queryKey: ['portfolios', 'latest'],
    queryFn: () => api.listPortfolios('latest'),
  });

  const portfolioCount = portfolios?.length ?? 0;

  const menuItems = [
    { icon: FolderOpen, label: '내 포트폴리오', href: '/portfolio', badge: portfolioCount > 0 ? `${portfolioCount}` : undefined },
    { icon: Settings, label: '설정', href: '/settings' },
    { icon: UserCog, label: '프로필 수정', href: '/mypage' },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* 프로필 카드 */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-4">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-bold">
              {session.user.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <p className="font-bold">{session.user.name || '사용자'}</p>
            <p className="text-xs text-muted-foreground">{session.user.email}</p>
          </div>
        </div>
      </div>

      {/* 메뉴 리스트 */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {menuItems.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-4 py-3.5 ${i < menuItems.length - 1 ? 'border-b' : ''}`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/mobile/my-tab.tsx
git commit -m "feat: MobileMyTab — 프로필 카드 + 메뉴 리스트"
```

---

### Task 21: 기존 페이지 모바일 적용 — gallery, community, portfolio pages

**Files:**
- Modify: `apps/web/src/app/gallery/page.tsx`
- Modify: `apps/web/src/app/community/community-list.tsx`
- Modify: `apps/web/src/app/portfolio/[slug]/portfolio-public-view.tsx`

- [ ] **Step 1: gallery/page.tsx — 모바일 분기**

갤러리 페이지는 AppShell로 감싸져 있으므로, 모바일에서는 AppShell의 BottomNav가 자동으로 표시된다. `GalleryView` 자체의 모바일 최적화는 기존 `grid-cols-1 md:grid-cols-3`이 이미 작동하므로, 추가 변경 최소화.

그러나 3열이 1열로 세로 스택되면 너무 길어지므로, `gallery-view.tsx`에 모바일 탭 UI를 추가할 수 있다. 이 작업은 `MobileGalleryTab`을 별도 라우트로 쓰지 않고, **AppShell 내에서 모바일 감지 후 전환**하는 방식으로 처리한다.

실제로 `/gallery`는 AppShell을 사용하므로, 모바일에서도 AppShell의 BottomNav가 보인다. 별도 `MobileGalleryTab`을 page.tsx의 `MobileHome`에 넣는 것이 아니라, `/gallery` URL에서 직접 모바일 최적화된 뷰를 렌더한다.

`apps/web/src/app/gallery/page.tsx` 수정:

```tsx
// 기존:
import { AppShell } from '@/components/app-shell';
import GalleryView from '@/components/gallery-view';

export default function GalleryPage() {
  return <AppShell><GalleryView /></AppShell>;
}

// 변경 없음 — AppShell이 모바일 BottomNav를 자동 처리.
// GalleryView 내부에서 useIsMobile로 탭 UI 추가하는 것은 별도 태스크.
```

- [ ] **Step 2: community-list.tsx — 사이드바 모바일 숨김**

`apps/web/src/app/community/community-list.tsx`에서 우측 사이드바에 `hidden md:block` 추가:

```tsx
// 사이드바 부분 찾기 (대략 line 225 근처):
// Before:
<div className="w-72 shrink-0 ...">

// After:
<div className="hidden md:block w-72 shrink-0 ...">
```

그리고 모바일에서 주간 베스트를 상단 가로 스크롤로 추가:

```tsx
// 메인 피드 영역 상단에 모바일 전용 주간 베스트 추가:
<div className="md:hidden">
  {weeklyBest && weeklyBest.length > 0 && (
    <div className="mb-4">
      <h3 className="text-sm font-bold mb-2 px-1">주간 베스트</h3>
      <div className="flex gap-3 scroll-x-hide -mx-4 px-4">
        {weeklyBest.map((p, i) => (
          <Link key={p.id} href={`/community/${p.id}`} className="w-48 shrink-0 rounded-xl border bg-card p-3">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-bold text-primary">#{i + 1}</span>
            </div>
            <p className="text-xs font-medium truncate">{p.title}</p>
            <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
              <span>❤ {p.likeCount}</span>
              <span>💬 {p.commentCount}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 3: portfolio-public-view.tsx — 모바일 레이아웃**

`apps/web/src/app/portfolio/[slug]/portfolio-public-view.tsx` 수정:

```tsx
// import 추가:
import { useIsMobile } from '@/lib/use-is-mobile';
import { ChevronLeft } from 'lucide-react';

// 컴포넌트 내부:
const isMobile = useIsMobile();

// 모바일 레이아웃:
if (isMobile) {
  return (
    <div className="min-h-[100dvh] flex flex-col pb-safe-bottom">
      <header className="flex items-center gap-2 px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <button onClick={() => window.history.back()} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-medium text-sm truncate">{data.name}</span>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* 기존 섹션들 그대로 렌더 */}
        {/* Header, SinceStatsHero, SnapshotSection, FeedbackSection, DividendSection, HoldingsSection, CTA */}
      </div>
    </div>
  );
}

// 데스크톱: 기존 레이아웃 유지
```

- [ ] **Step 4: typecheck + 빌드**

```bash
pnpm --filter=web typecheck && pnpm turbo build --filter=web
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/community/community-list.tsx apps/web/src/app/portfolio/[slug]/portfolio-public-view.tsx
git commit -m "feat: 커뮤니티 사이드바 모바일 숨김 + 포트폴리오 공개뷰 모바일 레이아웃"
```

---

### Task 22: 최종 연결 — page.tsx에 갤러리/마이 탭 라우팅

**Files:**
- Modify: `apps/web/src/app/page.tsx`

page.tsx의 `/` URL에서 갤러리/커뮤니티/마이 탭은 해당 URL로 라우팅되므로 (`/gallery`, `/community`, `/mypage`), MobileHome에서는 홈/캔버스 탭만 렌더한다.
그러나 BottomNav에서 갤러리/커뮤니티/마이 탭 클릭 시 해당 라우트로 이동하므로, 별도 처리는 필요 없다.

- [ ] **Step 1: BottomNav 탭 전환 시 라우팅 확인**

`bottom-nav.tsx`에서 갤러리/커뮤니티/마이 탭은 `<Link href="/gallery">` 등으로 이미 라우팅 중. AppShell이 해당 페이지에서 BottomNav를 렌더하므로 정상 동작.

홈/캔버스 탭 전환 시 `/`에 있으면서 `activeTab`만 변경하는 것도 이미 구현됨.

BottomNav에서 갤러리/커뮤니티/마이 탭 클릭 시 `setActiveTab`도 해당 탭으로 설정해야 함 — 돌아올 때 상태 유지를 위해.

- [ ] **Step 2: 빌드 확인 및 전체 동작 검증**

```bash
pnpm turbo build --filter=web
```

- [ ] **Step 3: Commit (필요 시)**

변경 사항이 있으면 커밋.

---

### Task 23: settings-view.tsx + mypage-view.tsx 모바일 최적화

**Files:**
- Modify: `apps/web/src/components/settings-view.tsx`
- Modify: `apps/web/src/components/mypage-view.tsx`

- [ ] **Step 1: settings-view.tsx — 카드 grid 반응형**

기존 3-column 선택 카드를 모바일에서 2-column으로:

```tsx
// 화면 모드 선택 grid:
// Before: grid-cols-3
// After: grid-cols-2 md:grid-cols-3

// 색상 선택 grid:
// Before: grid-cols-2 (이미 반응형)
// After: 변경 없음
```

- [ ] **Step 2: mypage-view.tsx — 모바일 패딩/레이아웃 조정**

```tsx
// max-w-xl 컨테이너에 모바일 패딩 추가:
// Before: max-w-xl mx-auto
// After: max-w-xl mx-auto px-4 md:px-0
```

기존 데스크톱 레이아웃은 AppShell 내부에서 충분한 패딩이 있으므로, 모바일에서 좌우 패딩만 보강하면 충분.

- [ ] **Step 3: typecheck + 빌드**

```bash
pnpm --filter=web typecheck && pnpm turbo build --filter=web
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/settings-view.tsx apps/web/src/components/mypage-view.tsx
git commit -m "feat: 설정/마이페이지 모바일 반응형 패딩 조정"
```

---

### Task 24: 최종 빌드 + 수동 검증

- [ ] **Step 1: 전체 빌드**

```bash
pnpm turbo build --filter=web
```

- [ ] **Step 2: 로컬 실행 후 모바일 뷰 검증**

```bash
cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas
pnpm --filter=web dev
```

Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M) → iPhone 14 Pro 등으로 확인:

검증 체크리스트:
1. [ ] `/` — 비로그인: LandingPage (반응형 패딩, Bottom Nav 미표시)
2. [ ] `/` — 로그인: 홈 탭 (광고 슬라이더 + TOP 프리뷰 + 인기글)
3. [ ] Bottom Nav 5탭 표시, 활성 탭 하이라이트
4. [ ] 캔버스 탭 → 탐색 세그먼트: 검색, 카테고리, ETF 목록, [+] 추가
5. [ ] FloatingCanvasBar: ETF 추가 시 "캔버스에 N개 ETF 담김" 표시
6. [ ] 캔버스 탭 → 조합 세그먼트: ETF 카드, 스와이프 삭제, 투자금 조정, 합성하기
7. [ ] 캔버스 탭 → 실적 세그먼트: 기간 선택, 지표 4개, 차트, 피드백
8. [ ] ETF 상세 Bottom Sheet: 정보 뱃지, 차트, 보유종목, 캔버스 추가 CTA
9. [ ] `/gallery` — 갤러리: 3-탭 전환, 포트폴리오 리스트
10. [ ] `/community` — 커뮤니티: 주간 베스트 가로 스크롤, 글 목록
11. [ ] `/mypage` — 마이: 프로필 카드 + 메뉴 리스트
12. [ ] 데스크톱(768px+): 기존 레이아웃 변경 없음

- [ ] **Step 3: 최종 커밋 + appVersion bump**

```bash
# Web Chart.yaml appVersion bump
# apps/web/helm/etf-canvas-web/Chart.yaml 에서 appVersion 증가

git add -A
git commit -m "feat: 모바일 반응형 UI — 5-탭 Bottom Nav + 캔버스 세그먼트 + Bottom Sheet"
```

---

## API Reference (구현 시 반드시 참조)

아래는 리뷰에서 발견된 실제 API 시그니처와 타입 정보이다. 계획 내 코드 스니펫은 **가이드라인**일 뿐, 실제 구현 시 아래 시그니처에 맞춰야 한다.

### ETFSummary 필드 (packages/shared/src/index.ts)
```typescript
interface ETFSummary {
  code: string;
  name: string;
  categories: string[];          // ⚠️ 복수형 배열 (category 아님)
  issuer: string;
  price: number;
  changeRate: number;
  aum: number | null;
  expenseRatio: number | null;
  nav: number | null;
  threeMonthEarnRate: number | null;
  oneYearEarnRate: number | null;  // ⚠️ returnRate1Y 아님
  dividendYield: number | null;
  listedDate: string | null;
}
```

### ETFCategory (실제 값)
```typescript
type ETFCategory = '국내 대표지수' | '해외 대표지수' | '섹터/테마' | '채권' | '원자재' | '레버리지/인버스' | '혼합' | '액티브' | 'New';
```

### ETF 목록 API (api.list / api.search)
```typescript
api.list(category?: string, sort?: ETFSortBy, offset = 0, limit = 30) => ETFSummary[]
api.search(q: string, category?: string, sort?: ETFSortBy, offset = 0, limit = 30) => ETFSummary[]
// ⚠️ api.browseETFs는 존재하지 않음! offset 기반 페이지네이션.
```

### SimulateRequest / api.simulate
```typescript
interface SimulateRequest {
  codes: string[];        // ⚠️ items[] 아님
  weights: number[];      // ⚠️ 배열
  amount: number;         // ⚠️ 필수
  period: string;
  endDate?: string;
}
api.simulate(req: SimulateRequest) => SimulateResult
// ⚠️ api.simulateHistorical은 존재하지 않음!
```

### SimulateResult
```typescript
interface SimulateResult {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number | null;
  dailyValues: { date: string; value: number }[];
  perEtf: { code: string; name: string; weight: number; returnRate: number; maxDrawdown?: number; volatility?: number }[];
  startPrices?: Record<string, number>;
}
```

### api.getPortfolioFeedback
```typescript
api.getPortfolioFeedback(items: { code: string; name: string; weight: number; category: string }[])
  => { feedback: string; actions: { ... }[]; tags: string[]; snippet: string }
// ⚠️ totalAmount 인자 없음. 반환 필드는 .feedback (not .text). category 필수.
```

### api.autoSavePortfolio
```typescript
api.autoSavePortfolio(items, feedback: FeedbackObj | null, totalAmount?: number)
// ⚠️ 두 번째 인자가 feedback, 세 번째가 totalAmount
```

### api.listPortfolios
```typescript
api.listPortfolios(sort?: string) => Portfolio[]
// ⚠️ api.getPortfolios는 존재하지 않음!
```

### useReturnColors (lib/return-colors.ts)
```typescript
import { useReturnColors } from '@/lib/return-colors';
// ⚠️ gallery-view.tsx에서 export 안 됨!
// 반환: { upClass, downClass, upHex, downHex, cls(positive), hex(positive), bgCls(), borderCls(), glowCls() }
// ⚠️ .up / .down 필드 없음! .upClass / .downClass 사용.
```

### EtfDetailModal 주의사항
기존 `EtfDetailModal`은 `fixed inset-0 z-50 backdrop-blur-sm` 오버레이를 자체 포함한다. Drawer 내부에서 사용 시 overlay 중복이 발생하므로, `mode?: 'modal' | 'inline'` prop을 추가하여 `inline` 모드에서는 overlay 없이 콘텐츠만 렌더해야 한다.

### community-list.tsx 사이드바
실제 사이드바 클래스는 `hidden lg:block w-72 shrink-0` 이다 (`md:block` 아님). 모바일 숨김 처리는 이미 `hidden lg:block`으로 되어 있으므로, 추가 변경 필요 여부를 실제 파일에서 확인할 것.

---

## Summary

| Chunk | Tasks | Key Deliverable |
|---|---|---|
| 1. Foundation | 1-7 | vaul, useIsMobile, store, BottomNav, AppShell 분기, page.tsx 스켈레톤 |
| 2. Home Tab | 8-10 | AdBannerSlider, MobileHomeTab, 연결 |
| 3. Canvas Discover | 11-13 | FloatingCanvasBar, DiscoverSegment, CanvasTab |
| 4. Canvas Compose/Perf | 14-17 | SwipeToDelete, ComposeSegment, PerformanceSegment, 연결 |
| 5. Detail + Gallery | 18-19 | EtfDetailSheet, GalleryTab |
| 6. My + Modifications | 20-24 | MyTab, community/portfolio 모바일, settings/mypage, 최종 검증 |
