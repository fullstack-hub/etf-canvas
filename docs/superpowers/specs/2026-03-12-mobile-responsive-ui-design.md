# Mobile Responsive UI Design Spec

**Date:** 2026-03-12
**Status:** Approved
**Scope:** 모바일 반응형 UI 레이어 추가 (기존 PC 기능 re-layout only, 신규 기능 없음)

---

## 1. 설계 원칙

- **기능 동결**: PC 버전에 존재하는 기능만 모바일에 노출. 절대 새로운 기능을 추가하지 않는다.
- **홈 탭 예외**: 모바일 홈 탭은 기존 갤러리·커뮤니티 데이터를 한 화면에 모아 보여주는 대시보드 뷰이다. 신규 API나 로직은 없으며, 기존 데이터의 재배치(aggregation view)만 해당한다. 광고 배너 슬라이더는 향후 광고 이미지 삽입을 위한 플레이스홀더로, 현재는 더미 이미지를 표시한다.
- **반응형 단일 코드베이스**: 별도 모바일 앱이 아닌, Tailwind `md:` breakpoint(768px) 기준 반응형 분기.
- **프리미엄 핀테크 UX**: 토스증권, 카카오페이증권, Robinhood 수준의 모바일 경험 목표.
- **최소 침습**: 기존 PC 컴포넌트를 최대한 재사용하고, 모바일 전용 wrapper/layout만 추가.

---

## 2. 기술 스택 및 의존성

| 항목 | 값 |
|---|---|
| Framework | Next.js 16.1.6 + React 19.2.3 |
| Styling | Tailwind v4 (CSS-only config) + shadcn/ui |
| State | Zustand 5 (`useCanvasStore` — persist) |
| Charts | Recharts 3.8 |
| Icons | lucide-react 0.577 |
| Bottom Sheet | `vaul` (신규 추가, ~4KB, Radix 기반, shadcn 공식 권장) |
| Breakpoint | `md:` (768px) — 모바일 < 768px, 데스크톱 ≥ 768px |

### 새로 추가할 패키지

- `vaul` — Bottom Sheet (ETF 상세, 필터 등)

---

## 3. 반응형 감지

### `useIsMobile` 훅

