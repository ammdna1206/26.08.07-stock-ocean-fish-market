import dayjs from 'dayjs';
import type { HistoryPoint, MarketSummary, StocksQuery, StockQuote } from '../../../shared/types';
import { MarketDatabase } from '../db';
import { buildDemoQuotes, MockProvider, TpexProvider, TwseProvider } from '../data/provider';
import { directionOf } from '../utils/number';
import { isWeekend, nextBusinessDate, previousBusinessDate } from '../utils/date';

export interface DailyResult {
  tradeDate: string;
  quotes: StockQuote[];
  source: string;
  isDemo: boolean;
  updatedAt: string;
  message: string;
  failureCount: number;
}

export class MarketService {
  private readonly database: MarketDatabase;
  private readonly demo = new MockProvider();
  private readonly official = [new TwseProvider(), new TpexProvider()];

  constructor(database = new MarketDatabase()) {
    this.database = database;
  }

  async getDaily(tradeDate: string): Promise<DailyResult> {
    const cached = this.database.getDaily(tradeDate);
    if (cached) return { ...cached, message: cached.isDemo ? '目前使用示範資料（SQLite 快取）' : '已讀取 SQLite 快取資料', failureCount: 0 };

    const providerMode = (process.env.DATA_PROVIDER ?? 'auto').toLowerCase();
    let result: DailyResult | null = null;
    if (providerMode !== 'demo') {
      const attempts = await Promise.allSettled(this.official.map((provider) => provider.fetchDaily(tradeDate)));
      const successful = attempts.flatMap((attempt) => attempt.status === 'fulfilled' ? [attempt.value] : []);
      const quotes = [...new Map(successful.flatMap((item) => item.quotes).map((quote) => [`${quote.market}:${quote.symbol}`, quote])).values()];
      if (quotes.length >= 5) {
        const source = successful.map((item) => item.source).join('+');
        result = { tradeDate, quotes, source, isDemo: false, updatedAt: dayjs().toISOString(), message: `已取得官方資料，共 ${quotes.length} 檔`, failureCount: attempts.length - successful.length };
      }
    }
    if (!result) {
      const demoResult = await this.demo.fetchDaily(tradeDate);
      result = { tradeDate, quotes: demoResult.quotes, source: 'DEMO', isDemo: true, updatedAt: dayjs().toISOString(), message: '目前使用示範資料（官方資料暫時無法取得）', failureCount: 0 };
    }
    this.database.setDaily(result);
    return result;
  }

  async getDateStatus(tradeDate: string): Promise<{ tradeDate: string; isTradingDay: boolean; previousTradingDay: string; nextTradingDay: string; note: string }> {
    const isTradingDay = !isWeekend(tradeDate);
    const cached = this.database.getDaily(tradeDate);
    return {
      tradeDate, isTradingDay, previousTradingDay: previousBusinessDate(tradeDate), nextTradingDay: nextBusinessDate(tradeDate),
      note: cached ? '此日期已有快取資料' : isTradingDay ? '尚未快取，查詢時將取得資料' : '週末不是台股交易日；國定假日將在查詢時由資料來源判斷',
    };
  }

  filterQuotes(quotes: StockQuote[], query: StocksQuery): StockQuote[] {
    const search = query.search?.trim().toLowerCase();
    const result = quotes.filter((quote) => {
      const change = quote.changePercent ?? 0;
      const matchesMarket = !query.market || query.market === 'ALL' || quote.market === query.market;
      const matchesIndustry = !query.industry || query.industry === 'ALL' || quote.industry === query.industry;
      const matchesDirection = !query.direction || query.direction === 'ALL' || directionOf(change) === query.direction;
      const matchesSearch = !search || quote.symbol.toLowerCase().includes(search) || quote.name.toLowerCase().includes(search);
      return matchesMarket && matchesIndustry && matchesDirection && matchesSearch
        && (query.minVolume === undefined || quote.volume >= query.minVolume)
        && (query.maxVolume === undefined || quote.volume <= query.maxVolume)
        && (query.minChangeRate === undefined || change >= query.minChangeRate)
        && (query.maxChangeRate === undefined || change <= query.maxChangeRate);
    });
    const sort = query.sort ?? 'turnover';
    return result.sort((left, right) => {
      if (sort === 'changeDesc') return (right.changePercent ?? -Infinity) - (left.changePercent ?? -Infinity);
      if (sort === 'changeAsc') return (left.changePercent ?? Infinity) - (right.changePercent ?? Infinity);
      if (sort === 'name') return left.name.localeCompare(right.name, 'zh-Hant');
      if (sort === 'symbol') return left.symbol.localeCompare(right.symbol);
      return right.turnover - left.turnover;
    });
  }

