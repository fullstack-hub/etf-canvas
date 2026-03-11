import type { ETFSummary, ETFDetail, ETFDailyPrice, ETFDividend, SimulateRequest, SimulateResult, ETFSortBy } from '@etf-canvas/shared';

export type GalleryPortfolio = {
  name: string;
  slug: string;
  items: { code: string; name: string; weight: number }[];
  returnRate: number | null;
  mdd: number | null;
  sinceReturn?: number | null;
  sinceMdd?: number | null;
  weightedDividendYield?: number | null;
  feedbackSnippet: string | null;
  tags: string[];
  createdAt: string;
};

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
      dividendTotal?: number;
      dividendCount?: number;
    }>(`/portfolio/${id}/since`),
  getPortfolioFeedback: (items: { code: string; name: string; weight: number; category: string }[]) =>
    fetcher<{
      feedback: string;
      actions: { category: string; label: string }[];
      tags: string[];
      snippet: string;
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
  getTopPortfolios: (limit = 20, sort: 'latest' | 'return' | 'mdd' | 'dividend' = 'latest') =>
    fetcher<GalleryPortfolio[]>(`/portfolio/public/top?limit=${limit}&sort=${sort}`),

  getPublicSince: (slug: string) =>
    fetcher<{
      totalReturn: number; annualizedReturn: number; maxDrawdown: number;
      dailyValues: { date: string; value: number }[];
      daysSinceSave: number;
      basisLabel?: string;
      basisDate?: string;
      message?: string;
      dividendTotal?: number;
      dividendCount?: number;
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

  // User
  getMe: () =>
    fetcher<{
      id: string;
      keycloakId: string;
      nickname: string | null;
      name: string | null;
      phone: string | null;
      age: string | null;
      gender: string | null;
      investExp: string | null;
      investStyle: string | null;
      showAge: boolean;
      showGender: boolean;
      showInvestExp: boolean;
      showInvestStyle: boolean;
      thirdPartyConsent: boolean;
      provider: string | null;
      createdAt: string;
    }>('/user/me'),

  updateMe: (data: Record<string, string | boolean | null>) =>
    fetcher<{ ok: boolean }>('/user/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  withdrawMe: () =>
    fetcher<{ ok: boolean }>('/user/me', { method: 'DELETE' }),

  // Community
  communityCategories: () =>
    fetcher<{ id: number; slug: string; name: string }[]>('/community/categories'),

  communityPosts: (params: { page?: number; limit?: number; sort?: 'latest' | 'popular'; categoryId?: number }) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.sort) sp.set('sort', params.sort);
    if (params.categoryId) sp.set('categoryId', String(params.categoryId));
    return fetcher<{ posts: CommunityPost[]; total: number; page: number; totalPages: number }>(`/community/posts?${sp}`);
  },

  communityWeeklyBest: (limit = 5) =>
    fetcher<CommunityPost[]>(`/community/posts/weekly-best?limit=${limit}`),

  communityPost: (id: string) =>
    fetcher<CommunityPostDetail>(`/community/posts/${id}`),

  communityCreatePost: (data: { title: string; content: string; portfolioId?: string }) =>
    fetcher<CommunityPostDetail>('/community/posts', { method: 'POST', body: JSON.stringify(data) }),

  communityUpdatePost: (id: string, data: { title?: string; content?: string }) =>
    fetcher<CommunityPostDetail>(`/community/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  communityDeletePost: (id: string) =>
    fetcher<{ ok: boolean }>(`/community/posts/${id}`, { method: 'DELETE' }),

  communityToggleLike: (id: string) =>
    fetcher<{ liked: boolean }>(`/community/posts/${id}/like`, { method: 'POST' }),

  communityComments: (postId: string) =>
    fetcher<CommunityComment[]>(`/community/posts/${postId}/comments`),

  communityCreateComment: (postId: string, data: { content: string; parentId?: string }) =>
    fetcher<CommunityComment>(`/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) }),

  communityDeleteComment: (id: string) =>
    fetcher<{ ok: boolean }>(`/community/comments/${id}`, { method: 'DELETE' }),

  communityToggleCommentLike: (id: string) =>
    fetcher<{ liked: boolean }>(`/community/comments/${id}/like`, { method: 'POST' }),
};

// Community types
export interface CommunityPost {
  id: string;
  title: string;
  contentPreview: string;
  portfolioId: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  author: { nickname: string; investExp?: string; investStyle?: string; showInvestExp?: boolean; showInvestStyle?: boolean };
  category: { slug: string; name: string };
}

export interface CommunityPostDetail extends Omit<CommunityPost, 'contentPreview'> {
  content: string;
  liked: boolean;
  author: CommunityPost['author'] & { keycloakId: string };
  portfolio: { name: string; slug: string; items: { code: string; name: string; weight: number }[]; returnRate: number | null; tags: string[] } | null;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  likeCount: number;
  replyCount: number;
  isDeleted: boolean;
  liked: boolean;
  createdAt: string;
  author: { keycloakId: string; nickname: string; investExp?: string; investStyle?: string; showInvestExp?: boolean; showInvestStyle?: boolean };
  replies?: CommunityComment[];
}
