export type Market = 'TWSE' | 'TPEx';
export type MarketFilter = Market | 'ALL';
export type Direction = 'UP' | 'DOWN' | 'FLAT';

export interface StockQuote {
  tradeDate: string;
  symbol: string;
  name: string;
  market: Market;
  industry: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  amplitude: number | null;
  volume: number;
  transactionCount: number | null;
  turnover: number;
  peRatio: number | null;
  dividendYield: number | null;
  priceToBookRatio: number | null;
  status?: string;
  source: string;
  updatedAt: string;
}

export interface HistoryPoint {
  tradeDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number;
  turnover?: number;
  transactionCount?: number | null;
  change?: number | null;
}

export interface MarketSummary {
  total: number;
  rising: number;
  falling: number;
  flat: number;
  noTrade: number;
  totalTurnover: number;
  topVolume: StockQuote[];
  topGainers: StockQuote[];
  topLosers: StockQuote[];
  industryPerformance: Array<{ industry: string; averageChangePercent: number; count: number }>;
  marketComparison: Array<{ market: Market; total: number; averageChangePercent: number; turnover: number }>;
  successCount: number;
  failureCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  source: string;
  isDemo: boolean;
  updatedAt: string;
  message: string;
}

export interface StocksQuery {
  market?: MarketFilter;
  industry?: string;
  direction?: Direction | 'ALL';
  minVolume?: number;
  maxVolume?: number;
  minChangeRate?: number;
  maxChangeRate?: number;
  search?: string;
  sort?: string;
  page: number;
  pageSize: number;
}
