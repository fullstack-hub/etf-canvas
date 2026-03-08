import type { ETFSummary, ETFDetail, ETFDailyPrice, SimulateRequest, SimulateResult, ETFSortBy } from '@etf-canvas/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// 401 시 토큰 갱신 콜백 (SessionProvider에서 등록)
let _refreshToken: (() => Promise<string | null>) | null = null;
export function setTokenRefresher(fn: () => Promise<string | null>) {
  _refreshToken = fn;
}

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 401 && _refreshToken) {
    const newToken = await _refreshToken();
    if (newToken) {
      const retryHeaders = { ...options?.headers, Authorization: `Bearer ${newToken}` };
      const retry = await fetch(`${API_BASE}${url}`, { ...options, headers: { 'Content-Type': 'application/json', ...retryHeaders } });
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
  // Portfolio
  savePortfolio: (token: string, name: string, items: { code: string; name: string; weight: number; category?: string }[]) =>
    fetcher<{ id: string }>('/portfolio', {
      method: 'POST',
      body: JSON.stringify({ name, items }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  listPortfolios: (token: string, sort?: string) =>
    fetcher<{
      id: string; name: string;
      items: { code: string; name: string; weight: number; category?: string }[];
      snapshot: {
        periods: Record<string, { totalReturn: number; annualizedReturn: number; maxDrawdown: number }>;
        avgVolatility: number;
      } | null;
      returnRate: number | null; mdd: number | null; createdAt: string;
    }[]>(`/portfolio${sort ? `?sort=${sort}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getPortfolioSince: (token: string, id: string) =>
    fetcher<{
      totalReturn: number; annualizedReturn: number; maxDrawdown: number;
      dailyValues: { date: string; value: number }[];
      daysSinceSave: number;
    }>(`/portfolio/${id}/since`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getPortfolioFeedback: (items: { code: string; name: string; weight: number; category: string }[]) =>
    fetcher<{
      feedback: string;
      actions: { category: string; label: string }[];
    }>('/portfolio/feedback', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  deletePortfolio: async (token: string, id: string) => {
    const res = await fetch(`${API_BASE}/portfolio/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json() as Promise<{ ok: boolean }>;
  },

  count: (query?: string, category?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    const qs = params.toString();
    return fetcher<{ total: number; filtered: number }>(`/etf/count${qs ? `?${qs}` : ''}`);
  },
};
