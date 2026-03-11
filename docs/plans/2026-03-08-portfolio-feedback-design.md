# Portfolio Feedback with Gemini API

## Context

ETF Canvas의 포트폴리오 합성 후, Gemini API를 사용하여 구성에 대한 피드백을 제공한다.
자본시장법상 투자자문/투자권유에 해당하지 않도록, 공시 자료 기반 일반 정보 제공 수준으로 제한한다.

### Legal Constraints (변호사 상담 요약)

- 공시 자료를 무료로 단순히 보여주기만 하는 차원이면 투자자문업에 해당하지 않을 수 있음
- 추천/가입 유도/수수료 수취 등과 결합되면 자문/투자권유행위로 볼 수 있음
- 따라서: 비권유 표현만 사용, 면책 문구 상시 노출, 특정 종목 추천 금지

## Decision

- Model: **Gemini 3.0 Flash** (GCP 월 $100 크레딧 활용)
- Approach: **Gemini Structured Output** (JSON 모드로 피드백 + 액션 반환)
- Backend: NestJS에서 Gemini 호출, Redis 캐시
- Frontend: attribute-panel에서 피드백 렌더링

## API Design

### `POST /portfolio/feedback` (인증 불필요)

```typescript
// Request
{
  items: { code: string; name: string; weight: number; category: string }[]
}

// Response
{
  feedback: string;          // 2~3문장 한국어 피드백
  actions: {                 // 구성 좋으면 빈 배열
    category: string;        // 8개 카테고리 중 하나
    label: string;           // "{카테고리명} ETF 조회하기"
  }[]
}
```

### Cache

- Key: `feedback:${sha256(items를 code:weight로 정렬 후 join)}`
- TTL: 86400초 (24시간)
- 여러 사용자가 동일 구성이면 캐시 공유

## Gemini Prompt

```
너는 ETF 포트폴리오 구성을 분석하는 정보 제공 도우미야.
절대 특정 종목을 추천하거나 매수/매도를 권유하지 마.
"~할 수 있어요", "~를 고려해볼 수 있어요" 같은 해요체 비권유 표현만 사용해.
"~하세요", "~해야 합니다", "~됩니다", "~습니다" 같은 격식체/지시 표현은 금지.
반드시 해요체로 답변해. (예: "~있어요", "~이에요", "~할 수 있어요", "~보여요")

사용자의 포트폴리오:
{items JSON}

카테고리 목록: 국내 대표지수, 해외 대표지수, 섹터/테마, 액티브, 채권, 혼합, 원자재, 레버리지/인버스

분석 기준:
- 카테고리 분산도 (편중 여부)
- 비중 균형
- 구성이 균형 잡혀 있으면 긍정적 피드백을 주고, actions는 빈 배열로 반환

JSON으로만 응답해:
{
  "feedback": "2~3문장 한국어 피드백",
  "actions": [{ "category": "정확한 카테고리명", "label": "{카테고리명} ETF 조회하기" }]
}
```

## Frontend Flow

1. 유저가 합성 버튼 클릭 (비중 합 100% 시에만 활성)
2. store에서 현재 구성의 해시와 이전 feedbackHash 비교 → 동일하면 스킵
3. `POST /portfolio/feedback` 호출
4. attribute-panel 하단에 피드백 텍스트 + 액션 버튼 렌더링
5. 액션 버튼 클릭 → left-panel의 `infoCat`을 해당 카테고리로 변경
6. 하단에 면책 문구 고정 표시

### Disclaimer (고정 노출)

> 본 정보는 공시 자료 기반의 일반적인 분석이며 투자 자문이 아닙니다.
> 투자 판단은 본인의 책임하에 이루어져야 합니다.

## File Changes

| File | Change |
|------|--------|
| `apps/api/src/gemini/gemini.module.ts` | New: GeminiModule |
| `apps/api/src/gemini/gemini.service.ts` | New: Gemini API 호출, JSON 파싱, fallback |
| `apps/api/src/portfolio/portfolio.module.ts` | GeminiModule import 추가 |
| `apps/api/src/portfolio/portfolio.controller.ts` | `POST feedback` 엔드포인트 추가 |
| `apps/api/src/portfolio/portfolio.service.ts` | `feedback()` 메서드 (캐시 + Gemini 호출) |
| `apps/web/src/lib/api.ts` | `getPortfolioFeedback()` 추가 |
| `apps/web/src/lib/store.ts` | `feedbackHash`, `feedback`, `feedbackActions` 상태 추가 |
| `apps/web/src/components/attribute-panel.tsx` | Mock 제거, 실제 피드백 UI + 면책 문구 |

