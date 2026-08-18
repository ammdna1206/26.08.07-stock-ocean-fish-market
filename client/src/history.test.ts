import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTwseHistory, historyYearRanges } from './history';

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

  it('由最近年份向 2019 年分段載入', () => {
    expect(historyYearRanges('2021-08-17')).toEqual([
      { from: '2021-01-01', to: '2021-08-17', year: 2021 },
      { from: '2020-01-01', to: '2020-12-31', year: 2020 },
      { from: '2019-01-01', to: '2019-12-31', year: 2019 },
    ]);
  });

  it('單月失敗會立即回報缺口而不是讓整段載入失敗', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('upstream unavailable')));
    await expect(fetchTwseHistory('2454', '2019-01-01', '2019-01-31')).resolves.toEqual({ points: [], failedMonths: 1 });
  });

  it('官方回應非成功狀態時視為可重試的缺口', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stat: '很抱歉，沒有符合條件的資料!' }) }));
    await expect(fetchTwseHistory('2454', '2019-01-01', '2019-01-31')).resolves.toEqual({ points: [], failedMonths: 1 });
  });
});
