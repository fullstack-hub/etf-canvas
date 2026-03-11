/**
 * 포트폴리오 slug 생성: ETF 종목코드 상위 3개(비중순) kebab-case
 * 예: kodex200-tiger-sp500-gold
 *
 * 중복 시 숫자 suffix: kodex200-sp500-gold-2
 */
export function generateSlug(
  items: { code: string; weight: number }[],
): string {
  const top3 = [...items]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  return top3
    .map((item) =>
      item.code
        .replace(/[^\w]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase(),
    )
    .filter(Boolean)
    .join('-');
}

/**
 * DB에서 중복 slug 확인 후 고유 slug 반환
 * 중복이면 -2, -3 ... suffix 추가
 */
export async function resolveUniqueSlug(
  baseSlug: string,
  existsFn: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await existsFn(baseSlug))) return baseSlug;

  let suffix = 2;
  while (suffix <= 1000) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!(await existsFn(candidate))) return candidate;
    suffix++;
  }

  // 극단적 fallback
  return `${baseSlug}-${Date.now()}`;
}