## Error Handling

- Gemini JSON 파싱 실패 → `{ feedback: "피드백을 생성할 수 없습니다.", actions: [] }`
- Gemini API 타임아웃 (10초) → 위와 동일 fallback
- actions의 category가 유효한 8개 중 하나가 아니면 필터링
- 환경변수 `GEMINI_API_KEY` 미설정 시 피드백 기능 비활성화 (에러 아닌 graceful skip)

---

# Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 합성 버튼 클릭 시 Gemini 3.0 Flash로 포트폴리오 피드백을 생성하여 attribute-panel에 표시

**Architecture:** NestJS 백엔드에 GeminiService + feedback 엔드포인트 추가, Redis 캐시, 프론트에서 합성 시 호출하여 attribute-panel에 렌더링

**Tech Stack:** NestJS, Gemini 3.0 Flash API, Redis, Next.js, Zustand

---

### Task 1: GeminiService 생성

**Files:**
- Create: `apps/api/src/gemini/gemini.module.ts`
- Create: `apps/api/src/gemini/gemini.service.ts`

**Step 1: Create GeminiModule**

```typescript
// apps/api/src/gemini/gemini.module.ts
import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';

@Module({
  providers: [GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
```

**Step 2: Create GeminiService**

```typescript
// apps/api/src/gemini/gemini.service.ts
import { Injectable, Logger } from '@nestjs/common';

const GEMINI_MODEL = 'gemini-3.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface FeedbackResult {
  feedback: string;
  actions: { category: string; label: string }[];
}

const VALID_CATEGORIES = [
  '국내 대표지수', '해외 대표지수', '섹터/테마', '액티브',
  '채권', '혼합', '원자재', '레버리지/인버스',
];

const FALLBACK: FeedbackResult = { feedback: '피드백을 생성할 수 없어요.', actions: [] };

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY || '';

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async analyzeFeedback(
    items: { code: string; name: string; weight: number; category: string }[],
  ): Promise<FeedbackResult> {
    if (!this.isAvailable()) return FALLBACK;

    const prompt = `너는 ETF 포트폴리오 구성을 분석하는 정보 제공 도우미야.
절대 특정 종목을 추천하거나 매수/매도를 권유하지 마.
"~할 수 있어요", "~를 고려해볼 수 있어요" 같은 해요체 비권유 표현만 사용해.
"~하세요", "~해야 합니다", "~됩니다", "~습니다" 같은 격식체/지시 표현은 금지.
반드시 해요체로 답변해. (예: "~있어요", "~이에요", "~할 수 있어요", "~보여요")

사용자의 포트폴리오:
${JSON.stringify(items.map((i) => ({ name: i.name, category: i.category, weight: i.weight })))}

카테고리 목록: ${VALID_CATEGORIES.join(', ')}

분석 기준:
- 카테고리 분산도 (편중 여부)
- 비중 균형
- 구성이 균형 잡혀 있으면 긍정적 피드백을 주고, actions는 빈 배열로 반환

JSON으로만 응답해:
{
  "feedback": "2~3문장 한국어 피드백",
  "actions": [{ "category": "정확한 카테고리명", "label": "{카테고리명} ETF 조회하기" }]
}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${GEMINI_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        this.logger.warn(`Gemini API error: ${res.status}`);
        return FALLBACK;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return FALLBACK;

      const parsed: FeedbackResult = JSON.parse(text);

      // Validate & filter actions
      parsed.actions = (parsed.actions || []).filter(
        (a) => VALID_CATEGORIES.includes(a.category) && a.label,
      );

      return parsed;
    } catch (e) {
      this.logger.warn(`Gemini feedback failed: ${e}`);
      return FALLBACK;
    }
  }
}
```

**Step 3: Verify build**

Run: `pnpm turbo build --filter=@etf-canvas/api`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/api/src/gemini/
git commit -m "feat: add GeminiService for portfolio feedback"
```

---

### Task 2: feedback 엔드포인트 추가

