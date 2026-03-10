import { Injectable, Logger } from '@nestjs/common';

const GEMINI_PRIMARY = 'gemini-3-flash-preview';
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash';
const makeUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const MAX_NAME_LEN = 100;

export interface FeedbackResult {
  feedback: string;
  actions: { category: string; label: string }[];
  tags: string[];
  snippet: string;
}

const VALID_CATEGORIES = [
  '국내 대표지수', '해외 대표지수', '섹터/테마', '액티브',
  '채권', '혼합', '원자재', '레버리지/인버스',
];

export const FALLBACK_MSG = '피드백을 생성할 수 없어요.';
const FALLBACK: FeedbackResult = { feedback: FALLBACK_MSG, actions: [], tags: [], snippet: '' };

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY || '';

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async analyzeFeedback(
    items: { code: string; name: string; weight: number; category: string }[],
    marketContext?: { kospi1w: number; sp5001w: number; usdkrw: number; gold1w: number },
  ): Promise<FeedbackResult> {
    if (!this.isAvailable()) return FALLBACK;

    // 입력 sanitize
    const sanitized = items.slice(0, 20).map((i) => ({
      name: String(i.name || '').slice(0, MAX_NAME_LEN),
      category: VALID_CATEGORIES.includes(i.category) ? i.category : '',
      weight: Math.max(0, Math.min(100, Number(i.weight) || 0)),
    }));

    const marketSection = marketContext
      ? `\n현재 시장 상황 (최근 1주 수익률):
- 코스피: ${marketContext.kospi1w > 0 ? '+' : ''}${marketContext.kospi1w.toFixed(2)}%
- S&P500: ${marketContext.sp5001w > 0 ? '+' : ''}${marketContext.sp5001w.toFixed(2)}%
- 금: ${marketContext.gold1w > 0 ? '+' : ''}${marketContext.gold1w.toFixed(2)}%
- 환율(USD/KRW): ${marketContext.usdkrw.toLocaleString()}원\n`
      : '';

    const prompt = `너는 ETF 포트폴리오 구성을 분석하는 정보 제공 도우미야.
절대 특정 종목을 추천하거나 매수/매도를 권유하지 마.
"~할 수 있어요", "~를 고려해볼 수 있어요" 같은 해요체 비권유 표현만 사용해.
"~하세요", "~해야 합니다", "~됩니다", "~습니다" 같은 격식체/지시 표현은 금지.
반드시 해요체로 답변해. (예: "~있어요", "~이에요", "~할 수 있어요", "~보여요")

사용자의 포트폴리오:
${JSON.stringify(sanitized)}
${marketSection}
카테고리 목록: ${VALID_CATEGORIES.join(', ')}

분석 기준:
- 카테고리 분산도 (편중 여부)
- 비중 균형
- 현재 시장 상황을 고려한 포트폴리오 구성 적절성
- 구성이 균형 잡혀 있으면 긍정적 피드백을 주고, actions는 빈 배열로 반환

JSON으로만 응답해:
{
  "feedback": "3~5문장 한국어 피드백 (포트폴리오 구성 분석 + 현재 시장 상황과의 관계)",
  "actions": [{ "category": "정확한 카테고리명", "label": "{카테고리명} ETF 조회하기" }],
  "tags": ["고배당", "미국주식", "성장주"],
  "snippet": "이 포트폴리오의 핵심 특징을 1문장으로 요약"
}
tags 규칙: 투자전략(고배당, 성장주, 인컴), 지역(미국주식, 국내, 일본), 자산(채권, 금, 원자재), 테마(AI, 반도체, 인플레이션방어) 중 2~5개
snippet 규칙: 검색엔진 노출용 1줄 요약, 50자 내외`;

    for (const model of [GEMINI_PRIMARY, GEMINI_FALLBACK_MODEL]) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(makeUrl(model), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
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
          this.logger.warn(`Gemini API error (${model}): ${res.status}`);
          continue;
        }

        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) continue;

        const raw = JSON.parse(text);
        if (typeof raw.feedback !== 'string') continue;
        const parsed: FeedbackResult = {
          feedback: raw.feedback,
          actions: (Array.isArray(raw.actions) ? raw.actions : []).filter(
            (a: any) => typeof a?.category === 'string' && VALID_CATEGORIES.includes(a.category) && typeof a?.label === 'string' && a.label,
          ),
          tags: (Array.isArray(raw.tags) ? raw.tags : []).filter((t: any) => typeof t === 'string').slice(0, 5),
          snippet: typeof raw.snippet === 'string' ? raw.snippet.slice(0, 100) : '',
        };

        return parsed;
      } catch (e) {
        this.logger.warn(`Gemini feedback failed (${model}): ${e}`);
        continue;
      }
    }
    return FALLBACK;
  }
}
