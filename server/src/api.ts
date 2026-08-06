import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import type { ApiResponse, StocksQuery } from '../../shared/types';
import { normalizeTradeDate } from './utils/date';
import { MarketService } from './services/market-service';

const dateParam = z.string().min(1).max(20);
const numberParam = z.coerce.number().finite();
const service = new MarketService();

function reply<T>(response: Response, body: ApiResponse<T>, status = 200): void {
  response.status(status).json(body);
}

function failure(response: Response, message: string, status = 400): void {
  reply(response, { success: false, data: {}, source: 'SYSTEM', isDemo: false, updatedAt: new Date().toISOString(), message }, status);
}

function parseDate(value: string): string | null {
  const checked = dateParam.safeParse(value);
  return checked.success ? normalizeTradeDate(checked.data) : null;
}

function parseQuery(request: Request): StocksQuery {
  const query = request.query;
  const parseOptional = (value: unknown): number | undefined => {
    if (value === undefined || value === '') return undefined;
    const result = numberParam.safeParse(value);
    return result.success ? result.data : undefined;
  };
  return {
    market: typeof query.market === 'string' && ['TWSE', 'TPEx', 'ALL'].includes(query.market) ? query.market as StocksQuery['market'] : 'ALL',
    industry: typeof query.industry === 'string' ? query.industry : undefined,
    direction: typeof query.direction === 'string' && ['UP', 'DOWN', 'FLAT', 'ALL'].includes(query.direction) ? query.direction as StocksQuery['direction'] : 'ALL',
    minVolume: parseOptional(query.minVolume), maxVolume: parseOptional(query.maxVolume), minChangeRate: parseOptional(query.minChangeRate), maxChangeRate: parseOptional(query.maxChangeRate), search: typeof query.search === 'string' ? query.search.slice(0, 80) : undefined,
    sort: typeof query.sort === 'string' ? query.sort : 'turnover', page: Math.min(Math.max(Number(query.page) || 1, 1), 1000), pageSize: Math.min(Math.max(Number(query.pageSize) || 200, 1), 500),
  };
}

export function createApiRouter(): express.Router {
  const router = express.Router();

  router.get('/health', (_request, response) => reply(response, { success: true, data: { status: 'ok', service: '股海大江 API' }, source: 'SYSTEM', isDemo: false, updatedAt: new Date().toISOString(), message: '服務正常' }));

  router.get('/market/dates/:date', async (request, response) => {
    const tradeDate = parseDate(request.params.date);
    if (!tradeDate) return failure(response, '日期格式無效，請使用 YYYY-MM-DD、YYYY/MM/DD、YYYY.MM.DD 或民國年格式');
    const data = await service.getDateStatus(tradeDate);
    return reply(response, { success: true, data, source: 'SYSTEM', isDemo: false, updatedAt: new Date().toISOString(), message: data.isTradingDay ? '日期格式有效' : '此日期不是台股交易日，是否改為查詢前一個交易日？' });
  });

  router.get('/market/dates/:date/stocks', async (request, response) => {
    const tradeDate = parseDate(request.params.date);
    if (!tradeDate) return failure(response, '日期格式無效，無法查詢股票資料');
    const dateStatus = await service.getDateStatus(tradeDate);
    if (!dateStatus.isTradingDay) return reply(response, { success: false, data: { tradeDate, previousTradingDay: dateStatus.previousTradingDay, stocks: [] }, source: 'SYSTEM', isDemo: false, updatedAt: new Date().toISOString(), message: '此日期不是台股交易日，是否改為查詢前一個交易日？' });
    try {
      const daily = await service.getDaily(tradeDate);
      const filtered = service.filterQuotes(daily.quotes, parseQuery(request));
      const page = parseQuery(request).page;
      const pageSize = parseQuery(request).pageSize;
      return reply(response, { success: true, data: { tradeDate, stocks: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, totalBeforeFilter: daily.quotes.length, industries: [...new Set(daily.quotes.map((quote) => quote.industry))].sort(), page, pageSize }, source: daily.source, isDemo: daily.isDemo, updatedAt: daily.updatedAt, message: daily.message });
    } catch (error) {
      return failure(response, error instanceof Error ? error.message : '行情資料取得失敗', 502);
    }
  });

  router.get('/market/dates/:date/summary', async (request, response) => {
    const tradeDate = parseDate(request.params.date);
    if (!tradeDate) return failure(response, '日期格式無效，無法查詢市場摘要');
    try {
      const daily = await service.getDaily(tradeDate);
      return reply(response, { success: true, data: service.summary(daily.quotes, daily.failureCount), source: daily.source, isDemo: daily.isDemo, updatedAt: daily.updatedAt, message: daily.message });
    } catch (error) {
      return failure(response, error instanceof Error ? error.message : '市場摘要取得失敗', 502);
    }
  });

  router.get('/stocks/:symbol', async (request, response) => {
    if (!/^[A-Za-z0-9-]{2,12}$/.test(request.params.symbol)) return failure(response, '股票代號格式無效');
    const tradeDate = typeof request.query.date === 'string' ? parseDate(request.query.date) ?? undefined : undefined;
    const data = await service.getStock(request.params.symbol, tradeDate);
    return reply(response, { success: Boolean(data.quote), data, source: data.source, isDemo: data.isDemo, updatedAt: data.updatedAt, message: data.message }, data.quote ? 200 : 404);
  });

  router.get('/stocks/:symbol/history', async (request, response) => {
    if (!/^[A-Za-z0-9-]{2,12}$/.test(request.params.symbol)) return failure(response, '股票代號格式無效');
    const days = Math.min(Math.max(Number(request.query.days) || 20, 5), 60);
    const tradeDate = typeof request.query.date === 'string' ? parseDate(request.query.date) ?? undefined : undefined;
    const data = await service.getHistory(request.params.symbol, days, tradeDate);
    return reply(response, { success: data.points.length > 0, data, source: data.source, isDemo: data.isDemo, updatedAt: data.updatedAt, message: data.message });
  });

  return router;
}
