# Phase A: 데이터 자산화 기반 — DB 확장 + Slug + 공개 API

> PRD: ETF Canvas 데이터 자산화 (AEO/GEO 최적화) 중 Phase A

## 목적

유저 포트폴리오 + AI 피드백을 영구 저장하고, 인증 없이 접근 가능한 공개 URL을 생성하여 이후 SSR 페이지(Phase B), SEO(Phase C), AI 강화(Phase D), 갤러리(Phase E)의 기반을 마련한다.

## DB 스키마 변경

Portfolio 모델에 다음 필드 추가:

| 필드 | 타입 | 용도 |
|------|------|------|
| `slug` | String @unique | 공개 URL 경로 |
| `feedbackText` | String? | AI 피드백 전문 (영구 저장) |
| `feedbackActions` | Json? | 피드백 액션 배열 |
| `feedbackSnippet` | String? | 1줄 요약 (Phase D에서 채움) |
| `tags` | String[] | 자동 해시태그 (Phase D에서 채움) |

## Slug 생성 규칙

- ETF 이름 비중 상위 3개를 kebab-case로 변환 + UUID 앞 8자리
- 예: `kodex200-tiger-sp500-3a7f2b1c`
- UUID 포함으로 항상 unique, 충돌 체크 불필요
- ETF 이름 정규화: 영문+숫자+한글 추출, 공백→하이픈, 소문자 변환

## API 변경

### 포트폴리오 저장 (`POST /portfolio`)

기존 로직에 추가:
1. slug 자동 생성
2. Redis 캐시에서 피드백 조회 (캐시키: `feedback:{hash}`)
3. 캐시 miss → Gemini API 호출하여 피드백 생성
4. feedbackText, feedbackActions를 DB에 함께 저장

### 공개 조회 (`GET /portfolio/public/:slug`)

- 인증 불필요
- 응답: name, items, snapshot, feedbackText, feedbackActions, createdAt
- userId 등 민감 정보 제외

## 포트폴리오 공개 정책

- 모든 저장된 포트폴리오에 공개 URL 생성 (별도 토글 없음)
- UI 진입점은 Phase E에서 Top 20 + 갤러리로 제한
- 나머지는 sitemap.xml(Phase C)로만 크롤러에 노출
- 직접 URL 공유는 항상 가능

## 의존성

- 기존 GeminiService (피드백 생성)
- 기존 RedisService (캐시 조회)
- Prisma migration

## Phase 전체 로드맵

| Phase | 범위 | 의존성 |
|-------|------|--------|
| **A (이번)** | DB 확장 + slug + 공개 API + 피드백 영구 저장 | 없음 |
| B | `/portfolio/[slug]` SSR 페이지 + Meta + JSON-LD | A |
| C | sitemap.xml + robots.txt + 검색엔진 ping | B |
| D | 자동 태깅 + 1줄 snippet 추출 | A |
| E | 메인 Top 20 큐레이션 + 테마 갤러리 | B, D |
