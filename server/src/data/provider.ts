import axios from 'axios';
import dayjs from 'dayjs';
import type { Market, StockQuote } from '../../../shared/types';
import { sourceDate } from '../utils/date';
import { directionOf, parseNumber, safeNumber } from '../utils/number';

export interface ProviderResult {
  quotes: StockQuote[];
  source: string;
  message: string;
}

export interface MarketDataProvider {
  readonly name: string;
  readonly market: Market | 'DEMO';
  fetchDaily(date: string): Promise<ProviderResult>;
}

const industries = ['半導體業', '電腦及週邊設備業', '電子零組件業', '金融保險業', '航運業', '食品工業', '通信網路業', '生技醫療業', '傳統產業'];

const seedStocks: Array<[string, string, Market, string, number]> = [
  ['2330', '台積電', 'TWSE', '半導體業', 1015], ['2317', '鴻海', 'TWSE', '電腦及週邊設備業', 198],
  ['2454', '聯發科', 'TWSE', '半導體業', 1220], ['2303', '聯電', 'TWSE', '半導體業', 49.4],
  ['2382', '廣達', 'TWSE', '電腦及週邊設備業', 303], ['3231', '緯創', 'TWSE', '電腦及週邊設備業', 121],
  ['6669', '緯穎', 'TWSE', '電腦及週邊設備業', 2325], ['2603', '長榮', 'TWSE', '航運業', 198.5],
  ['2615', '萬海', 'TWSE', '航運業', 84.6], ['2881', '富邦金', 'TWSE', '金融保險業', 92.2],
  ['2882', '國泰金', 'TWSE', '金融保險業', 65.8], ['2891', '中信金', 'TWSE', '金融保險業', 43.1],
  ['2002', '中鋼', 'TWSE', '鋼鐵工業', 21.4], ['1101', '台泥', 'TWSE', '水泥工業', 31.9],
  ['1216', '統一', 'TWSE', '食品工業', 84.5], ['3008', '大立光', 'TWSE', '光電業', 2480],
  ['2379', '瑞昱', 'TWSE', '半導體業', 565], ['3711', '日月光投控', 'TWSE', '半導體業', 151],
  ['2327', '國巨', 'TWSE', '電子零組件業', 225], ['2344', '華邦電', 'TWSE', '半導體業', 20.9],
  ['3034', '聯詠', 'TWSE', '半導體業', 545], ['2357', '華碩', 'TWSE', '電腦及週邊設備業', 586],
  ['2308', '台達電', 'TWSE', '電子零組件業', 680], ['2408', '南亞科', 'TWSE', '半導體業', 47.3],
  ['2409', '友達', 'TWSE', '光電業', 13.9], ['2207', '和泰車', 'TWSE', '汽車工業', 640],
  ['1301', '台塑', 'TWSE', '塑膠工業', 49.4], ['1303', '南亞', 'TWSE', '塑膠工業', 38.9],
  ['1326', '台化', 'TWSE', '塑膠工業', 36.1], ['1402', '遠東新', 'TWSE', '紡織纖維', 33.4],
  ['1605', '華新', 'TWSE', '電器電纜', 29.7], ['1707', '葡萄王', 'TWSE', '生技醫療業', 143],
  ['1722', '台肥', 'TWSE', '化學工業', 56.8], ['1802', '台玻', 'TWSE', '玻璃陶瓷', 15.3],
  ['1907', '永豐餘', 'TWSE', '造紙工業', 15.8], ['2105', '正新', 'TWSE', '橡膠工業', 44.8],
  ['2201', '裕隆', 'TWSE', '汽車工業', 49.8], ['2353', '宏碁', 'TWSE', '電腦及週邊設備業', 42.3],
  ['2376', '技嘉', 'TWSE', '電腦及週邊設備業', 285], ['2395', '研華', 'TWSE', '電腦及週邊設備業', 360],
  ['2421', '建準', 'TWSE', '電子零組件業', 99.4], ['2474', '可成', 'TWSE', '電子零組件業', 196],
  ['2498', '宏達電', 'TWSE', '通信網路業', 47.5], ['2542', '興富發', 'TWSE', '建材營造業', 46.8],
  ['2609', '陽明', 'TWSE', '航運業', 75.2], ['2610', '華航', 'TWSE', '航運業', 21.1],
  ['2637', '慧洋-KY', 'TWSE', '航運業', 74.8], ['2707', '晶華', 'TWSE', '觀光餐旅', 238],
  ['2912', '統一超', 'TWSE', '貿易百貨業', 277], ['3045', '台灣大', 'TWSE', '通信網路業', 116],
  ['4904', '遠傳', 'TWSE', '通信網路業', 89.6], ['5871', '中租-KY', 'TWSE', '其他業', 126],
  ['5880', '合庫金', 'TWSE', '金融保險業', 25.6], ['6005', '群益證', 'TWSE', '金融保險業', 21.9],
  ['6239', '力成', 'TWSE', '半導體業', 145], ['6488', '環球晶', 'TWSE', '半導體業', 489],
  ['6770', '力積電', 'TWSE', '半導體業', 29.1], ['8046', '南電', 'TWSE', '電子零組件業', 145],
  ['8454', '富邦媒', 'TWSE', '貿易百貨業', 415], ['9904', '寶成', 'TWSE', '其他業', 31.7],
  ['9910', '豐泰', 'TWSE', '其他業', 117], ['9938', '百和', 'TWSE', '其他業', 63.5],
  ['6547', '高端疫苗', 'TPEx', '生技醫療業', 58.1], ['3105', '穩懋', 'TPEx', '半導體業', 117],
  ['3293', '鈊象', 'TPEx', '文化創意業', 760], ['5347', '世界', 'TPEx', '半導體業', 122],
  ['8069', '元太', 'TPEx', '電子零組件業', 268], ['8299', '群聯', 'TPEx', '半導體業', 640],
  ['4979', '華星光', 'TPEx', '通信網路業', 244], ['5483', '中美晶', 'TPEx', '半導體業', 155],
  ['6147', '頎邦', 'TPEx', '半導體業', 69.8], ['8936', '國統', 'TPEx', '其他業', 58.4],
];