```typescript
// apps/web/src/lib/use-is-mobile.ts
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
  return false; // SSR fallback: desktop
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- `useSyncExternalStore`로 hydration mismatch 방지
- SSR에서는 desktop으로 렌더 → CSR에서 모바일 감지 시 즉시 전환

---

## 4. 모바일 전용 상태 관리

### `useMobileUIStore` (Zustand, persist 없음)

```typescript
// apps/web/src/lib/mobile-ui-store.ts
interface MobileUIState {
  activeTab: 'home' | 'gallery' | 'canvas' | 'community' | 'my';
  canvasSegment: 'discover' | 'compose' | 'performance';
  etfDetailCode: string | null;       // Bottom Sheet 대상 ETF
  showSaveModal: boolean;
  showFilterSheet: boolean;
}
```

- 기존 `useCanvasStore`와 독립. 모바일 UI 전환 상태만 관리.
- `activeTab` ↔ URL 라우팅과 동기화 (아래 라우팅 섹션 참조).

---

## 5. 네비게이션 구조

### 5.1 Bottom Navigation Bar

```
┌─────────────────────────────────────────────┐
│  홈    갤러리   캔버스   커뮤니티    마이     │
│  Home  Trophy  Layers  MessageSq  User      │
└─────────────────────────────────────────────┘
```

| 탭 | 아이콘 (Lucide) | 라우트 | 비고 |
|---|---|---|---|
| 홈 | `Home` | `/` (state: home) | 모바일 전용 대시보드 (기존 데이터 aggregation) |
| 갤러리 | `Trophy` | `/gallery` | TOP 포트폴리오 |
| 캔버스 | `Layers` | `/` (state: canvas) | 3-segment: 탐색 / 조합 / 실적 |
| 커뮤니티 | `MessageSquare` | `/community` | 커뮤니티 목록 |
| 마이 | `User` | `/mypage` | 로그인 시 프로필 이미지 |

**홈/캔버스 URL 공유 처리:**
- 홈과 캔버스 탭은 모두 `/` URL을 공유한다. 구분은 `useMobileUIStore.activeTab` 상태로만 한다.
- **기본 탭**: `/`에 처음 도달하면 `activeTab: 'home'`이 기본값이다.
- **탭 전환 시 URL은 변경하지 않는다** — `history.replaceState`로 탭 상태를 query parameter로 반영하지 않는다. 단순 인메모리 상태.
- **새로고침/직접 URL 진입**: 항상 홈 탭으로 진입한다 (persist 없는 Zustand이므로).

**사양:**
- 높이: 56px + `env(safe-area-inset-bottom)`
- 배경: `backdrop-blur-xl bg-background/80 border-t`
- 활성 탭: `text-primary`, 비활성: `text-muted-foreground`
- `position: fixed; bottom: 0; width: 100%`
- `z-index: 50`
- 모바일(`< md`)에서만 표시, 데스크톱에서 `hidden`
- Bottom Sheet(vaul) 열릴 때: vaul의 overlay가 z-index 50 이상이므로 자연스럽게 가려진다. 별도 숨김 처리 불필요.

### 5.2 캔버스 탭 내부 세그먼트

```
┌──────────────────────────────┐
│  [ 탐색 | 조합 | 실적 ]      │   ← Segmented Control
├──────────────────────────────┤
│                              │
│  (세그먼트별 콘텐츠)          │
│                              │
└──────────────────────────────┘
```

- `탐색`: LeftPanel의 카테고리 + ETF 검색/목록 → 탭하면 캔버스에 추가
- `조합`: CanvasPanel의 ETF 카드 목록 + 투자금 입력 + 합성/저장 버튼
- `실적`: PerformancePanel의 차트 + 지표 (합성 후 활성화)

세그먼트 컨트롤 스타일:
- 높이: 36px, `rounded-lg bg-muted` 배경
- 활성 세그먼트: `bg-background shadow-sm rounded-md` (iOS 스타일 pill)
- 상단 고정 (sticky)

### 5.3 라우팅 전략

기존 URL 구조 유지. 렌더링만 `useIsMobile`로 분기:

| URL | Desktop | Mobile |
|---|---|---|
| `/` (authed) | IconSidebar + LeftPanel + CanvasPanel + PerformancePanel + AttributePanel | 홈 탭(기본) 또는 캔버스 탭 (`activeTab` 상태에 따라) |
| `/` (unauthed) | LandingPage (현행) | LandingPage — 모바일 반응형 적용 (CTA 버튼 크기 확대, 패딩 조정), Bottom Nav 미표시 |
| `/gallery` | AppShell + GalleryView | 갤러리 탭 |
| `/community` | AppShell + CommunityList | 커뮤니티 탭 |
| `/community/[id]` | AppShell + CommunityPostDetail | 전체 화면 (뒤로가기 네비) |
| `/portfolio` | AppShell + PortfolioList | 마이 탭 > 내 포트폴리오 |
| `/portfolio/[slug]` | IconSidebar + PublicView + AttributePanel | 전체 화면 스크롤 |
| `/settings` | AppShell + SettingsView | 마이 탭 > 설정 |
| `/mypage` | AppShell + MypageView | 마이 탭 |

---

## 6. 레이아웃 변경

### 6.1 `layout.tsx` — Footer 숨김

```tsx
<Footer />  →  <div className="hidden md:block"><Footer /></div>
```

모바일에서 37px Footer 숨기고, Bottom Nav로 대체.

### 6.2 `app-shell.tsx` — 반응형 분기

```tsx
export function AppShell({ children }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
        <div className="flex-1 overflow-y-auto">{children}</div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-37px)] flex overflow-hidden">
      <IconSidebar />
      <div className="flex-1 flex min-w-0 bg-background">{children}</div>
    </div>
  );
}
```

### 6.3 `page.tsx` (홈) — 가장 복잡한 분기

Desktop: 현행 유지 (IconSidebar + LeftPanel + CanvasPanel + PerformancePanel + AttributePanel)

Mobile (unauthed): `LandingPage` 그대로 표시. Bottom Nav 미표시. 모바일 반응형 패딩/버튼 크기만 조정.

Mobile (authed): `activeTab`에 따라:
- `home` → `MobileHomeTab` (광고 슬라이더 + TOP 포트폴리오 프리뷰 + 인기글 프리뷰)
- `canvas` → `MobileCanvasTab` (`canvasSegment`에 따라 탐색/조합/실적 전환)

**FloatingFeedback 모바일 처리**: 데스크톱의 드래그 가능한 `FloatingFeedback` 오버레이는 모바일에서 표시하지 않는다. 대신, 합성 후 피드백 텍스트는 실적 세그먼트 최하단에 인라인으로 표시한다 (기존 `FeedbackSection` 컴포넌트 재사용).

---

## 7. 탭별 모바일 레이아웃

### 7.1 홈 탭

```
┌──────────────────────────────┐
│ 🔍 ETF Canvas         [알림] │  ← 헤더 (로고 + 검색)
├──────────────────────────────┤
│ ┌────────────────────────┐   │
│ │   광고 배너 슬라이더     │   │  ← 자동 롤링, 이미지 플레이스홀더
│ └────────────────────────┘   │
│                              │
│ TOP 포트폴리오 ──────── 더보기 │
│ ┌─────┐ ┌─────┐ ┌─────┐     │  ← 가로 스크롤 카드
│ │ #1  │ │ #2  │ │ #3  │     │
│ └─────┘ └─────┘ └─────┘     │
│                              │
│ 인기 게시글 ──────── 더보기    │
│ ┌──────────────────────┐     │
│ │ 제목 / 좋아요 / 댓글  │     │  ← 리스트 형태
│ └──────────────────────┘     │
└──────────────────────────────┘
```

**광고 배너 슬라이더:**
- CSS scroll-snap 기반 가로 슬라이더
- 자동 롤링 (3초 간격), 수동 스와이프 가능
- 하단 dot indicator
- 현재 이미지 없음 → 플레이스홀더 3장 (그라데이션 + 텍스트)

**TOP 포트폴리오 프리뷰:**
- 기존 `api.getTopPortfolios(5, 'return')` 호출 (수익률 TOP, 5개)
- 가로 스크롤 카드
- 카드: 이름, 수익률, ETF 수, 탭 시 `/portfolio/[slug]` 이동
- "더보기" → 갤러리 탭으로 전환

**인기 게시글:**
- 기존 `api.communityWeeklyBest(5)` 호출 (`/community/posts/weekly-best?limit=5`)
- 최대 5개, 리스트 형태 (제목 + 카테고리 뱃지 + 좋아요/댓글 수)
- "더보기" → 커뮤니티 탭으로 전환

### 7.2 갤러리 탭

기존 `GalleryView` 3-column grid → 모바일에서 1-column 세로 스택:

```
┌──────────────────────────────┐
│ TOP 포트폴리오               │
├──────────────────────────────┤
│ [수익률 TOP] [안정성] [분배금] │  ← 탭 전환 (기존 3열 → 1열)
├──────────────────────────────┤
│ #1 포트폴리오 이름            │
│    +12.5% | ETF 5개          │
│ #2 ...                       │
│ #3 ...                       │
└──────────────────────────────┘
```

- 기존 `grid-cols-1 md:grid-cols-3` 활용 — 모바일에서는 3열을 단순 세로 스택하면 너무 길어지므로, 탭 UI로 1개 카테고리씩 표시하는 UI 개선 포함
- 이것은 기존 GalleryView에 모바일 전용 탭 전환 로직을 추가하는 것으로, 데이터/API 변경 없음
- 카드 탭 시 `/portfolio/[slug]` 이동

### 7.3 캔버스 탭 — 탐색 세그먼트

기존 `LeftPanel`의 모바일 재배치:

```
┌──────────────────────────────┐
│  [ 탐색 | 조합 | 실적 ]      │
├──────────────────────────────┤
│ 🔍 ETF 검색                 │
├──────────────────────────────┤
│ 카테고리 칩 (가로 스크롤)     │
│ [국내대표] [미국] [섹터] ... │
├──────────────────────────────┤
│ ┌──────────────────────┐     │
│ │ KODEX 200  │ +12.3% │ [+] │  ← ETF 리스트, [+] 버튼으로 캔버스 추가
│ │ AUM 5.2조원          │     │
│ └──────────────────────┘     │
│ ...                          │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ 캔버스에 3개 ETF 담김     │ │  ← Floating Feedback Bar
│ │              [조합하기 →] │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