**Files:**
- Modify: `apps/api/src/portfolio/portfolio.module.ts`
- Modify: `apps/api/src/portfolio/portfolio.controller.ts`
- Modify: `apps/api/src/portfolio/portfolio.service.ts`

**Step 1: Add GeminiModule to PortfolioModule imports**

```typescript
// apps/api/src/portfolio/portfolio.module.ts
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [PrismaModule, EtfModule, RedisModule, GeminiModule],
  // ...
})
```

**Step 2: Add feedback method to PortfolioService**

```typescript
// apps/api/src/portfolio/portfolio.service.ts — add to constructor + new method
import { createHash } from 'crypto';
import { GeminiService } from '../gemini/gemini.service';

// In constructor: add private readonly gemini: GeminiService

async feedback(items: { code: string; name: string; weight: number; category: string }[]) {
  // Build cache key from sorted code:weight pairs
  const sorted = [...items].sort((a, b) => a.code.localeCompare(b.code));
  const hash = createHash('sha256')
    .update(sorted.map((i) => `${i.code}:${i.weight}`).join(','))
    .digest('hex')
    .slice(0, 16);
  const cacheKey = `feedback:${hash}`;

  const cached = await this.redis.getJson<any>(cacheKey);
  if (cached) return cached;

  const result = await this.gemini.analyzeFeedback(items);
  await this.redis.setJson(cacheKey, result, 86400);
  return result;
}
```

**Step 3: Add POST endpoint to controller**

```typescript
// apps/api/src/portfolio/portfolio.controller.ts — no auth guard needed
@Post('feedback')
feedback(
  @Body() body: { items: { code: string; name: string; weight: number; category: string }[] },
) {
  return this.svc.feedback(body.items);
}
```

Note: `POST feedback` must be placed BEFORE `@Get(':id')` in the controller to avoid route conflict.

**Step 4: Verify build**

Run: `pnpm turbo build --filter=@etf-canvas/api`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add apps/api/src/portfolio/
git commit -m "feat: add POST /portfolio/feedback endpoint with Redis cache"
```

---

### Task 3: Store에 feedback 상태 추가

**Files:**
- Modify: `apps/web/src/lib/store.ts`

**Step 1: Add feedback state to CanvasStore interface**

Add to interface:
```typescript
feedbackHash: string;
feedbackText: string;
feedbackActions: { category: string; label: string }[];
feedbackLoading: boolean;
setFeedback: (hash: string, text: string, actions: { category: string; label: string }[]) => void;
setFeedbackLoading: (v: boolean) => void;
browseCategory: string | null;  // left-panel 카테고리 이동용
setBrowseCategory: (cat: string | null) => void;
```

Add to implementation:
```typescript
feedbackHash: '',
feedbackText: '',
feedbackActions: [],
feedbackLoading: false,
setFeedback: (hash, text, actions) => set({ feedbackHash: hash, feedbackText: text, feedbackActions: actions, feedbackLoading: false }),
setFeedbackLoading: (v) => set({ feedbackLoading: v }),
browseCategory: null,
setBrowseCategory: (cat) => set({ browseCategory: cat }),
```

Also: in `clearCanvas`, add reset: `feedbackHash: '', feedbackText: '', feedbackActions: [], feedbackLoading: false, browseCategory: null`

**Step 2: Verify build**

Run: `pnpm turbo build --filter=web`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/web/src/lib/store.ts
git commit -m "feat: add feedback state to canvas store"
```

---

### Task 4: API client에 feedback 호출 추가

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add getPortfolioFeedback**

```typescript
getPortfolioFeedback: (items: { code: string; name: string; weight: number; category: string }[]) =>
  fetcher<{
    feedback: string;
    actions: { category: string; label: string }[];
  }>('/portfolio/feedback', {
    method: 'POST',
    body: JSON.stringify({ items }),
  }),
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat: add getPortfolioFeedback API client"
```

---

### Task 5: 합성 버튼에 feedback 호출 연동

**Files:**
- Modify: `apps/web/src/components/canvas-panel.tsx`

**Step 1: Add feedback call to synthesize flow**

Import `createHash` 대신 간단한 해시 함수 사용 (브라우저):

```typescript
// canvas-panel.tsx 상단
function hashItems(comparing: string[], weights: Record<string, number>) {
  const sorted = [...comparing].sort();
  return sorted.map((c) => `${c}:${weights[c] || 0}`).join(',');
}
```

