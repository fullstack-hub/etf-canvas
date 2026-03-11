# PRD: ETF Canvas 데이터 자산화

> AEO/GEO 최적화 및 트래픽 플라이휠 구축

| 항목 | 내용 |
|---|---|
| **문서 버전** | v2.0 |
| **작성일** | 2024-05-24 |
| **최종 수정일** | 2026-03-10 |
| **작성자** | Lead PM |
| **실행 주체** | Claude Opus 4.6 (AI Agent) |
| **상태** | In Review |

---

## 1. Problem (문제 정의)

### 1.1 배경: 검색의 룰이 바뀌었다

생성형 AI 검색(GEO/AEO) 시대가 도래했다. 사용자는 검색엔진에게 '링크의 나열'이 아닌 **'요약된 정답'**을 요구한다. Google AI Overviews, Bing Copilot, Naver Cue 등 AI 기반 검색이 주류가 되면서, **데이터를 구조화하여 AI가 인용할 수 있는 형태로 제공하는 것**이 마케팅의 핵심이 되었다.

### 1.2 현재의 기술적 한계 (데이터 근거)

ETF Canvas는 두 가지 치명적 문제에 직면해 있다:

**문제 1 - SPA의 '밀실 과외' 현상:**
- 유저와 AI의 상호작용(포트폴리오 생성 + AI 피드백)이 실시간 화면에서만 발생
- 세션 종료 시 수만 건의 고가치 데이터가 증발
- 매일 생성되는 피드백 데이터가 마케팅 자산으로 전환되지 못함

**문제 2 - 크롤러의 블라인드:**
- 검색 엔진 로봇에게 `etfcanvas.com/main`은 빈 페이지 (SPA 동적 렌더링)
- Google Search Console 인덱싱 페이지 수: 사실상 0
- 오가닉 검색 트래픽: 거의 없음

### 1.3 이 문제를 지금 해결해야 하는 이유

- 유저가 매일 생성하는 포트폴리오 조합은 경쟁사가 복제할 수 없는 **고유 롱테일 키워드**
- 이 데이터가 검색에 노출되지 않는 매일이 **마케팅 기회비용의 누적 손실**
- AI 검색 시장 선점 기회는 지금이 골든타임

---

## 2. Goal (목표)

> **휘발되는 데이터를 영구적인 마케팅 자산으로 전환한다.**

| 목표 | 측정 기준 |
|---|---|
| 유저 포트폴리오 + AI 피드백을 검색 가능한 정적 자산으로 전환 | 인덱싱된 페이지 수 10,000+ (3개월 내) |
| 자기 강화 플라이휠 구축 (유저 증가 → 콘텐츠 증가 → 검색 노출 → 신규 유입) | 월간 오가닉 트래픽 300% 증가 |
| 외부 광고비 0원으로 수렴하는 자립형 마케팅 구조 | CAC(고객획득비용) 50% 감소 |

---

## 3. User Story (사용자 시나리오)

### 3.1 검색 유입 시나리오 (핵심)

```
사용자 A는 "KODEX 200 골드선물 혼합 수익률"을 구글에 검색한다.
→ ETF Canvas의 포트폴리오 페이지가 검색 결과 상위에 노출된다.
→ AI 피드백 요약이 Google AI Overview에 인용된다.
→ 사용자 A가 클릭하여 ETF Canvas에 유입된다.
→ 사용자 A도 자신만의 포트폴리오를 생성하고 저장한다.
→ 새로운 정적 페이지가 자동 생성되어 또 다른 검색 키워드를 점유한다.
```

### 3.2 기존 유저 공유 시나리오

```
사용자 B는 ETF Canvas에서 포트폴리오를 완성하고 AI 피드백을 받는다.
→ '저장하기' 클릭 시 고유 URL이 생성된다 (예: /portfolio/kospi-sp500-gold)
→ 해당 URL을 카카오톡/블로그에 공유한다.
→ 공유받은 사람이 링크를 클릭하여 ETF Canvas에 유입된다.
```

---

## 4. Scope / Non-Scope

### Scope (이번 버전에서 구현)

| ID | 기능 | 우선순위 |
|---|---|---|
| F-01 | 포트폴리오 저장 시 Canonical URL 자동 생성 (Slug 기반) | Must |
| F-02 | 정적 HTML 페이지 생성 (SSR/SSG) + AI 피드백 텍스트 포함 | Must |
| F-03 | Meta Tag (Title, Description) 동적 삽입 | Must |
| F-04 | Schema.org JSON-LD 구조화 데이터 마크업 | Must |
| F-05 | sitemap.xml 자동 생성 및 검색엔진 PING 전송 | Must |
| F-06 | AI 기반 포트폴리오 자동 해시태그 분류 | Should |
| F-07 | 메인 페이지 [오늘의 큐레이션 Top 20] 섹션 | Should |
| F-08 | 테마별 서브페이지 (포트폴리오 갤러리) | Should |
| F-09 | AI 피드백 핵심 요약문 자동 추출 (1줄 Snippet) | Should |

