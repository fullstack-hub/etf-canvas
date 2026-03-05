import type { ETFSummary, ETFDetail, ETFDailyPrice, SimulateRequest, SimulateResult } from '@etf-canvas/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  search: (q: string, category?: string) =>
    fetcher<ETFSummary[]>(`/etf/search?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ''}`),
  list: (category?: string) =>
    fetcher<ETFSummary[]>(`/etf/list${category ? `?category=${category}` : ''}`),
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
};
