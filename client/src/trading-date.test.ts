import { describe, expect, it } from 'vitest';
import { latestCompletedTradingDate } from './trading-date';

describe('首頁預設交易日', () => {
  it('臺灣時間收盤資料完成前使用前一個工作日', () => {
    expect(latestCompletedTradingDate(new Date('2026-08-17T05:00:00Z'))).toBe('2026-08-14');
  });

  it('臺灣時間 15:00 後使用當日，週末則回到前一個工作日', () => {
    expect(latestCompletedTradingDate(new Date('2026-08-17T07:30:00Z'))).toBe('2026-08-17');
    expect(latestCompletedTradingDate(new Date('2026-08-16T08:00:00Z'))).toBe('2026-08-14');
  });
});
