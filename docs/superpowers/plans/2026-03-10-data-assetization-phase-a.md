# Phase A: 데이터 자산화 기반 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portfolio 모델에 slug, AI 피드백을 영구 저장하고, 인증 없이 접근 가능한 공개 API를 추가한다.

**Architecture:** Prisma 스키마에 slug/feedbackText/feedbackActions/feedbackSnippet/tags 필드 추가. 포트폴리오 저장 시 slug 자동 생성 + Redis 피드백 조회(miss 시 Gemini 호출) 후 DB 영구 저장. 공개 조회 API `GET /portfolio/public/:slug` 추가.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Redis, Google Gemini API

---

## Chunk 1: DB 스키마 + Slug 생성 + 저장 로직

### Task 1: Prisma 스키마 확장

**Files:**
- Modify: `apps/api/prisma/schema.prisma:77-93`

- [ ] **Step 1: Portfolio 모델에 필드 추가**

`apps/api/prisma/schema.prisma`의 Portfolio 모델을 다음으로 교체:

```prisma
model Portfolio {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id")
  name            String   @db.VarChar(100)
  slug            String   @unique @db.VarChar(200)
  items           Json
  snapshot        Json?
  returnRate      Decimal? @map("return_rate") @db.Decimal(8, 2)
  mdd             Decimal? @db.Decimal(8, 2)
  feedbackText    String?  @map("feedback_text")
  feedbackActions Json?    @map("feedback_actions")
  feedbackSnippet String?  @map("feedback_snippet")
  tags            String[] @default([])
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @default(now()) @map("updated_at") @updatedAt

  @@index([userId])
  @@index([userId, id])
  @@index([returnRate(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@index([slug])
  @@map("portfolio")
}
```

- [ ] **Step 2: 마이그레이션 생성 및 적용**

Run: `cd apps/api && npx prisma migrate dev --name add-portfolio-slug-feedback`

Expected: Migration 파일 생성, DB 스키마 업데이트 성공. 기존 포트폴리오의 slug은 NULL이므로 마이그레이션 전에 기존 데이터 처리 필요.

**주의:** 기존 포트폴리오 데이터가 있으면 slug NOT NULL 제약 위반. 마이그레이션 SQL을 수동 편집하여:
1. slug 컬럼을 nullable로 먼저 추가
2. 기존 행에 UUID 앞 8자리로 slug 채움
3. NOT NULL + UNIQUE 제약 추가

```sql
ALTER TABLE "portfolio" ADD COLUMN "slug" VARCHAR(200);
ALTER TABLE "portfolio" ADD COLUMN "feedback_text" TEXT;
ALTER TABLE "portfolio" ADD COLUMN "feedback_actions" JSONB;
ALTER TABLE "portfolio" ADD COLUMN "feedback_snippet" TEXT;
ALTER TABLE "portfolio" ADD COLUMN "tags" TEXT[] DEFAULT '{}';

UPDATE "portfolio" SET "slug" = LEFT("id"::text, 8) WHERE "slug" IS NULL;

ALTER TABLE "portfolio" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Portfolio_slug_key" ON "portfolio"("slug");
CREATE INDEX "portfolio_slug_idx" ON "portfolio"("slug");
```

- [ ] **Step 3: Prisma client 재생성 확인**

Run: `cd apps/api && npx prisma generate`

Expected: 성공, 새 필드가 PrismaClient 타입에 반영

- [ ] **Step 4: 커밋**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat: Portfolio 모델에 slug, feedback, tags 필드 추가 — 마이그레이션"
```

---

### Task 2: Slug 생성 유틸리티

**Files:**
- Create: `apps/api/src/portfolio/slug.util.ts`

- [ ] **Step 1: slug 생성 함수 구현**

`apps/api/src/portfolio/slug.util.ts`:

```typescript
/**
 * 포트폴리오 slug 생성: ETF 이름 상위 3개(비중순) + UUID 앞 8자리
 * 예: kodex200-tiger-sp500-3a7f2b1c
 */
