export interface ETFSummary {
  code: string;
  name: string;
  categories: string[];
  issuer: string;
  price: number;
  changeRate: number;
  aum: number | null;
  expenseRatio: number | null;
  nav: number | null;
  threeMonthEarnRate: number | null;
  oneYearEarnRate: number | null;
  listedDate: string | null;
}

export interface ETFDetail extends ETFSummary {
  benchmark: string;
  listedDate: string;
  holdings: ETFHolding[];
  returns: ETFReturn[];
}

export interface ETFHolding {
  stockCode: string;
  stockName: string;
  weight: number;
}

export interface ETFReturn {
  period: string;
  returnRate: number;
}

export interface ETFDailyPrice {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  nav: number | null;
}

export interface CompareRequest {
  codes: string[];
}

export interface SimulateRequest {
  codes: string[];
  weights: number[];
  amount: number;
  period: string;
  endDate?: string;
}

export interface SimulateResult {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number | null;
  dailyValues: { date: string; value: number }[];
  perEtf: {
    code: string;
    name: string;
    weight: number;
    returnRate: number;
  }[];
}

export type ETFCategory =
  | '국내 대표지수'
  | '해외 대표지수'
  | '섹터/테마'
  | '채권'
  | '원자재'
  | '레버리지/인버스'
  | '혼합'
  | '액티브'
  | 'New';

export type ETFSortBy = 'returnRate1y' | 'returnRate3m' | 'aum';