합성 버튼 onClick 수정:

```typescript
onClick={() => {
  if (!session) {
    setPendingSynthesize(true);
    setShowLogin(true);
  } else {
    synthesize();
    // feedback 호출
    const hash = hashItems(comparing, weights);
    if (hash !== feedbackHash) {
      setFeedbackLoading(true);
      const items = comparing.map((code) => {
        const etf = selected.find((s) => s.code === code);
        return {
          code,
          name: etf?.name || '',
          weight: weights[code] || 0,
          category: etf?.categories?.[0] || '',
        };
      });
      api.getPortfolioFeedback(items)
        .then((res) => setFeedback(hash, res.feedback, res.actions))
        .catch(() => setFeedback(hash, '피드백을 생성할 수 없어요.', []));
    }
  }
}}
```

**Step 2: Verify build**

Run: `pnpm turbo build --filter=web`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/web/src/components/canvas-panel.tsx
git commit -m "feat: trigger feedback on synthesize"
```

---

### Task 6: attribute-panel 피드백 UI 구현

**Files:**
- Modify: `apps/web/src/components/attribute-panel.tsx`

**Step 1: Replace mock with real feedback UI**

Replace the entire `{/* 포트폴리오 피드백 */}` section (lines 70-102) with:

```tsx
{/* 포트폴리오 피드백 */}
{synthesized && (
  <div className="p-4 border-t space-y-3">
    <h3 className="font-bold text-sm">포트폴리오 피드백</h3>
    {feedbackLoading ? (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        피드백을 분석하고 있어요...
      </div>
    ) : feedbackText ? (
      <>
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3">
          <div className="flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed">{feedbackText}</p>
          </div>
        </div>
        {feedbackActions.length > 0 && (
          <div className="flex flex-col gap-2">
            {feedbackActions.map((action) => (
              <button
                key={action.category}
                onClick={() => setBrowseCategory(action.category)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Search className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          본 정보는 공시 자료 기반의 일반적인 분석이며 투자 자문이 아닙니다.
          투자 판단은 본인의 책임하에 이루어져야 합니다.
        </p>
      </>
    ) : null}
  </div>
)}
```

Update imports: add `Loader2` from lucide-react, add `synthesized`, `feedbackText`, `feedbackActions`, `feedbackLoading`, `setBrowseCategory` from store. Remove `BarChart3`.

**Step 2: Verify build**

Run: `pnpm turbo build --filter=web`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/web/src/components/attribute-panel.tsx
git commit -m "feat: replace mock feedback with Gemini-powered UI"
```

---

### Task 7: left-panel에서 browseCategory 반응

**Files:**
- Modify: `apps/web/src/components/left-panel.tsx`

**Step 1: Watch browseCategory from store**

```typescript
const { browseCategory, setBrowseCategory } = useCanvasStore();

useEffect(() => {
  if (browseCategory) {
    setCategory(browseCategory);
    setInfoCat(browseCategory);
    setBrowseCategory(null);
  }
}, [browseCategory]);
```

This sets the category filter + info panel to the target category when an action button is clicked.

**Step 2: Verify build**

Run: `pnpm turbo build --filter=web`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/web/src/components/left-panel.tsx
git commit -m "feat: left-panel reacts to browseCategory from feedback actions"
```

---

### Task 8: 환경변수 설정 + 통합 테스트

**Files:**
- Modify: `apps/api/.env` (GEMINI_API_KEY 추가)

**Step 1: Add GEMINI_API_KEY to .env**

```
GEMINI_API_KEY=<user will provide>
```

**Step 2: Build both apps**

Run: `pnpm turbo build --filter=@etf-canvas/api && pnpm turbo build --filter=web`
Expected: Both succeed

**Step 3: Manual test**

1. 로컬 서버 재시작
2. ETF 3개 이상 캔버스에 추가, 비중 100% 맞추기
3. 합성 버튼 클릭
4. attribute-panel 하단에 피드백 + 액션 버튼 표시 확인
5. 액션 버튼 클릭 → left-panel 카테고리 전환 확인
6. 동일 구성으로 재합성 → API 호출 안 되는지 확인 (해시 비교)

**Step 4: Commit**

```bash
git commit -m "feat: portfolio feedback with Gemini 3.0 Flash — API 0.5.5"
```
