import axios from 'axios';
import type { ApiResponse, MarketSummary, StockQuote, HistoryPoint } from '../../shared/types';

const api = axios.create({ baseURL: '/api', timeout: 12_000 });

export interface DateStatus {
  tradeDate: string;
  isTradingDay: boolean;
  previousTradingDay: string;
  nextTradingDay: string;
  note: string;
}

export interface StocksData {
  tradeDate: string;
  stocks: StockQuote[];
  total: number;
  totalBeforeFilter: number;
  industries: string[];
  page: number;
  pageSize: number;
}

export async function getDateStatus(date: string): Promise<ApiResponse<DateStatus>> {
  return (await api.get<ApiResponse<DateStatus>>(`/market/dates/${date}`)).data;
}

export async function getStocks(date: string, params: Record<string, string | number | undefined>): Promise<ApiResponse<StocksData>> {
  return (await api.get<ApiResponse<StocksData>>(`/market/dates/${date}/stocks`, { params })).data;
}

export async function getSummary(date: string): Promise<ApiResponse<MarketSummary>> {
  return (await api.get<ApiResponse<MarketSummary>>(`/market/dates/${date}/summary`)).data;
}

export async function getStock(symbol: string, date: string): Promise<ApiResponse<{ quote: StockQuote | null }>> {
  return (await api.get<ApiResponse<{ quote: StockQuote | null }>>(`/stocks/${symbol}`, { params: { date } })).data;
}

export async function getHistory(symbol: string, date: string, days: number): Promise<ApiResponse<{ points: HistoryPoint[] }>> {
  return (await api.get<ApiResponse<{ points: HistoryPoint[] }>>(`/stocks/${symbol}/history`, { params: { date, days } })).data;
}