**Floating Feedback Bar:**
- 캔버스에 ETF가 1개 이상 담겼을 때 리스트 하단에 표시
- "캔버스에 N개 ETF 담김" + "조합하기 →" 버튼
- 탭하면 `canvasSegment: 'compose'`로 전환
- `position: sticky; bottom: calc(56px + env(safe-area-inset-bottom) + 16px)`

**ETF 리스트 아이템:**
- 기존 `EtfListItem` 데이터 재사용
- 카테고리 컬러 왼쪽 바 + 이름 + 수익률 + AUM
- 오른쪽 [+] 버튼: `addToCanvas` (이미 추가된 경우 체크 아이콘)
- 아이템 탭: ETF 상세 Bottom Sheet 열기
- 무한 스크롤 유지

### 7.4 캔버스 탭 — 조합 세그먼트

기존 `CanvasPanel`의 모바일 재배치:

```
┌──────────────────────────────┐
│  [ 탐색 | 조합 | 실적 ]      │
├──────────────────────────────┤
│ 총 투자금: 1,500만원         │
│                    [초기화]  │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ ■ KODEX 200     33.3%   │ │  ← ETF 카드
│ │ [-] ████████500만원█ [+] │ │     스와이프 왼쪽 → 삭제
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ■ TIGER 미국S&P500 33.3% │ │
│ │ [-] ████████500만원█ [+] │ │
│ └──────────────────────────┘ │
│ ...                          │
├──────────────────────────────┤
│ [      합성하기      ]       │  ← Primary CTA
│ [      저장하기      ]       │  ← Secondary (합성 후)
└──────────────────────────────┘
```

