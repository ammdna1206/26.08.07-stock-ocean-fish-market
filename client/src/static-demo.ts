import dayjs from 'dayjs';
import type { Market, StockQuote } from '../../shared/types';

type Seed = [string, string, Market, string, number];

const industries = ['半導體業', '電腦及週邊設備業', '電子零組件業', '金融保險業', '航運業', '食品工業', '通信網路業', '生技醫療業', '傳統產業'];

const coreSeeds: Seed[] = [
  ['2330', '台積電', 'TWSE', '半導體業', 1015], ['2317', '鴻海', 'TWSE', '電腦及週邊設備業', 198],
  ['2454', '聯發科', 'TWSE', '半導體業', 1220], ['2303', '聯電', 'TWSE', '半導體業', 49.4],
  ['2382', '廣達', 'TWSE', '電腦及週邊設備業', 303], ['3231', '緯創', 'TWSE', '電腦及週邊設備業', 121],
  ['6669', '緯穎', 'TWSE', '電腦及週邊設備業', 2325], ['2603', '長榮', 'TWSE', '航運業', 198.5],
  ['2615', '萬海', 'TWSE', '航運業', 84.6], ['2881', '富邦金', 'TWSE', '金融保險業', 92.2],
  ['2882', '國泰金', 'TWSE', '金融保險業', 65.8], ['2891', '中信金', 'TWSE', '金融保險業', 43.1],
  ['2002', '中鋼', 'TWSE', '鋼鐵工業', 21.4], ['1216', '統一', 'TWSE', '食品工業', 84.5],
  ['3008', '大立光', 'TWSE', '光電業', 2480], ['2379', '瑞昱', 'TWSE', '半導體業', 565],
  ['3711', '日月光投控', 'TWSE', '半導體業', 151], ['2327', '國巨', 'TWSE', '電子零組件業', 225],
  ['6547', '高端疫苗', 'TPEx', '生技醫療業', 58.1], ['3293', '鈊象', 'TPEx', '文化創意業', 760],
];

function hash(text: string): number {
  return [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 1000003, 17);
}

function direction(change: number): string {
  return change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'FLAT';
}

function buildSeeds(): Seed[] {
  const seeds = [...coreSeeds];
  for (let index = seeds.length; index < 96; index += 1) {
    const market: Market = index % 3 === 0 ? 'TPEx' : 'TWSE';
    const industry = industries[index % industries.length];
    seeds.push([String(1000 + index * 37).slice(0, 4), `示範${industry.slice(0, 2)}${index}`, market, industry, 18 + (index % 13) * 8.3]);
  }
  return seeds;
}

export function normalizeStaticDate(value: string): string {
  const parts = value.trim().split(/[./-]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  const year = parts[0] < 1911 ? parts[0] + 1911 : parts[0];
  return dayjs(`${year}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`).format('YYYY-MM-DD');
}

export function buildStaticDemoQuotes(date: string): StockQuote[] {
  const updatedAt = new Date().toISOString();
  return buildSeeds().map((seed, index) => {
    const [symbol, name, market, industry, basePrice] = seed;
    const random = Math.sin(hash(`${date}-${symbol}`)) * 10000;
    const changePercent = Number((((random - Math.floor(random)) - 0.5) * 8).toFixed(2));
    const previousClose = basePrice;
    const close = Number((previousClose * (1 + changePercent / 100)).toFixed(2));
    const open = Number((previousClose * (1 + changePercent / 230)).toFixed(2));
    const high = Number((Math.max(open, close) * (1 + Math.abs(changePercent) / 280)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - Math.abs(changePercent) / 320)).toFixed(2));
    const noTrade = index % 29 === 0;
    const volume = noTrade ? 0 : Math.round(7000 + Math.abs(random) * 1500000 + (index % 7) * 80000);
    const change = Number((close - previousClose).toFixed(2));
    return {
      tradeDate: date, symbol, name, market, industry, open, high, low, close, previousClose,
      change, changePercent, amplitude: Number((((high - low) / previousClose) * 100).toFixed(2)),
      volume, transactionCount: noTrade ? 0 : Math.round(volume / 4 + index * 17),
      turnover: Math.round(volume * close * 1000), peRatio: index % 11 === 0 ? null : Number((8 + Math.abs(random) * 19).toFixed(2)),
      dividendYield: index % 13 === 0 ? null : Number((1.2 + Math.abs(random) * 3.4).toFixed(2)),
      priceToBookRatio: index % 17 === 0 ? null : Number((0.8 + Math.abs(random) * 2.5).toFixed(2)),
      status: noTrade ? '無成交' : direction(change), source: 'DEMO', updatedAt,
    };
  });
}

export function buildStaticHistory(quote: StockQuote, date: string, days: number) {
  const points = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const currentDate = dayjs(date).subtract(index, 'day');
    if (currentDate.day() === 0 || currentDate.day() === 6) continue;
    const variation = Math.sin((index + quote.symbol.charCodeAt(0)) * 1.7) * 0.022;
    const close = Number(Math.max(0.01, (quote.close ?? 0) * (1 + variation)).toFixed(2));
    points.push({ tradeDate: currentDate.format('YYYY-MM-DD'), open: Number((close * 0.992).toFixed(2)), high: Number((close * 1.014).toFixed(2)), low: Number((close * 0.985).toFixed(2)), close, volume: Math.round(quote.volume * (0.62 + Math.abs(variation) * 10)) });
  }
  return points;
}
