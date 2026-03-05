export interface ETFSummary {
  code: string;
  name: string;
  category: string;
  issuer: string;
  price: number;
  changeRate: number;
  aum: number | null;
  expenseRatio: number | null;
  nav: number | null;
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
}

export interface SimulateResult {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
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
  | '국내주식'
  | '해외주식'
  | '채권'
  | '원자재'
  | '부동산'
  | '통화'
  | '레버리지'
  | '인버스'
  | '기타';
