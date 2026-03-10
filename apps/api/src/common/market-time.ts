/**
 * 한국 주식시장 시간 기반 유틸리티
 *
 * 장 마감: 15:30 KST, 종가 확정: ~16:00 KST
 * 시딩 크론 + 조회 cutoff 모두 16:00 KST 통일
 * - 16시 전: 전거래일 종가 기준 (장중/장 전)
 * - 16시 후: 당일 종가 확정
 */

const DATA_CUTOFF_HOUR_KST = 16; // 장 마감 후 종가 확정 시각

function kstNow(): Date {
  return new Date(Date.now() + 9 * 3600_000);
}

export interface MarketDataCutoff {
  /** DB 쿼리에 사용: date < cutoffDate */
  cutoffDate: Date;
  /** 캐시 키 suffix: "2026-03-10:pre" 또는 "2026-03-10:post" */
  cacheKey: string;
  /** 사용자에게 표시할 기준 날짜 문자열 (YYYY-MM-DD) */
  basisDate: string;
  /** "어제 종가 기준" 또는 "오늘 종가 기준" */
  basisLabel: string;
  /** 다음 상태 전환까지 남은 초 (캐시 TTL) */
  ttl: number;
  /** 18시 이후 여부 */
  isPostClose: boolean;
}

/**
 * 현재 시각 기준 시세 데이터 경계 계산
 *
 * - 18시 전: cutoff = 오늘(KST) → date < today → 어제까지 포함
 * - 18시 후: cutoff = 내일(KST) → date < tomorrow → 오늘까지 포함
 */
export function getMarketDataCutoff(): MarketDataCutoff {
  const now = Date.now();
  const kst = kstNow();
  const kstHour = kst.getUTCHours();
  const kstTodayStr = kst.toISOString().slice(0, 10);
  const isPostClose = kstHour >= DATA_CUTOFF_HOUR_KST;

  if (isPostClose) {
    // 18시 후: 오늘 종가 포함
    const tomorrowDate = new Date(kstTodayStr + 'T00:00:00.000Z');
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);

    // 어제(KST) 날짜: 마지막 거래일 찾기는 복잡하므로 오늘을 기준일로 표시
    // TTL: KST 자정까지 (자정에 todayStr이 바뀌므로 캐시 키 자동 갱신)
    const kstMidnight = new Date(kstTodayStr + 'T00:00:00.000Z');
    kstMidnight.setUTCDate(kstMidnight.getUTCDate() + 1);
    const midnightUtc = kstMidnight.getTime() - 9 * 3600_000;

    return {
      cutoffDate: tomorrowDate,
      cacheKey: `${kstTodayStr}:post`,
      basisDate: kstTodayStr,
      basisLabel: '오늘 종가 기준',
      ttl: Math.max(60, Math.floor((midnightUtc - now) / 1000)),
      isPostClose: true,
    };
  } else {
    // 18시 전: 어제 종가까지만
    const todayDate = new Date(kstTodayStr + 'T00:00:00.000Z');

    // 어제(KST) 날짜
    const yesterdayKst = new Date(kst.getTime() - 86400_000);
    const yesterdayStr = yesterdayKst.toISOString().slice(0, 10);

    // TTL: 18시(KST)까지
    const cutoffTime = new Date(kstTodayStr + 'T00:00:00.000Z');
    cutoffTime.setUTCHours(DATA_CUTOFF_HOUR_KST);
    const cutoffUtc = cutoffTime.getTime() - 9 * 3600_000;

    return {
      cutoffDate: todayDate,
      cacheKey: `${kstTodayStr}:pre`,
      basisDate: yesterdayStr,
      basisLabel: '어제 종가 기준',
      ttl: Math.max(60, Math.floor((cutoffUtc - now) / 1000)),
      isPostClose: false,
    };
  }
}

/** Naver fetch 시 저장할 데이터의 날짜 필터 (당일 미확정 데이터 제외) */
export function getNaverFetchCutoffDate(): string {
  const kst = kstNow();
  const kstHour = kst.getUTCHours();
  const kstTodayStr = kst.toISOString().slice(0, 10);

  if (kstHour >= DATA_CUTOFF_HOUR_KST) {
    // 18시 후: 오늘 데이터 포함 → 내일 날짜를 cutoff으로
    const tomorrow = new Date(kstTodayStr + 'T00:00:00.000Z');
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }
  // 18시 전: 오늘 데이터 제외
  return kstTodayStr;
}
