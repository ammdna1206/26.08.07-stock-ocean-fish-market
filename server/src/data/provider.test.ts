import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeOfficialQuote, TpexProvider, TwseProvider } from './provider';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('官方行情欄位正規化', () => {
  it('依 TWSE 漲跌符號還原負數價差', () => {
    const quote = normalizeOfficialQuote('2026-08-14', {
      證券代號: '2330', 證券名稱: '台積電', 成交股數: '21,162,682', 成交筆數: '105,889', 成交金額: '51,159,731,253',
      開盤價: '2,435.00', 最高價: '2,440.00', 最低價: '2,395.00', 收盤價: '2,395.00',
      '漲跌(+/-)': '<p style= color:green>-</p>', 漲跌價差: '40.00', 本益比: '27.76',
    }, 'TWSE', 'TWSE');

    expect(quote).toMatchObject({
      symbol: '2330', close: 2395, previousClose: 2435, change: -40, changePercent: -1.64,
      volume: 21_162_682, transactionCount: 105_889, turnover: 51_159_731_253,
    });
  });

  it('依 TPEx 官方欄名解析開高低、成交量與成交金額', () => {
    const quote = normalizeOfficialQuote('2026-08-14', {
      代號: '5347', 名稱: '世界', 收盤: '160.50', 漲跌: '-2.50 ', 開盤: '166.00', 最高: '168.00', 最低: '160.00',
      均價: '164.20', 成交股數: '22,675,534', '成交金額(元)': '3,723,264,151', 成交筆數: '14,979',
    }, 'TPEx', 'TPEx');

    expect(quote).toMatchObject({
      symbol: '5347', open: 166, high: 168, low: 160, close: 160.5,
      previousClose: 163, change: -2.5, changePercent: -1.53,
      volume: 22_675_534, transactionCount: 14_979, turnover: 3_723_264_151,
    });
  });

  it('排除 ETF、債券與權證，只保留四位數普通股代號', () => {
    const base = { 名稱: '測試商品', 收盤: '10', 漲跌: '0', 開盤: '10', 最高: '10', 最低: '10' };
    expect(normalizeOfficialQuote('2026-08-14', { ...base, 代號: '006201' }, 'TPEx', 'TPEx')).toBeNull();
    expect(normalizeOfficialQuote('2026-08-14', { ...base, 代號: '00679B' }, 'TPEx', 'TPEx')).toBeNull();
    expect(normalizeOfficialQuote('2026-08-14', { ...base, 代號: '元大38購01' }, 'TPEx', 'TPEx')).toBeNull();
    expect(normalizeOfficialQuote('2026-08-14', { ...base, 代號: '5347' }, 'TPEx', 'TPEx')).not.toBeNull();
  });

  it('拒絕 TPEx 自動退回前一交易日的不同日期資料', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ date: '20260814', tables: [] }), { status: 200 }))));
    await expect(new TpexProvider().fetchDaily('2026-08-17')).rejects.toThrow('回傳日期與查詢日期不一致');
  });

  it('直接採用 TWSE 大盤統計資訊的市場總額', async () => {
    const fields = ['證券代號', '證券名稱', '成交股數', '成交筆數', '成交金額', '開盤價', '最高價', '最低價', '收盤價', '漲跌(+/-)', '漲跌價差'];
    const rows = ['2330', '2317', '2454', '2303', '2382'].map((symbol) => [symbol, `股票${symbol}`, '100', '10', '1,000', '10', '11', '9', '10', '+', '0']);
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { date: '20260814', tables: [
      { fields: ['成交統計', '成交金額(元)', '成交股數(股)', '成交筆數'], data: [['總計(1~15)', '1,109,746,702,006', '11,975,502,093', '5,369,692']] },
      { fields, data: rows },
    ] } });

    const result = await new TwseProvider().fetchDaily('2026-08-14');
    expect(result.marketTurnover).toBe(1_109_746_702_006);
  });

  it('TPEx 市場總額包含完整官方清單，不受普通股魚群篩選影響', async () => {
    const fields = ['代號', '名稱', '收盤', '漲跌', '開盤', '最高', '最低', '均價', '成交股數', '成交金額(元)', '成交筆數'];
    const rows = [
      ['006201', '元大富櫃50', '40', '0', '40', '40', '40', '40', '100', '2,000', '5'],
      ...['5347', '8299', '3105', '3293', '8069'].map((symbol) => [symbol, `股票${symbol}`, '10', '0', '10', '10', '10', '10', '100', '1,000', '5']),
    ];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ date: '20260814', tables: [{ fields, data: rows }] }), { status: 200 }))));

    const result = await new TpexProvider().fetchDaily('2026-08-14');
    expect(result.quotes).toHaveLength(5);
    expect(result.marketTurnover).toBe(7_000);
  });

  it('優先使用 TPEx OpenAPI 具名欄位取得最新交易日資料', async () => {
    const rows = [
      { Date: '1150814', SecuritiesCompanyCode: '006201', CompanyName: '元大富櫃50', Close: '40', Change: '0', Open: '40', High: '40', Low: '40', TradingShares: '100', TransactionAmount: '2000', TransactionNumber: '5' },
      ...['5347', '8299', '3105', '3293', '8069'].map((symbol) => ({ Date: '1150814', SecuritiesCompanyCode: symbol, CompanyName: `股票${symbol}`, Close: '10', Change: '0', Open: '10', High: '10', Low: '10', TradingShares: '100', TransactionAmount: '1000', TransactionNumber: '5' })),
    ];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(rows), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new TpexProvider().fetchDaily('2026-08-14');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.quotes).toHaveLength(5);
    expect(result.marketTurnover).toBe(7_000);
  });
});