### Non-Scope (이번 버전에서 하지 않음)

- 유저 간 소셜 기능 (댓글, 좋아요)
- 포트폴리오 실시간 수익률 자동 갱신 (정적 페이지는 생성 시점 데이터)
- 다국어(영어) 지원
- 네이티브 앱 대응

---

## 5. Feature Requirements (기능 요구사항)

### 5.1 전략 1: 결과물의 영구 자산화 (고유 URL)

**목적**: 유저의 포트폴리오 조합 + AI 피드백을 검색엔진이 크롤링 가능한 정적 자산으로 전환

**URL 구조:**
```
Before: etfcanvas.com/canvas              → SPA, 검색엔진에 투명
After:  etfcanvas.com/portfolio/{slug}     → 정적 HTML, 크롤링 가능
```

**Slug 생성 규칙:**
- ETF 종목코드 조합을 kebab-case로 변환
- 예: `kospi200-sp500-gold`, `kodex200-tiger-nasdaq`
- 중복 시 숫자 suffix 추가: `kospi200-sp500-gold-2`

**정적 페이지 포함 요소:**
- 포트폴리오 AI 피드백 (전문)
- 구성 ETF 목록, 비중, 현재가
- 핵심 성과 지표 (평균 변동폭, 수익률, 시뮬레이션 결과)
- Open Graph / Twitter Card 메타데이터

**예외 처리:**
- 저장하지 않은 포트폴리오는 정적 페이지 미생성
- 부적절한 내용 포함 시 noindex 처리

### 5.2 전략 2: 대규모 데이터의 스마트 구조화

**딜레마**: 수만 개의 조합을 모두 메인에 노출하면 화면 과부하 + 검색엔진 스팸 판정

**3단계 분산 전략:**

