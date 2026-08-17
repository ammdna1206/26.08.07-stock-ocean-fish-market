import { describe, expect, it } from 'vitest';
import type { StockQuote } from '../../../shared/types';
import { canUseDailyCache, MarketService } from './market-service';

function quote(symbol: string, market: 'TWSE' | 'TPEx', turnover: number): StockQuote {
  return {
    tradeDate: '2026-08-14', symbol, name: symbol, market, industry: '測試', open: 10, high: 10, low: 10, close: 10,
    previousClose: 10, change: 0, changePercent: 0, amplitude: 0, volume: 100, transactionCount: 1, turnover,
    peRatio: null, dividendYield: null, priceToBookRatio: null, source: market, updatedAt: '2026-08-14T08:00:00.000Z',
  };
}

describe('市場摘要成交金額', () => {
  it('以兩市官方總額計算，不以普通股個股加總冒充市場總額', () => {
    const service = new MarketService({} as never);
    const summary = service.summary(
      [quote('2330', 'TWSE', 100), quote('5347', 'TPEx', 200)],
      0,
      { TWSE: 1_109_746_702_006, TPEx: 300_000_000_000 },
    );

    expect(summary.totalTurnover).toBe(1_409_746_702_006);
    expect(summary.marketComparison).toMatchObject([
      { market: 'TWSE', turnover: 1_109_746_702_006 },
      { market: 'TPEx', turnover: 300_000_000_000 },
    ]);
  });

  it('部分官方市場快取逾時後會重新抓取，不會永久缺少 TPEx', () => {
    const now = new Date('2026-08-17T08:00:00.000Z');
    expect(canUseDailyCache({ source: 'TWSE', isDemo: false, updatedAt: '2026-08-17T07:58:00.000Z' }, '2026-08-14', 'auto', now)).toBe(false);
    expect(canUseDailyCache({ source: 'TWSE+TPEx', isDemo: false, updatedAt: '2026-08-17T07:58:00.000Z' }, '2026-08-14', 'auto', now)).toBe(true);
  });
});