export function generateSlug(
  items: { name: string; weight: number }[],
  uuid: string,
): string {
  const top3 = [...items]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const namePart = top3
    .map((item) =>
      item.name
        .replace(/\(.*?\)/g, '')       // 괄호 제거
        .replace(/[^\w가-힣]/g, '-')   // 특수문자 → 하이픈
        .replace(/-+/g, '-')           // 연속 하이픈 정리
        .replace(/^-|-$/g, '')         // 양끝 하이픈 제거
        .toLowerCase(),
    )
    .filter(Boolean)
    .join('-');

  const uuidPart = uuid.replace(/-/g, '').slice(0, 8);

  return `${namePart}-${uuidPart}`;
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/api/src/portfolio/slug.util.ts
git commit -m "feat: 포트폴리오 slug 생성 유틸리티 함수"
```

---

### Task 3: 포트폴리오 저장 시 slug + 피드백 영구 저장

**Files:**
- Modify: `apps/api/src/portfolio/portfolio.service.ts:91-114` (create 메서드)
- Modify: `apps/api/src/portfolio/portfolio.controller.ts:30-38` (create 엔드포인트)

- [ ] **Step 1: portfolio.service.ts — create 메서드에 slug + 피드백 저장 추가**

`apps/api/src/portfolio/portfolio.service.ts` 상단에 import 추가:

```typescript
import { generateSlug } from './slug.util';
import { randomUUID } from 'crypto';
```

create 메서드를 다음으로 교체:

```typescript
async create(
  userId: string,
  name: string,
  items: { code: string; name: string; weight: number; category?: string }[],
) {
  const codes = items.map((i) => i.code);
  const weights = items.map((i) => i.weight);
  const snapshot = await this.buildSnapshot(codes, weights);
  const yearData = snapshot.periods['1y'];

  // slug 생성
  const uuid = randomUUID();
  const slug = generateSlug(items, uuid);

  // 피드백 조회: Redis 캐시 → miss 시 Gemini 호출
  const feedbackItems = items.map((i) => ({
    code: i.code,
    name: i.name,
    weight: i.weight,
    category: i.category || '',
  }));
  let feedbackResult: { feedback: string; actions: { category: string; label: string }[] } | null = null;
  try {
    feedbackResult = await this.feedback(feedbackItems);
  } catch {
    // 피드백 실패해도 저장은 진행
  }

  return this.prisma.portfolio.create({
    data: {
      id: uuid,
      userId,
      name,
      slug,
      items,
      snapshot: snapshot as any,
      returnRate: yearData?.totalReturn ?? null,
      mdd: yearData?.maxDrawdown ?? null,
      feedbackText: feedbackResult?.feedback || null,
      feedbackActions: feedbackResult?.actions || null,
    },
  });
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas && pnpm turbo build --filter=@etf-canvas/api`

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add apps/api/src/portfolio/portfolio.service.ts
git commit -m "feat: 포트폴리오 저장 시 slug 자동 생성 + AI 피드백 영구 저장"
```

---

## Chunk 2: 공개 API + 프론트엔드 연동

### Task 4: 공개 조회 API 엔드포인트

**Files:**
- Modify: `apps/api/src/portfolio/portfolio.service.ts` (getPublic 메서드 추가)
- Modify: `apps/api/src/portfolio/portfolio.controller.ts` (public 엔드포인트 추가)

- [ ] **Step 1: portfolio.service.ts — getPublic 메서드 추가**

`portfolio.service.ts`의 `get` 메서드 아래에 추가:

```typescript
async getPublic(slug: string) {
  const p = await this.prisma.portfolio.findUnique({ where: { slug } });
  if (!p) throw new NotFoundException();
  // 민감 정보 제외
  return {
    name: p.name,
    slug: p.slug,
    items: p.items,
    snapshot: p.snapshot,
    returnRate: p.returnRate,
    mdd: p.mdd,
    feedbackText: p.feedbackText,
    feedbackActions: p.feedbackActions,
    feedbackSnippet: p.feedbackSnippet,
    tags: p.tags,
    createdAt: p.createdAt,
  };
}
```

- [ ] **Step 2: portfolio.controller.ts — 공개 엔드포인트 추가**

`portfolio.controller.ts`의 `feedback` 메서드 아래, `create` 메서드 위에 추가 (인증 필요 라우트보다 먼저 매칭되도록):

```typescript
@Get('public/:slug')
getPublic(@Param('slug') slug: string) {
  return this.svc.getPublic(slug);
}
```

**주의:** NestJS 라우트 매칭 순서상, `public/:slug`가 `:id`보다 먼저 선언되어야 함. `@Get('public/:slug')`를 `@Get(':id')` 위에 배치.

- [ ] **Step 3: 빌드 확인**

Run: `cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas && pnpm turbo build --filter=@etf-canvas/api`

Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add apps/api/src/portfolio/portfolio.service.ts apps/api/src/portfolio/portfolio.controller.ts
git commit -m "feat: 공개 포트폴리오 조회 API — GET /portfolio/public/:slug"
```

---

### Task 5: 프론트엔드 API 클라이언트 + 저장 응답에 slug 포함

**Files:**
- Modify: `apps/web/src/lib/api.ts` (공개 조회 함수 추가, savePortfolio 응답 타입 확장)

- [ ] **Step 1: api.ts에 공개 조회 함수 추가 + 저장 응답 확장**

`apps/web/src/lib/api.ts`의 `savePortfolio` 응답 타입 수정:

```typescript
savePortfolio: (token: string, name: string, items: { code: string; name: string; weight: number; category?: string }[]) =>
  fetcher<{ id: string; slug: string }>('/portfolio', {
    method: 'POST',
    body: JSON.stringify({ name, items }),
    headers: { Authorization: `Bearer ${token}` },
  }),
```

`deletePortfolio` 뒤에 공개 조회 함수 추가:

```typescript
getPublicPortfolio: (slug: string) =>
  fetcher<{
    name: string;
    slug: string;
    items: { code: string; name: string; weight: number; category?: string }[];
    snapshot: {
      periods: Record<string, { totalReturn: number; annualizedReturn: number; maxDrawdown: number }>;
      avgVolatility: number;
    } | null;
    returnRate: number | null;
    mdd: number | null;
    feedbackText: string | null;
    feedbackActions: { category: string; label: string }[] | null;
    feedbackSnippet: string | null;
    tags: string[];
    createdAt: string;
  }>(`/portfolio/public/${slug}`),
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas && pnpm turbo build --filter=web`

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat: 프론트엔드 API 클라이언트에 공개 포트폴리오 조회 추가"
```

---

### Task 6: 저장 모달에서 slug 반환 활용 (공유 URL 표시)

**Files:**
- Modify: `apps/web/src/components/save-portfolio-modal.tsx`

- [ ] **Step 1: 저장 성공 후 slug 기반 공유 URL 표시**

`save-portfolio-modal.tsx`를 수정하여 저장 성공 후 공유 URL을 보여줌:

```typescript
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { useCanvasStore } from '@/lib/store';

export function SavePortfolioModal({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const { comparing, selected, weights } = useCanvasStore();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !session?.user?.id) return;
    setSaving(true);
    try {
      const items = comparing.map((code) => {
        const etf = selected.find((s) => s.code === code);
        return { code, name: etf?.name || code, weight: weights[code] || 0 };
      });
      const result = await api.savePortfolio(session.user.id, name.trim(), items);
      setSavedSlug(result.slug);
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = savedSlug ? `${window.location.origin}/portfolio/${savedSlug}` : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-background rounded-2xl border shadow-2xl w-[360px] p-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {savedSlug ? (
          <div className="text-center">
            <div className="text-2xl mb-2">&#x2705;</div>
            <h2 className="text-lg font-bold mb-1">저장 완료!</h2>
            <p className="text-sm text-muted-foreground mb-4">공유 링크가 생성되었어요</p>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 mb-4">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-xs truncate outline-none"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                {copied ? '복사됨!' : '복사'}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full h-11 rounded-lg border font-medium text-sm hover:bg-muted/50 transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold">나만의 포트폴리오 저장하기</h2>
              <p className="text-sm text-muted-foreground mt-1">포트폴리오 이름을 입력하세요</p>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="예: 무조건 간다!"
              className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
              autoFocus
              maxLength={100}
            />

            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas && pnpm turbo build --filter=web`

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/components/save-portfolio-modal.tsx
git commit -m "feat: 저장 완료 후 공유 URL 표시 + 클립보드 복사"
```

---

### Task 7: 버전 bump + 최종 빌드

**Files:**
- Modify: `apps/api/helm/etf-canvas-api/Chart.yaml`
- Modify: `apps/web/helm/etf-canvas-web/Chart.yaml`

- [ ] **Step 1: appVersion bump**

API: `0.5.20` → `0.6.0`
Web: `0.5.15` → `0.6.0`

- [ ] **Step 2: 전체 빌드 확인**

Run: `cd /Users/jaden.krust/Documents/GitHub/fullstackhub/etf-canvas && pnpm turbo build --filter=@etf-canvas/api && pnpm turbo build --filter=web`

Expected: 양쪽 모두 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add apps/api/helm/etf-canvas-api/Chart.yaml apps/web/helm/etf-canvas-web/Chart.yaml
git commit -m "chore: Phase A 데이터 자산화 기반 — API 0.6.0, Web 0.6.0"
```