function hash(text: string): number {
  return [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 1000003, 17);
}

function quoteFromSeed(date: string, seed: [string, string, Market, string, number], index: number): StockQuote {
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
  const updatedAt = dayjs().toISOString();
  return {
    tradeDate: date, symbol, name, market, industry, open, high, low, close, previousClose,
    change, changePercent, amplitude: Number((((high - low) / previousClose) * 100).toFixed(2)),
    volume, transactionCount: noTrade ? 0 : Math.round(volume / 4 + index * 17),
    turnover: Math.round(volume * close * 1000),
    peRatio: index % 11 === 0 ? null : Number((8 + Math.abs(random) * 19).toFixed(2)),
    dividendYield: index % 13 === 0 ? null : Number((1.2 + Math.abs(random) * 3.4).toFixed(2)),
    priceToBookRatio: index % 17 === 0 ? null : Number((0.8 + Math.abs(random) * 2.5).toFixed(2)),
    status: noTrade ? '無成交' : directionOf(change), source: 'DEMO', updatedAt,
  };
}

export function buildDemoQuotes(date: string): StockQuote[] {
  const seeds = [...seedStocks];
  for (let index = seeds.length; index < 96; index += 1) {
    const market: Market = index % 3 === 0 ? 'TPEx' : 'TWSE';
    const industry = industries[index % industries.length];
    seeds.push([String(1000 + index * 37).slice(0, 4), `示範${industry.slice(0, 2)}${index}`, market, industry, 18 + (index % 13) * 8.3]);
  }
  return seeds.map((seed, index) => quoteFromSeed(date, seed, index));
}

export class MockProvider implements MarketDataProvider {
  readonly name = '示範資料引擎';
  readonly market = 'DEMO' as const;

  async fetchDaily(date: string): Promise<ProviderResult> {
    return { quotes: buildDemoQuotes(date), source: 'DEMO', message: '目前使用示範資料' };
  }
}