| 계층 | 역할 | 노출 대상 |
|---|---|---|
| 메인 화면 (Clean Entrance) | Top 20 큐레이션 (조회수 + AI 점수 기반) | 유저 + 크롤러 |
| 서브 페이지 (테마별 갤러리) | 해시태그 기반 카테고리 (#고배당, #미국주식 등) | 유저 + 크롤러 |
| 백그라운드 (비밀 장부) | sitemap.xml을 통한 롱테일 URL 자동 제출 | 크롤러 only |

**자동 태깅 로직:**
- AI가 포트폴리오의 ETF 구성을 분석하여 해시태그 자동 부여
- 태그 카테고리: 투자전략(#고배당, #성장주), 지역(#미국주식, #국내), 자산(#채권, #금), 테마(#AI, #인플레이션방어)

### 5.3 전략 3: AI 검색 맞춤형 데이터 요약

**목적**: Google AI Overviews / Naver Cue가 ETF Canvas 데이터를 인용하도록 구조화

**구현 스펙:**
```html
<meta name="description" content="{AI 피드백 핵심 1줄 요약}">
<meta property="og:title" content="{ETF 조합명} 포트폴리오 분석 | ETF Canvas">
<meta property="og:description" content="{AI 피드백 핵심 1줄 요약}">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FinancialProduct",
  "name": "{ETF 조합명} 포트폴리오",
  "description": "{AI 피드백 핵심 요약}",
  "provider": { "@type": "Organization", "name": "ETF Canvas" },
  "url": "https://etfcanvas.com/portfolio/{slug}"
}
</script>
```

---

## 6. Non-Functional Requirements (비기능 요구사항)

| 항목 | 요구사항 |
|---|---|
| 성능 | 정적 페이지 LCP(Largest Contentful Paint) < 2.5초 |
| SEO | Core Web Vitals 통과, Mobile-friendly |
| 보안 | XSS 방지 (AI 피드백 텍스트 sanitize), HTTPS only |
| 확장성 | 10만+ 페이지까지 sitemap 분할 지원 (sitemap index) |
| 모니터링 | Google Search Console 인덱싱 현황 대시보드 |

---

## 7. 기술 아키텍처

```
[유저] → 포트폴리오 생성 → AI 피드백 수신 → 저장
                                              |
                                              v
                                    ┌─── Backend API ───┐
                                    │                    │
                                    │  Slug Generator    │
                                    │  Auto Tagger (AI)  │
                                    │  Snippet Extractor │
                                    │                    │
                                    └────────┬───────────┘
                                             |
                                             v
                                   SSR/SSG Pipeline
                                   (Meta + JSON-LD)
                                             |
                              ┌──────────────┼──────────────┐
                              v              v              v
                         Main Page     Sub Pages      sitemap.xml
                         (Top 20)     (#tag gallery)  (background)
                              |              |              |
                              v              v              v
                         ┌──────────────────────────────────┐
                         │     Search Engine Crawlers        │
                         │     (Google / Naver / Bing)       │
                         └──────────────────────────────────┘
```

---

## 8. AI Agent 실행 계획

> 모든 개발은 Claude Opus 4.6 AI Agent가 수행한다. 인간 개입 없음.

| Phase | 예상 소요 | AI Agent 역할 | 산출물 |
|---|---|---|---|
| Phase 1 | ~30분 | **Architect Agent**: 프로젝트 구조 설계, 기술 스택 확정 | 기술 설계 문서, 디렉토리 구조 |
| Phase 2 | ~2시간 | **Backend Agent**: URL 라우팅, Slug 생성, DB 스키마 구현 | API 엔드포인트, 마이그레이션 파일 |
| Phase 3 | ~2시간 | **Frontend Agent**: SSR/SSG 페이지 렌더링, Meta/JSON-LD 삽입 | 정적 페이지 템플릿, 컴포넌트 |
| Phase 4 | ~1시간 | **SEO Agent**: sitemap.xml 생성기, 검색엔진 PING 로직 | sitemap 생성 모듈, cron job |
| Phase 5 | ~1시간 | **AI/ML Agent**: 자동 태깅 로직, 핵심 요약문 추출기 | 태깅 서비스, Snippet 추출기 |
| Phase 6 | ~1시간 | **UI Agent**: 메인 큐레이션 섹션, 서브페이지 갤러리 | UI 컴포넌트, 레이아웃 |
| Phase 7 | ~30분 | **QA Agent**: 통합 테스트, SEO 검증, 빌드 확인 | 테스트 결과 리포트 |

**총 예상 소요: ~8시간 (병렬 실행 시 ~4시간)**

**병렬 실행 가능 조합:**
- Phase 2 + Phase 5 (Backend + AI/ML)
- Phase 3 + Phase 4 (Frontend + SEO)
- Phase 6은 Phase 3 완료 후 실행

---

## 9. KPI (성공 지표)

| 지표 | 현재 | 목표 (3개월) | 목표 (6개월) |
|---|---|---|---|
| 인덱싱된 페이지 수 | ~0 | 10,000+ | 50,000+ |
| 월간 오가닉 검색 트래픽 | ~0 | 300% 증가 (기준: 런칭 첫 달) | 1,000% 증가 |
| Google AI Overview 인용 | 0회 | ETF 롱테일 쿼리 상위 노출 시작 | 주요 쿼리 안정적 노출 |
| sitemap 크롤링 커버리지 | 0% | 90%+ | 95%+ |
| 도메인 Authority (DA) | 측정 필요 | 유의미한 상승 시작 | DA +10 이상 |
| CAC (고객 획득 비용) | 현재 수준 | 30% 감소 | 50% 감소 |

---

## 10. 리스크 및 완화 방안

| 리스크 | 영향도 | 완화 방안 |
|---|---|---|
| 대량 페이지 생성 → 검색엔진 스팸 판정 | 높음 | 3단계 분산 전략 (메인/서브/백그라운드)으로 자연스러운 구조 유지 |
| SSR/SSG 전환 시 기존 SPA 기능 저하 | 중간 | 하이브리드 렌더링 (인터랙티브 영역은 CSR 유지) |
| AI 피드백 품질 편차 | 중간 | 메인 노출 대상은 품질 점수 기반 필터링, noindex 정책 |
| sitemap 크롤링 지연 | 낮음 | Google Search Console / Naver Webmaster 수동 제출 병행 |
| Slug 충돌/중복 | 낮음 | 유니크 suffix 자동 추가 + DB unique constraint |

---

## 11. Dependencies (의존성)

| 의존성 | 상태 | 비고 |
|---|---|---|
| AI 피드백 생성 엔진 (기존) | 운영 중 | 현재 SPA 내부에서만 사용, API 분리 필요 |
| ETF 시세 데이터 API | 운영 중 | 정적 페이지는 생성 시점 스냅샷 사용 |
| Google Search Console 접근 | 설정 필요 | 사이트 소유권 인증, sitemap 제출 |
| Naver Search Advisor 접근 | 설정 필요 | 네이버 웹마스터 도구 등록 |
| 호스팅/CDN | 검토 필요 | 대량 정적 페이지 서빙을 위한 CDN 구성 |

---

> "우리의 유저들이 곧 최고의 마케터이자 콘텐츠 크리에이터가 됩니다."
>
> 수백 개의 블로그 글을 쓸 필요가 없습니다. 휘발되는 데이터를 영구적인 도서관으로 바꾸는 순간, 성장은 자동으로 따라옵니다.