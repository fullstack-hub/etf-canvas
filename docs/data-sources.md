# ETF Canvas 데이터 소스 정리

## 1. 네이버 금융 ETF API (전종목 일괄 조회)

### 엔드포인트

```
GET https://finance.naver.com/api/sise/etfItemList.nhn
  ?etfType={0-7}
  &targetColumn=market_sum
  &sortOrder=desc
```

- 인증 불필요, User-Agent 헤더만 필요
- 응답 인코딩: EUC-KR
- etfType=0 → 전체 (1,072개, 2026-03-05 기준)

### 응답 필드

| 필드 | 의미 | 예시 |
|------|------|------|
| itemcode | 종목코드 | "069500" |
| etfTabCode | **카테고리 코드** | 1 |
| itemname | 종목명 | "KODEX 200" |
| nowVal | 현재가 | 83570 |
| changeVal | 전일대비 | 7670 |
| changeRate | 등락률(%) | 10.11 |
| nav | NAV | 83712.0 |
| threeMonthEarnRate | **3개월 수익률(%)** | 32.9479 |
| quant | 거래량 | 38259613 |
| amonut | 거래대금(백만원) | 3231927 |
| marketSum | **AUM/시가총액(억원)** | 177921 |

### etfTabCode 카테고리 매핑

| etfTabCode | 개수 | 유형 | 기획서 카테고리 | 예시 |
|------------|------|------|----------------|------|
| 1 | 90 | 국내 시장지수 | **주식** | KODEX 200, TIGER MSCI Korea |
| 2 | 289 | 국내 섹터/테마 | **테마** | 반도체, 삼성그룹, 고배당 |
| 3 | 38 | 레버리지/인버스 | **레버리지&인버스** | KODEX 레버리지, 인버스2X |
| 4 | 363 | 해외주식 | (주식 또는 별도) | 미국S&P500, 나스닥100 |
| 5 | 21 | 원자재 | **원자재** | KRX금현물, 은선물 |
| 6 | 169 | 채권 | **채권** | CD금리, 종합채권 |
| 7 | 102 | 혼합/기타 | (채권 또는 기타) | 머니마켓, 채권혼합 |

- **운용사** 카테고리: etfTabCode가 아닌 종목명 prefix로 필터 (KODEX, TIGER, KINDEX, ACE 등)
- etfType 파라미터 = etfTabCode와 동일 값. etfType=1로 호출하면 국내시장지수만 반환.

### 활용 방안

- 하루 1회 배치 시딩 (장 마감 후)
- 카테고리, AUM, 3개월수익률, 현재가, 등락률 일괄 수집
- Rate limit 없음 (1회 호출로 전종목)


## 2. 키움 REST API

### ka40004 — ETF 전체시세 (전종목 일괄)

```
POST /api/dostk/etf
api-id: ka40004
```

필수 파라미터:
```json
{
  "txon_type": "0",
  "navpre": "0",
  "mngmcomp": "0000",
  "txon_yn": "0",
  "trace_idex": "0",
  "stex_tp": "1"
}
```

- 페이지네이션 필요 (100개씩, `httpClient.requestAll` 사용 → mergeKey: `etfall_mrpr`)
- 전종목 1,073개 (2026-03-05 기준)

응답 필드:
| 필드 | 의미 |
|------|------|
| stk_cd | 종목코드 |
| stk_cls | 종목분류 (아래 참고) |
| stk_nm | 종목명 |
| close_pric | 종가 |
| pre_rt | 등락률 |
| trde_qty | 거래량 |
| nav | NAV |
| trace_idex_nm | 추적지수명 |
| trace_idex_cd | 추적지수코드 (모의투자에서는 빈값) |
| drng | 배수 (레버리지 등) |

stk_cls 종목분류 (공식 정의 없음, 실데이터 기반 추정):
| stk_cls | 개수 | 추정 의미 |
|---------|------|----------|
| 19 | 272 | 국내주식형 |
| 20 | 763 | 기타/혼합 (해외, 채권, 원자재 등) |
| 22 | 13 | 리츠/부동산 |
| 23 | 21 | 해외지수 패시브 |
| 11 | 2 | 해외합성 (거래정지급) |
| 14 | 2 | 기타 |

mngmcomp (운용사 필터):
- 0000:전체, 3020:KODEX(삼성), 3027:KOSEF(키움), 3191:TIGER(미래에셋)
- 3228:KINDEX(한국투자), 3023:KStar(KB), 3022:아리랑(한화), 9999:기타

### ka40001 — ETF 수익률 (종목별 개별)

```
POST /api/dostk/etf
api-id: ka40001
Body: { "stk_cd": "069500", "etfobjt_idex_cd": "207", "dt": "3" }
```

- etfobjt_idex_cd: 추적지수코드 (ka40004에서 빈값이면 ka40007에서 획득 가능)
- dt: 0=1주, 1=1달, 2=6개월, 3=1년
- Rate limit: 초당 5회, 시간당 1,000회

### ka40002 — ETF 종목정보 (종목별 개별)

응답이 매우 제한적: stk_nm, etfobjt_idex_nm, wonju_pric, etftxon_type 정도만.

### ka40003 — ETF 일별추이 (종목별 개별)

일별 OHLCV 데이터. 개별 ETF 차트에 사용.

### ka40007 — ETF 시간대별체결 (종목별 개별)

`etfobjt_idex_cd` (추적지수코드)를 얻을 수 있음 → ka40001 호출 시 필요.


## 3. 데이터 수집 전략 (권장)

### 배치 시딩 (하루 1회, 장 마감 후)

1. **네이버 금융 API** 1회 호출 → 전종목 카테고리 + AUM + 3개월수익률 + 현재가 + 등락률
2. DB에 upsert (etfTabCode → category 매핑)

### On-demand (사용자 요청 시)

1. ETF 상세 → **키움 ka40003** (일별시세), ka40002 (기본정보)
2. Redis 캐싱 (TTL: 시세 300초, 상세 600초)

### 카테고리 소스

- **네이버 etfTabCode** (권장): 1=주식, 2=테마, 3=레버리지&인버스, 4=해외, 5=원자재, 6=채권, 7=혼합
- 키움 stk_cls: 분류가 너무 넓어서 단독 사용 불가

### 정렬 기준

- **수익률순**: 네이버 `threeMonthEarnRate` (3개월) 또는 키움 ka40001 (기간별, 개별호출)
- **AUM순**: 네이버 `marketSum`
