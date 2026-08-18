import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOfficialHistoryMonth } from './history-provider';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.HISTORY_RETRY_DELAY_MS;
});

describe('官方個股月歷史行情', () => {
  it('解析 TWSE 股數、成交金額與 OHLC', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      stat: 'OK', date: '20260801', data: [['115/08/17', '10,559,715', '43,090,307,420', '4,205.00', '4,225.00', '4,025.00', '4,050.00', '-160.00', '57,461', '']],
    }), { status: 200 })));

    await expect(fetchOfficialHistoryMonth('2454', 'TWSE', '2026-08')).resolves.toEqual([{
      tradeDate: '2026-08-17', volume: 10_559_715, turnover: 43_090_307_420,
      open: 4205, high: 4225, low: 4025, close: 4050, change: -160, transactionCount: 57_461,
    }]);
  });

  it('將 TPEx 成交張數與成交仟元換算為股及元', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ tables: [{
      date: '20260801', data: [['115/08/17', '84,401', '9,931,718', '111.00', '122.50', '108.50', '122.50', '11.00', '51,094']],
    }] }), { status: 200 })));

    await expect(fetchOfficialHistoryMonth('6182', 'TPEx', '2026-08')).resolves.toEqual([{
      tradeDate: '2026-08-17', volume: 84_401_000, turnover: 9_931_718_000,
      open: 111, high: 122.5, low: 108.5, close: 122.5, change: 11, transactionCount: 51_094,
    }]);
  });

  it('官方暫時失敗時會重試單月請求', async () => {
    process.env.HISTORY_RETRY_DELAY_MS = '0';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ stat: 'OK', date: '20190101', data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchOfficialHistoryMonth('2454', 'TWSE', '2019-01')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('官方非成功狀態會回報可重試錯誤', async () => {
    process.env.HISTORY_RETRY_DELAY_MS = '0';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ stat: '很抱歉，沒有符合條件的資料!' }), { status: 200 })));
    await expect(fetchOfficialHistoryMonth('2454', 'TWSE', '2019-01')).rejects.toThrow('TWSE 歷史資料暫時無法取得');
  });
});