function normalizedQuote(date: string, row: Record<string, unknown>, market: Market, source: string): StockQuote | null {
  const symbol = String(row['證券代號'] ?? row['代號'] ?? row['SecuritiesCompanyCode'] ?? '').trim();
  const name = String(row['證券名稱'] ?? row['名稱'] ?? row['CompanyName'] ?? '').trim();
  if (!/^\d{4,6}[A-Za-z-]*$/.test(symbol) || !name) return null;
  if (/[購售權證]/.test(name)) return null;
  const open = parseNumber(row['開盤價'] ?? row['開盤'] ?? row['Open']);
  const high = parseNumber(row['最高價'] ?? row['最高'] ?? row['High']);
  const low = parseNumber(row['最低價'] ?? row['最低'] ?? row['Low']);
  const close = parseNumber(row['收盤價'] ?? row['收盤'] ?? row['Close']);
  const statedPreviousClose = parseNumber(row['昨日收盤價'] ?? row['昨收'] ?? row['PreviousClose']);
  const change = parseNumber(row['漲跌價差'] ?? row['漲跌'] ?? row['Change']);
  const previousClose = statedPreviousClose ?? (close !== null && change !== null ? Number((close - change).toFixed(2)) : null);
  const changePercent = previousClose && change !== null ? Number(((change / previousClose) * 100).toFixed(2)) : null;
  const volume = Math.round(safeNumber(parseNumber(row['成交股數'] ?? row['成交量'] ?? row['Volume'])));
  const turnover = Math.round(safeNumber(parseNumber(row['成交金額'] ?? row['成交額'] ?? row['Turnover'])));
  const suppliedIndustry = row['產業別'] ?? row['Industry'];
  const mappedIndustry = seedStocks.find(([seedSymbol]) => seedSymbol === symbol)?.[3];
  const industry = typeof suppliedIndustry === 'string' && suppliedIndustry.trim() ? suppliedIndustry.trim() : mappedIndustry ?? '資料來源未提供';
  return {
    tradeDate: date, symbol, name, market, industry, open, high, low, close,
    previousClose, change, changePercent, amplitude: high !== null && low !== null && previousClose ? Number((((high - low) / previousClose) * 100).toFixed(2)) : null,
    volume, transactionCount: parseNumber(row['成交筆數'] ?? row['Transactions']), turnover,
    peRatio: parseNumber(row['本益比'] ?? row['PER']), dividendYield: parseNumber(row['殖利率'] ?? row['DividendYield']),
    priceToBookRatio: parseNumber(row['股價淨值比'] ?? row['PBR']), status: String(row['備註'] ?? ''), source, updatedAt: dayjs().toISOString(),
  };
}

export class TwseProvider implements MarketDataProvider {
  readonly name = '臺灣證券交易所公開資料';
  readonly market = 'TWSE' as const;

  async fetchDaily(date: string): Promise<ProviderResult> {
    const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${sourceDate(date)}&type=ALLBUT0999`;
    const response = await axios.get(url, { timeout: Number(process.env.UPSTREAM_TIMEOUT_MS ?? 3500) });
    const tables = Array.isArray(response.data?.tables) ? response.data.tables : [];
    const table = tables.find((candidate: { fields?: string[] }) => candidate.fields?.some((field) => field.includes('證券代號')));
    const fields: string[] = table?.fields ?? [];
    const rows = (table?.data ?? []) as unknown[][];
    const quotes = rows.map((cells) => normalizedQuote(date, Object.fromEntries(fields.map((field, index) => [field, cells[index]])), 'TWSE', 'TWSE')).filter((quote): quote is StockQuote => Boolean(quote));
    if (quotes.length < 5) throw new Error('TWSE 回應格式無法辨識或當日無資料');
    return { quotes, source: 'TWSE', message: '已取得 TWSE 公開資料' };
  }
}

export class TpexProvider implements MarketDataProvider {
  readonly name = '證券櫃檯買賣中心公開資料';
  readonly market = 'TPEx' as const;

  async fetchDaily(date: string): Promise<ProviderResult> {
    const formatted = dayjs(date).format('YYYY/MM/DD');
    const url = `https://www.tpex.org.tw/web/stock/aftertrading/DAILY_CLOSE_quotes/stk_quote_result.php?l=zh-tw&o=json&d=${formatted}&s=0,asc,0`;
    const response = await axios.get(url, { timeout: Number(process.env.UPSTREAM_TIMEOUT_MS ?? 3500) });
    const rows = (response.data?.tables?.[0]?.data ?? response.data?.aaData ?? []) as unknown[][];
    const fields = ['證券代號', '證券名稱', '收盤價', '漲跌', '最高價', '最低價', '成交量', '成交筆數', '成交金額'];
    const quotes = rows.map((cells) => normalizedQuote(date, Object.fromEntries(fields.map((field, index) => [field, cells[index]])), 'TPEx', 'TPEx')).filter((quote): quote is StockQuote => Boolean(quote));
    if (quotes.length < 5) throw new Error('TPEx 回應格式無法辨識或當日無資料');
    return { quotes, source: 'TPEx', message: '已取得 TPEx 公開資料' };
  }
}