**ETF 카드:**
- 카테고리 컬러 좌측 바
- 이름 + 비중(%) 상단
- 투자금 입력: `[-]` `[금액]` `[+]` 버튼 레이아웃
- 스와이프 왼쪽 → 삭제 버튼 노출 (삼성증권 mPOP 스타일)
- 빈 상태: "탐색 탭에서 ETF를 추가해주세요" + 탐색 탭 이동 버튼

**투자금 슬라이더 (선택적):**
- 카드 탭 시 확장되어 슬라이더 표시
- 1% 단위 스텝
- 5% 마다 haptic feedback (`navigator.vibrate(10)`) — iOS Safari는 Vibration API 미지원이므로 no-op 처리 (graceful fallback)
- `[-]` `[+]` 버튼: 1% 단위 미세 조정

### 7.5 캔버스 탭 — 실적 세그먼트

기존 `PerformancePanel`의 모바일 풀스크린 재배치:

```
┌──────────────────────────────┐
│  [ 탐색 | 조합 | 실적 ]      │
├──────────────────────────────┤
│ [1W][1M][3M][6M][YTD][1Y][3Y]│  ← 기간 선택
├──────────────────────────────┤
│ 수익률    연환산    MDD   변동성│  ← 4 MetricCards (2×2 grid)
│ +12.3%   +8.5%   -5.2%  14% │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │    성장 추이 차트          │ │  ← AreaChart (Recharts)
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ 자산 구성                     │  ← CategoryPie 도넛 차트
│ ┌──────────────────────────┐ │
│ │  [도넛]  범례 리스트       │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ 분배금 내역                   │  ← DividendChart
│ ┌──────────────────────────┐ │
│ │  바+라인 차트              │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ 가중평균 운용보수: 0.15%      │
└──────────────────────────────┘
```

- 합성 전: "합성 후 실적을 확인할 수 있습니다" 빈 상태
- 기존 `PerformancePanel` 컴포넌트 내부의 차트/지표를 세로 스크롤로 재배치
- MetricCards: `grid-cols-2` (모바일, `min-w-0` 적용하여 320px 화면 대응) vs `grid-cols-4` (데스크톱)
- 합성 후 피드백이 있으면 최하단에 `FeedbackSection` 인라인 표시 (데스크톱 FloatingFeedback 대체)

