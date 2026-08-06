import axios from 'axios';
import dayjs from 'dayjs';
import type { ApiResponse, MarketSummary, StockQuote, HistoryPoint, StocksQuery } from '../../shared/types';
import { buildStaticDemoQuotes, buildStaticHistory, normalizeStaticDate } from './static-demo';

const staticDemoMode = import.meta.env.VITE_STATIC_DEMO === 'true';
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', timeout: 12_000 });

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

function demoResponse<T>(data: T, message: string): ApiResponse<T> {
  return { success: true, data, source: 'DEMO', isDemo: true, updatedAt: new Date().toISOString(), message };
}

function demoDateStatus(date: string): DateStatus {
  const tradeDate = normalizeStaticDate(date);
  const parsed = dayjs(tradeDate);
  const isTradingDay = parsed.isValid() && parsed.day() !== 0 && parsed.day() !== 6;
  return { tradeDate, isTradingDay, previousTradingDay: parsed.subtract(parsed.day() === 1 ? 3 : 1, 'day').format('YYYY-MM-DD'), nextTradingDay: parsed.add(parsed.day() === 5 ? 3 : 1, 'day').format('YYYY-MM-DD'), note: isTradingDay ? '公開示範頁使用內建示範資料' : '週末不是台股交易日' };
}

function demoStocks(date: string, params: Record<string, string | number | undefined>): StocksData {
  const quotes = buildStaticDemoQuotes(normalizeStaticDate(date));
  const query = params as StocksQuery;
  const search = String(query.search ?? '').trim().toLowerCase();
  const filtered = quotes.filter((quote) => {
    const change = quote.changePercent ?? 0;
    const marketMatch = !query.market || query.market === 'ALL' || quote.market === query.market;
    const industryMatch = !query.industry || query.industry === 'ALL' || quote.industry === query.industry;
    const directionMatch = !query.direction || query.direction === 'ALL' || (change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'FLAT') === query.direction;
    const searchMatch = !search || quote.symbol.toLowerCase().includes(search) || quote.name.toLowerCase().includes(search);
    return marketMatch && industryMatch && directionMatch && searchMatch
      && (query.minVolume === undefined || quote.volume >= Number(query.minVolume))
      && (query.maxVolume === undefined || quote.volume <= Number(query.maxVolume))
      && (query.minChangeRate === undefined || change >= Number(query.minChangeRate))
      && (query.maxChangeRate === undefined || change <= Number(query.maxChangeRate));
  });
  const sort = query.sort ?? 'turnover';
  filtered.sort((left, right) => sort === 'changeDesc' ? (right.changePercent ?? -Infinity) - (left.changePercent ?? -Infinity) : sort === 'changeAsc' ? (left.changePercent ?? Infinity) - (right.changePercent ?? Infinity) : sort === 'name' ? left.name.localeCompare(right.name, 'zh-Hant') : sort === 'symbol' ? left.symbol.localeCompare(right.symbol) : right.turnover - left.turnover);
  const page = Number(query.page) || 1;
  const pageSize = Number(query.pageSize) || 180;
  return { tradeDate: normalizeStaticDate(date), stocks: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, totalBeforeFilter: quotes.length, industries: [...new Set(quotes.map((quote) => quote.industry))].sort(), page, pageSize };
}

function demoSummary(quotes: StockQuote[]): MarketSummary {
  const change = (quote: StockQuote) => quote.changePercent ?? 0;
  const active = quotes.filter((quote) => quote.volume > 0);
  const groups = new Map<string, StockQuote[]>();
  quotes.forEach((quote) => groups.set(quote.industry, [...(groups.get(quote.industry) ?? []), quote]));
  const industryPerformance = [...groups.entries()].map(([industry, items]) => ({ industry, count: items.length, averageChangePercent: Number((items.reduce((sum, item) => sum + change(item), 0) / items.length).toFixed(2)) })).sort((left, right) => right.averageChangePercent - left.averageChangePercent);
  const marketComparison = (['TWSE', 'TPEx'] as const).map((market) => { const items = quotes.filter((quote) => quote.market === market); return { market, total: items.length, averageChangePercent: Number((items.reduce((sum, item) => sum + change(item), 0) / Math.max(items.length, 1)).toFixed(2)), turnover: items.reduce((sum, item) => sum + item.turnover, 0) }; });
  return { total: quotes.length, rising: quotes.filter((quote) => change(quote) > 0).length, falling: quotes.filter((quote) => change(quote) < 0).length, flat: quotes.filter((quote) => change(quote) === 0 && quote.volume > 0).length, noTrade: quotes.filter((quote) => quote.volume === 0).length, totalTurnover: quotes.reduce((sum, quote) => sum + quote.turnover, 0), topVolume: [...active].sort((left, right) => right.volume - left.volume).slice(0, 10), topGainers: [...active].sort((left, right) => change(right) - change(left)).slice(0, 10), topLosers: [...active].sort((left, right) => change(left) - change(right)).slice(0, 10), industryPerformance, marketComparison, successCount: quotes.length, failureCount: 0 };
}

export async function getDateStatus(date: string): Promise<ApiResponse<DateStatus>> {
  if (staticDemoMode) return demoResponse(demoDateStatus(date), '公開網址目前使用內建示範資料');
  return (await api.get<ApiResponse<DateStatus>>(`/market/dates/${date}`)).data;
}

export async function getStocks(date: string, params: Record<string, string | number | undefined>): Promise<ApiResponse<StocksData>> {
  if (staticDemoMode) return demoResponse(demoStocks(date, params), '公開網址目前使用內建示範資料');
  return (await api.get<ApiResponse<StocksData>>(`/market/dates/${date}/stocks`, { params })).data;
}

export async function getSummary(date: string): Promise<ApiResponse<MarketSummary>> {
  if (staticDemoMode) return demoResponse(demoSummary(buildStaticDemoQuotes(normalizeStaticDate(date))), '公開網址目前使用內建示範資料');
  return (await api.get<ApiResponse<MarketSummary>>(`/market/dates/${date}/summary`)).data;
}

export async function getStock(symbol: string, date: string): Promise<ApiResponse<{ quote: StockQuote | null }>> {
  if (staticDemoMode) return demoResponse({ quote: buildStaticDemoQuotes(normalizeStaticDate(date)).find((quote) => quote.symbol.toLowerCase() === symbol.toLowerCase()) ?? null }, '公開網址目前使用內建示範資料');
  return (await api.get<ApiResponse<{ quote: StockQuote | null }>>(`/stocks/${symbol}`, { params: { date } })).data;
}

export async function getHistory(symbol: string, date: string, days: number): Promise<ApiResponse<{ points: HistoryPoint[] }>> {
  if (staticDemoMode) {
    const quote = buildStaticDemoQuotes(normalizeStaticDate(date)).find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());
    return demoResponse({ points: quote ? buildStaticHistory(quote, normalizeStaticDate(date), Math.min(Math.max(days, 5), 60)) : [] }, '公開網址目前使用內建示範近期走勢');
  }
  return (await api.get<ApiResponse<{ points: HistoryPoint[] }>>(`/stocks/${symbol}/history`, { params: { date, days } })).data;
}
