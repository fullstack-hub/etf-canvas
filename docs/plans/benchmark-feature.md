# 벤치마크 지수 비교 기능

## 데이터 소스 (검증 완료)
- **국내 지수**: 네이버 `siseJson.naver` API
  - KOSPI: `symbol=KOSPI`
  - KOSPI 200: `symbol=KPI200`
  - 응답: `[["20260102", 시가, 고가, 저가, 종가, 거래량, 외국인소진율], ...]`
- **해외 지수**: Yahoo Finance API
  - S&P 500: `^GSPC` (`/v8/finance/chart/%5EGSPC?interval=1d&range=3mo`)
  - NASDAQ: `^IXIC`
  - 응답: JSON, `chart.result[0].indicators.quote[0].close[]` + `chart.result[0].timestamp[]`

## 벤치마크 이름 → 심볼 매핑
| DB benchmark 값 | 네이버 심볼 | Yahoo 심볼 | 소스 |
|---|---|---|---|
| KOSPI | KOSPI | - | naver |
| KOSPI 200 | KPI200 | - | naver |
| S&P 500 | - | ^GSPC | yahoo |
| NASDAQ 100 | - | ^NDX | yahoo |
| NASDAQ Composite | - | ^IXIC | yahoo |

## TODO

### API (`apps/api`)
- [ ] 벤치마크 이름 → 심볼 매핑 테이블 (naver.service.ts 또는 별도)
- [ ] `fetchIndexPrices(symbol, source, days)`: 지수 시계열 fetch
  - naver: 기존 `fetchDailyPrices`와 동일 포맷
  - yahoo: `/v8/finance/chart/{symbol}?interval=1d&range={range}` 파싱
- [ ] `simulate` 확장: 포트폴리오 ETF들의 benchmark 중 대표 선정 → 지수 시계열 포함 반환
- [ ] Redis 캐싱 (지수 시계열도 86400초)

### Shared (`packages/shared`)
- [ ] `SimulateResult` 확장:
  ```ts
  benchmarkName: string;
  benchmarkReturn: number;
  benchmarkDailyValues: { date: string; value: number }[];
  ```

### Frontend (`apps/web`)
- [ ] 성장추이 차트에 벤치마크 라인 추가 (점선)
- [ ] 수익률 카드에 "Benchmark +XX%" 서브라벨
- [ ] 범례에 벤치마크 항목 추가