### 7.6 커뮤니티 탭

기존 `CommunityList`의 모바일 재배치:

```
┌──────────────────────────────┐
│ 커뮤니티           [글쓰기 ✏️] │
├──────────────────────────────┤
│ [최신순] [인기순]             │
│ [전체] [자유] [질문] [분석]   │  ← 카테고리 칩 가로 스크롤
├──────────────────────────────┤
│ 주간 베스트 (가로 스크롤 카드) │
│ ┌────┐ ┌────┐ ┌────┐        │
│ └────┘ └────┘ └────┘        │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ [자유] 제목               │ │
│ │ 작성자 · 2시간 전         │ │
│ │ ❤ 12  💬 5  👁 120       │ │
│ └──────────────────────────┘ │
│ ...                          │
└──────────────────────────────┘
```

- 기존 우측 사이드바(주간 베스트)를 상단 가로 스크롤 카드로 이동
- 글 목록은 기존 `PostRow` 컴포넌트 재사용 (반응형)
- 페이지네이션 유지
- 글쓰기 → 닉네임 확인 → 작성 화면 (풀스크린)

### 7.7 마이 탭

```
┌──────────────────────────────┐
│ 마이페이지                    │
├──────────────────────────────┤
│  [프로필 카드]                │  ← 기존 MypageView 프로필 히어로
│  이름 / 닉네임 / 이메일       │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ 📁 내 포트폴리오    (N) → │ │  ← /portfolio로 이동
│ │ ⚙️ 설정               → │ │  ← /settings로 이동
│ │ 📝 추가 정보          → │ │  ← 인라인 편집 or 섹션 이동
│ │ 🔒 공개 설정          → │ │
│ └──────────────────────────┘ │
│                              │
│ [로그아웃]                    │
└──────────────────────────────┘
```

- 비로그인 시: 로그인 CTA 화면 (Bottom Nav는 표시, 마이 탭만 로그인 유도)
- 로그인 시: 프로필 + 메뉴 리스트 형태
- "내 포트폴리오 (N)": N은 포트폴리오 수. 0개면 뱃지 미표시 (빈 값).
- 기존 `MypageView`의 섹션들을 메뉴 아이템 → 하위 화면 패턴으로 재구성

---

## 8. 상세 화면 (Bottom Sheet / Full Screen)

### 8.1 ETF 상세 Bottom Sheet

기존 `EtfDetailModal`의 콘텐츠를 `vaul` Drawer로 래핑:

```
┌──────────────────────────────┐
│ ━━━━ (드래그 핸들)            │
├──────────────────────────────┤
│ KODEX 200                    │
│ [국내대표] [🇰🇷] [069500]    │
├──────────────────────────────┤
│ 운용사: 삼성자산운용            │
│ 벤치마크: KOSPI 200           │
│ AUM: 5.2조원                  │
│ 설정일: 2002-10-14            │
│ 1Y 수익률: +12.3%            │
│ 운용보수: 0.15%               │
│ 분배금: 1.8%                  │
│ 괴리율: 0.02%                 │
├──────────────────────────────┤
│ [1M][3M][1Y][YTD][3Y]        │
│ ┌──────────────────────────┐ │
│ │   가격 차트               │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ 분배금 차트 (있을 경우)        │
├──────────────────────────────┤
│ 포트폴리오 구성 TOP 10        │
│ 삼성전자          +2.3%      │
│ ████████████████  25.3%      │
│ SK하이닉스        -1.2%      │
│ ██████████████    18.7%      │
│ ...                          │
├──────────────────────────────┤
│ [캔버스에 추가하기]            │  ← Primary CTA
└──────────────────────────────┘
```

- `vaul` Drawer: `snapPoints={['85vh']}`, 상단 드래그로 닫기
- Info badges: 2-column grid (모바일) vs inline flex (데스크톱)
- Holdings 레이아웃: 종목명+수익률(상단) / 프로그레스바+비중%(하단)
- 하단 CTA: "캔버스에 추가하기" (이미 추가된 경우 "캔버스에서 제거")
- **기존 `EtfDetailModal`에 `onAddToCanvas?: (etf: ETFSummary) => void` prop 추가 필요** — 데스크톱에서는 미전달(undefined), 모바일에서는 `addToCanvas` 전달. CTA 버튼은 prop이 있을 때만 렌더.

