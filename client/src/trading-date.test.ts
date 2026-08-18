import { describe, expect, it } from 'vitest';
import { latestCompletedTradingDate, resolveLatestOfficialDate } from './trading-date';

describe('首頁預設交易日', () => {
  it('臺灣時間收盤資料完成前使用前一個工作日', () => {
    expect(latestCompletedTradingDate(new Date('2026-08-17T05:00:00Z'))).toBe('2026-08-14');
  });

  it('臺灣時間 18:00 後才使用當日，週末則回到前一個工作日', () => {
    expect(latestCompletedTradingDate(new Date('2026-08-17T07:30:00Z'))).toBe('2026-08-14');
    expect(latestCompletedTradingDate(new Date('2026-08-17T10:30:00Z'))).toBe('2026-08-17');
    expect(latestCompletedTradingDate(new Date('2026-08-16T08:00:00Z'))).toBe('2026-08-14');
  });

  it('當日只有示範資料時自動退回最近的官方交易日', async () => {
    const load = async (date: string) => ({ isDemo: date === '2026-08-18', source: date === '2026-08-18' ? 'DEMO' : 'TWSE+TPEx' });
    await expect(resolveLatestOfficialDate('2026-08-18', load)).resolves.toEqual({
      date: '2026-08-17', response: { isDemo: false, source: 'TWSE+TPEx' }, usedFallback: true,
    });
  });
});
