import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTwseHistory } from './history';

afterEach(() => vi.unstubAllGlobals());

describe('瀏覽器直接取得 TWSE 歷史行情', () => {
  it('解析官方月資料並保留成交股數、金額與筆數', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      stat: 'OK', date: '20190101', data: [['108/01/02', '3,284,000', '19,338,659,000', '589.00', '593.00', '586.00', '590.00', '0.00', '2,211']],
    }), { status: 200 })));

    await expect(fetchTwseHistory('2454', '2019-01-01', '2019-01-31')).resolves.toEqual({
      points: [{ tradeDate: '2019-01-02', volume: 3_284_000, turnover: 19_338_659_000, open: 589, high: 593, low: 586, close: 590, change: 0, transactionCount: 2_211 }],
      failedMonths: 0,
    });
  });
});