### 8.2 포트폴리오 상세 (Full Screen)

기존 `PortfolioPublicView`의 모바일 재배치:

```
┌──────────────────────────────┐
│ ← 뒤로    포트폴리오 상세      │
├──────────────────────────────┤
│ 포트폴리오 이름               │
│ 2026-03-10 · #배당 #안정     │
├──────────────────────────────┤
│ SinceStatsHero (기존 컴포넌트) │
├──────────────────────────────┤
│ SnapshotSection              │
│ (기간 선택 + 수익률/MDD/변동성)│
├──────────────────────────────┤
│ 포트폴리오 분석               │  ← FeedbackSection (있을 경우)
│ (마크다운 텍스트 + 액션 태그)  │
├──────────────────────────────┤
│ 분배금 내역                   │
├──────────────────────────────┤
│ 포트폴리오 구성               │  ← HoldingsSection
├──────────────────────────────┤
│ [ETF Canvas 시작하기]         │  ← CTA
└──────────────────────────────┘
```

- `IconSidebar` + `AttributePanel` 숨김 → 풀 너비 스크롤
- 상단 뒤로가기 버튼 (ChevronLeft)
- 기존 서브 컴포넌트 (`SinceStatsHero`, `SnapshotSection`, `FeedbackSection`, `DividendSection`, `HoldingsSection`) 그대로 사용 — padding/width만 반응형 조정

### 8.3 게시글 상세 (Full Screen)

기존 `CommunityPostDetail`의 모바일 재배치:

```
┌──────────────────────────────┐
│ ← 뒤로    게시글              │
├──────────────────────────────┤
│ [자유게시판]                  │
│ 제목                         │
│ 작성자 · 2시간 전             │
├──────────────────────────────┤
│ 본문 내용 (마크다운)          │
├──────────────────────────────┤
│ 첨부 포트폴리오 카드 (있을 경우)│
├──────────────────────────────┤
│ ❤ 12  💬 5  👁 120          │
├──────────────────────────────┤
│ 댓글 목록                     │
├──────────────────────────────┤
│ [댓글 입력]              [전송]│  ← 하단 고정
└──────────────────────────────┘
```

- 댓글 입력 바: `position: sticky; bottom: 0` (bottom nav 위)

### 8.4 저장 모달

기존 `SavePortfolioModal` 그대로 사용 (이미 `max-w` 기반으로 반응형):

```
┌──────────────────────────────┐
│                              │
│   포트폴리오 저장             │
│   ┌──────────────────────┐   │
│   │ 이름 입력             │   │
│   └──────────────────────┘   │
│   [취소]         [저장하기]   │
│                              │
│   ─── 성공 시 ───            │
│   저장 완료!                  │
│   https://etf-canvas.com/... │
│   [URL 복사]                  │
│   [닫기]                      │
└──────────────────────────────┘
```

---

## 9. CSS / 스타일 규칙

### 전역 모바일 CSS

```css
/* globals.css에 추가 */

/* 모바일 뷰포트 높이 */
.h-screen-mobile {
  height: 100dvh;
}

/* Safe area padding for bottom nav */
.pb-safe-bottom {
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}

/* 가로 스크롤 컨테이너 (스크롤바 숨김) */
.scroll-x-hide {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scroll-x-hide::-webkit-scrollbar {
  display: none;
}
```

### 터치 최적화

- 모든 터치 타겟: 최소 44×44px (WCAG 2.5.8)
- `touch-action: manipulation` on interactive elements (300ms 딜레이 제거)
- `-webkit-tap-highlight-color: transparent`

---