  summary(quotes: StockQuote[], failureCount = 0): MarketSummary {
    const active = quotes.filter((quote) => quote.volume > 0);
    const byChange = (quote: StockQuote) => quote.changePercent ?? 0;
    const group = new Map<string, StockQuote[]>();
    quotes.forEach((quote) => group.set(quote.industry, [...(group.get(quote.industry) ?? []), quote]));
    const industryPerformance = [...group.entries()].map(([industry, items]) => ({ industry, count: items.length, averageChangePercent: Number((items.reduce((total, quote) => total + byChange(quote), 0) / items.length).toFixed(2)) })).sort((a, b) => b.averageChangePercent - a.averageChangePercent);
    const marketComparison = (['TWSE', 'TPEx'] as const).map((market) => {
      const items = quotes.filter((quote) => quote.market === market);
      return { market, total: items.length, averageChangePercent: Number((items.reduce((total, quote) => total + byChange(quote), 0) / Math.max(items.length, 1)).toFixed(2)), turnover: items.reduce((total, quote) => total + quote.turnover, 0) };
    });
    return {
      total: quotes.length, rising: quotes.filter((quote) => byChange(quote) > 0).length, falling: quotes.filter((quote) => byChange(quote) < 0).length,
      flat: quotes.filter((quote) => byChange(quote) === 0 && quote.volume > 0).length, noTrade: quotes.filter((quote) => quote.volume === 0).length,
      totalTurnover: quotes.reduce((total, quote) => total + quote.turnover, 0),
      topVolume: [...active].sort((a, b) => b.volume - a.volume).slice(0, 10), topGainers: [...active].sort((a, b) => byChange(b) - byChange(a)).slice(0, 10), topLosers: [...active].sort((a, b) => byChange(a) - byChange(b)).slice(0, 10),
      industryPerformance, marketComparison, successCount: quotes.length, failureCount,
    };
  }

  async getStock(symbol: string, tradeDate?: string): Promise<{ quote: StockQuote | null; source: string; isDemo: boolean; updatedAt: string; message: string }> {
    const date = tradeDate ?? dayjs().format('YYYY-MM-DD');
    const daily = await this.getDaily(date);
    const quote = daily.quotes.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase()) ?? null;
    return { quote, source: daily.source, isDemo: daily.isDemo, updatedAt: daily.updatedAt, message: quote ? daily.message : '找不到此股票，可能尚未上市或代號格式不同' };
  }

  async getHistory(symbol: string, days: number, tradeDate?: string): Promise<{ points: HistoryPoint[]; source: string; isDemo: boolean; updatedAt: string; message: string }> {
    const safeDays = Math.min(Math.max(days, 5), 60);
    const date = tradeDate ?? dayjs().format('YYYY-MM-DD');
    const key = `${date}:${symbol}:${safeDays}`;
    const cached = this.database.getHistory(key);
    if (cached) return { ...(cached.payload as { points: HistoryPoint[] }), source: cached.source, isDemo: cached.isDemo, updatedAt: cached.updatedAt, message: '已讀取近期走勢快取' };
    const daily = await this.getDaily(date);
    const quote = daily.quotes.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());
    if (!quote) return { points: [], source: daily.source, isDemo: daily.isDemo, updatedAt: daily.updatedAt, message: '找不到此股票的近期走勢' };
    if (!daily.isDemo) return { points: [], source: daily.source, isDemo: false, updatedAt: daily.updatedAt, message: '官方歷史走勢尚未由本平台載入，未虛構數字' };
    const points: HistoryPoint[] = [];
    for (let index = safeDays - 1; index >= 0; index -= 1) {
      const currentDate = dayjs(date).subtract(index, 'day');
      if (currentDate.day() === 0 || currentDate.day() === 6) continue;
      const variation = Math.sin((index + quote.symbol.charCodeAt(0)) * 1.7) * 0.022;
      const close = Number((Math.max(0.01, (quote.close ?? 0) * (1 + variation))).toFixed(2));
      points.push({ tradeDate: currentDate.format('YYYY-MM-DD'), open: Number((close * 0.992).toFixed(2)), high: Number((close * 1.014).toFixed(2)), low: Number((close * 0.985).toFixed(2)), close, volume: Math.round(quote.volume * (0.62 + Math.abs(variation) * 10)) });
    }
    const payload = { points };
    this.database.setHistory(key, payload, 'DEMO', true, dayjs().toISOString());
    return { ...payload, source: 'DEMO', isDemo: true, updatedAt: dayjs().toISOString(), message: '目前使用示範近期走勢' };
  }
}
