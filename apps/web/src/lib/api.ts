import type { ETFSummary, ETFDetail, ETFDailyPrice, ETFDividend, SimulateRequest, SimulateResult, ETFSortBy } from '@etf-canvas/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// 토큰 getter/refresher (SessionProvider에서 등록)
let _getToken: (() => string | null) | null = null;
let _refreshToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => string | null) {
  _getToken = fn;
}
export function setTokenRefresher(fn: () => Promise<string | null>) {
  _refreshToken = fn;
}

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const token = _getToken?.();
  const headers: Record<string, string> = {
    ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    ...options?.headers as Record<string, string>,
  };
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (res.status === 401 && _refreshToken) {
    const newToken = await _refreshToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(`${API_BASE}${url}`, { ...options, headers });
      if (!retry.ok) throw new Error(`API Error: ${retry.status}`);
      return retry.json();
    }
  }
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  search: (q: string, category?: string, sort?: ETFSortBy, offset = 0, limit = 30) =>
    fetcher<ETFSummary[]>(`/etf/search?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ''}${sort ? `&sort=${sort}` : ''}&offset=${offset}&limit=${limit}`),
  list: (category?: string, sort?: ETFSortBy, offset = 0, limit = 30) =>
    fetcher<ETFSummary[]>(`/etf/list?${category ? `category=${category}&` : ''}${sort ? `sort=${sort}&` : ''}offset=${offset}&limit=${limit}`),
  listByBenchmark: (benchmark: string, sort?: ETFSortBy) =>
    fetcher<ETFSummary[]>(`/etf/list?benchmark=${encodeURIComponent(benchmark)}${sort ? `&sort=${sort}` : ''}`),
  getDetail: (code: string) =>
    fetcher<ETFDetail>(`/etf/${code}`),
  getDailyPrices: (code: string, period = '1y') =>
    fetcher<ETFDailyPrice[]>(`/etf/${code}/prices?period=${period}`),
  getDividends: (code: string) =>
    fetcher<ETFDividend[]>(`/etf/${code}/dividends`),
  compare: (codes: string[]) =>
    fetcher<ETFDetail[]>('/etf/compare', {
      method: 'POST',
      body: JSON.stringify({ codes }),
    }),
  simulate: (req: SimulateRequest) =>
    fetcher<SimulateResult>('/etf/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  // Portfolio (인증은 fetcher가 자동 처리)
  savePortfolio: (name: string, items: { code: string; name: string; weight: number; category?: string }[], feedback?: { feedback: string; actions: { category: string; label: string }[]; tags: string[]; snippet: string } | null, totalAmount?: number) =>
    fetcher<{ id: string; slug: string }>('/portfolio', {
      method: 'POST',
      body: JSON.stringify({ name, items, feedback: feedback || null, totalAmount }),
    }),
  listPortfolios: (sort?: string) =>
    fetcher<{
      id: string; name: string;
      items: { code: string; name: string; weight: number; category?: string }[];
      snapshot: {
        periods: Record<string, { totalReturn: number; annualizedReturn: number; maxDrawdown: number }>;
        avgVolatility: number;
      } | null;
      returnRate: number | null; mdd: number | null;
      totalAmount: number;
      feedbackText: string | null; feedbackActions: { category: string; label: string }[] | null;
      createdAt: string;
    }[]>(`/portfolio${sort ? `?sort=${sort}` : ''}`),
  getPortfolioSince: (id: string) =>
    fetcher<{
      totalReturn: number; annualizedReturn: number; maxDrawdown: number;
      dailyValues: { date: string; value: number }[];
      daysSinceSave: number;
      basisLabel?: string;
      basisDate?: string;
      message?: string;
    }>(`/portfolio/${id}/since`),
  getPortfolioFeedback: (items: { code: string; name: string; weight: number; category: string }[]) =>
    fetcher<{
      feedback: string;
      actions: { category: string; label: string }[];
    }>('/portfolio/feedback', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  renamePortfolio: (id: string, name: string) =>
    fetcher<{ id: string; name: string }>(`/portfolio/${id}/name`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  deletePortfolio: (id: string) =>
    fetcher<{ ok: boolean }>(`/portfolio/${id}`, {
      method: 'DELETE',
    }),
  autoSavePortfolio: (items: { code: string; name: string; weight: number; category?: string }[], feedback: { feedback: string; actions: { category: string; label: string }[]; tags: string[]; snippet: string } | null, totalAmount?: number) =>
    fetcher<{ id: string; slug: string }>('/portfolio/auto-save', {
      method: 'POST',
      body: JSON.stringify({ items, feedback, totalAmount }),
    }),

  // Public (인증 불필요)
  getTopPortfolios: (limit = 20, sort: 'latest' | 'return' | 'mdd' = 'latest') =>
    fetcher<{
      name: string;
      slug: string;
      items: { code: string; name: string; weight: number }[];
      returnRate: number | null;
      mdd: number | null;
      sinceReturn?: number | null;
      sinceMdd?: number | null;
      feedbackSnippet: string | null;
      tags: string[];
      createdAt: string;
    }[]>(`/portfolio/public/top?limit=${limit}&sort=${sort}`),

  getPublicSince: (slug: string) =>
    fetcher<{
      totalReturn: number; annualizedReturn: number; maxDrawdown: number;
      dailyValues: { date: string; value: number }[];
      daysSinceSave: number;
      basisLabel?: string;
      basisDate?: string;
      message?: string;
    }>(`/portfolio/public/${slug}/since`),

  getPortfolioTags: () =>
    fetcher<{ tag: string; count: number }[]>('/portfolio/public/tags'),

  getPortfoliosByTag: (tag: string) =>
    fetcher<{
      name: string;
      slug: string;
      items: { code: string; name: string; weight: number }[];
      returnRate: number | null;
      feedbackSnippet: string | null;
      tags: string[];
      createdAt: string;
    }[]>(`/portfolio/public/by-tag/${encodeURIComponent(tag)}`),

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
      totalAmount: number;
      createdAt: string;
    }>(`/portfolio/public/${slug}`),

  count: (query?: string, category?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    const qs = params.toString();
    return fetcher<{ total: number; filtered: number }>(`/etf/count${qs ? `?${qs}` : ''}`);
  },
};