## 10. 신규 컴포넌트 목록

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| `MobileBottomNav` | `components/mobile/bottom-nav.tsx` | 하단 5-탭 네비게이션 |
| `MobileHomeTab` | `components/mobile/home-tab.tsx` | 홈 탭 (광고 + TOP + 인기글) |
| `MobileCanvasTab` | `components/mobile/canvas-tab.tsx` | 캔버스 탭 세그먼트 컨트롤 |
| `MobileDiscoverSegment` | `components/mobile/discover-segment.tsx` | 탐색 세그먼트 |
| `MobileComposeSegment` | `components/mobile/compose-segment.tsx` | 조합 세그먼트 |
| `MobilePerformanceSegment` | `components/mobile/performance-segment.tsx` | 실적 세그먼트 |
| `MobileGalleryTab` | `components/mobile/gallery-tab.tsx` | 갤러리 탭 (탭형 전환) |
| `MobileCommunityTab` | `components/mobile/community-tab.tsx` | 커뮤니티 탭 |
| `MobileMyTab` | `components/mobile/my-tab.tsx` | 마이 탭 |
| `EtfDetailSheet` | `components/mobile/etf-detail-sheet.tsx` | ETF 상세 Bottom Sheet (vaul) |
| `AdBannerSlider` | `components/mobile/ad-banner-slider.tsx` | 홈 광고 슬라이더 |
| `FloatingCanvasBar` | `components/mobile/floating-canvas-bar.tsx` | 탐색에서 "N개 ETF 담김" 바 |
| `SwipeToDelete` | `components/mobile/swipe-to-delete.tsx` | 조합 ETF 카드 스와이프 삭제 |
| `SegmentedControl` | `components/mobile/segmented-control.tsx` | iOS 스타일 세그먼트 컨트롤 |
| `useIsMobile` | `lib/use-is-mobile.ts` | 반응형 감지 훅 |
| `useMobileUIStore` | `lib/mobile-ui-store.ts` | 모바일 UI 상태 (Zustand) |

---

## 11. 기존 컴포넌트 수정 사항

| 파일 | 변경 내용 |
|---|---|
| `layout.tsx` | Footer에 `hidden md:block` 추가 |
| `app-shell.tsx` | `useIsMobile` 분기 추가 — 모바일: BottomNav, 데스크톱: IconSidebar |
| `page.tsx` | `useIsMobile` 분기 — 모바일: MobileHomeTab/MobileCanvasTab, 데스크톱: 현행. 모바일에서 `FloatingFeedback` 미렌더 (실적 세그먼트 내 인라인으로 대체). LandingPage에 모바일 패딩/CTA 크기 반응형 적용. |
| `icon-sidebar.tsx` | 변경 없음 (AppShell에서 조건부 렌더) |
| `left-panel.tsx` | 변경 없음 (MobileDiscoverSegment에서 로직 재사용) |
| `canvas-panel.tsx` | 변경 없음 (MobileComposeSegment에서 로직 재사용) |
| `performance-panel.tsx` | MetricCard에 `compact` prop 활용, 차트 height 반응형 |
| `gallery-view.tsx` | 기존 `grid-cols-1 md:grid-cols-3` 활용 + 모바일 탭 UI 추가 |
| `community-list.tsx` | 사이드바 `hidden md:block` → 모바일에서 상단 가로 스크롤로 이동 |
| `portfolio-public-view.tsx` | `useIsMobile` 분기 — 모바일: Sidebar/AttributePanel 숨김, 뒤로가기 헤더 |
| `etf-detail-modal.tsx` | `useIsMobile` 분기 — 모바일: vaul Drawer 래핑, 데스크톱: 현행 모달. `onAddToCanvas` optional prop 추가. |
| `settings-view.tsx` | 카드 grid 반응형 조정 (`grid-cols-2 md:grid-cols-3`) |
| `mypage-view.tsx` | 모바일에서 메뉴 리스트 형태로 재배치 |
| `globals.css` | 모바일 유틸리티 클래스 추가 |

---

## 12. 제외 사항 (명시적)

다음은 이 스펙의 범위에 포함되지 않는다:

- 신규 기능 추가 (점수 시스템, AI 추천, 알림 등)
- PWA / 네이티브 앱 기능 (push notification, offline 등)
- 태블릿 전용 레이아웃 (md 이상은 모두 데스크톱 취급)
- 다국어 지원
- 접근성(a11y) 전면 개선 (최소한의 터치 타겟만 보장)
- 애니메이션/트랜지션 과도한 추가 (기본적인 페이드/슬라이드만)
