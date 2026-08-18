import dayjs from 'dayjs';
import type { HistoryPoint } from '../../shared/types';

function parseNumber(value: unknown): number | null {
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  if (!normalized || normalized === '--' || normalized === '---') return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function isoDate(value: unknown): string | null {
  const matched = /^(\d{3,4})\/(\d{2})\/(\d{2})$/.exec(String(value ?? '').trim());
  if (!matched) return null;
  const year = Number(matched[1]) < 1911 ? Number(matched[1]) + 1911 : Number(matched[1]);
  return `${year}-${matched[2]}-${matched[3]}`;
}

async function fetchTwseMonth(symbol: string, month: string): Promise<HistoryPoint[]> {
  const date = `${month.replace('-', '')}01`;
  const url = `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?response=json&date=${date}&stockNo=${symbol}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6_000) });
  if (!response.ok) throw new Error(`TWSE 歷史資料回應失敗（HTTP ${response.status}）`);
  const data = await response.json() as { stat?: string; date?: string; data?: unknown[][] };
  if (data.stat !== 'OK') throw new Error(`TWSE 歷史資料暫時無法取得（${data.stat || '未知狀態'}）`);
  if (data.date && !data.date.startsWith(date)) throw new Error('TWSE 歷史資料月份不一致');
  return (data.data ?? []).map((cells): HistoryPoint | null => {
    const tradeDate = isoDate(cells[0]);
    if (!tradeDate) return null;
    return {
      tradeDate,
      volume: Math.round(parseNumber(cells[1]) ?? 0),
      turnover: Math.round(parseNumber(cells[2]) ?? 0),
      open: parseNumber(cells[3]), high: parseNumber(cells[4]), low: parseNumber(cells[5]), close: parseNumber(cells[6]),
      change: parseNumber(cells[7]), transactionCount: parseNumber(cells[8]),
    };
  }).filter((point): point is HistoryPoint => Boolean(point));
}

export async function fetchTwseHistory(symbol: string, from: string, to: string): Promise<{ points: HistoryPoint[]; failedMonths: number }> {
  const months: string[] = [];
  let cursor = dayjs(from).startOf('month');
  const lastMonth = dayjs(to).startOf('month');
  while (!cursor.isAfter(lastMonth) && months.length < 120) {
    months.push(cursor.format('YYYY-MM'));
    cursor = cursor.add(1, 'month');
  }

  const points: HistoryPoint[] = [];
  let failedMonths = 0;
  for (let index = 0; index < months.length; index += 4) {
    const settled = await Promise.allSettled(months.slice(index, index + 4).map((month) => fetchTwseMonth(symbol, month)));
    settled.forEach((result) => {
      if (result.status === 'fulfilled') points.push(...result.value);
      else failedMonths += 1;
    });
  }
  const unique = [...new Map(points.filter((point) => point.tradeDate >= from && point.tradeDate <= to).map((point) => [point.tradeDate, point])).values()]
    .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate));
  return { points: unique, failedMonths };
}

export function historyYearRanges(to: string): Array<{ from: string; to: string; year: number }> {
  const end = dayjs(to);
  if (!end.isValid() || end.year() < 2019) return [];
  const ranges: Array<{ from: string; to: string; year: number }> = [];
  for (let year = end.year(); year >= 2019; year -= 1) {
    ranges.push({ from: `${year}-01-01`, to: year === end.year() ? to : `${year}-12-31`, year });
  }
  return ranges;
}
