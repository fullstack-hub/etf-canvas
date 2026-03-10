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
