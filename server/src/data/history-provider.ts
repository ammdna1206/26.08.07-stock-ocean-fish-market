import type { HistoryPoint, Market } from '../../../shared/types';
import { parseNumber, safeNumber } from '../utils/number';

function isoDate(value: unknown): string | null {
  const matched = /^(\d{3,4})\/(\d{2})\/(\d{2})$/.exec(String(value ?? '').trim());
  if (!matched) return null;
  const year = Number(matched[1]) < 1911 ? Number(matched[1]) + 1911 : Number(matched[1]);
  return `${year}-${matched[2]}-${matched[3]}`;
}

function point(cells: unknown[], market: Market): HistoryPoint | null {
  const tradeDate = isoDate(cells[0]);
  if (!tradeDate) return null;
  const multiplier = market === 'TPEx' ? 1_000 : 1;
  return {
    tradeDate,
    volume: Math.round(safeNumber(parseNumber(cells[1])) * multiplier),
    turnover: Math.round(safeNumber(parseNumber(cells[2])) * multiplier),
    open: parseNumber(cells[3]),
    high: parseNumber(cells[4]),
    low: parseNumber(cells[5]),
    close: parseNumber(cells[6]),
    change: parseNumber(cells[7]),
    transactionCount: parseNumber(cells[8]),
  };
}

export async function fetchOfficialHistoryMonth(symbol: string, market: Market, month: string): Promise<HistoryPoint[]> {
  const date = `${month.replace('-', '')}01`;
  const timeout = Number(process.env.HISTORY_UPSTREAM_TIMEOUT_MS ?? 20_000);
  const url = market === 'TWSE'
    ? `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${symbol}`
    : `https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingStock?code=${symbol}&date=${month.replace('-', '/')}/01`;
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Stock-Ocean-Fish-Market/1.0' }, signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`${market} 歷史資料回應失敗（HTTP ${response.status}）`);
  const data = await response.json() as { stat?: string; date?: string; data?: unknown[][]; tables?: Array<{ date?: string; data?: unknown[][] }> };
  if (market === 'TWSE' && data.stat !== 'OK') return [];
  const responseDate = String(market === 'TWSE' ? data.date ?? '' : data.tables?.[0]?.date ?? '');
  if (responseDate && !responseDate.startsWith(month.replace('-', ''))) throw new Error(`${market} 歷史資料月份不一致`);
  const rows = market === 'TWSE' ? data.data ?? [] : data.tables?.[0]?.data ?? [];
  return rows.map((cells) => point(cells, market)).filter((item): item is HistoryPoint => Boolean(item));
}
