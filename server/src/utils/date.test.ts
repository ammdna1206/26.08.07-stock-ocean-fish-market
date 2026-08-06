import { describe, expect, it } from 'vitest';
import { isWeekend, normalizeTradeDate, previousBusinessDate } from './date';

describe('交易日期工具', () => {
  it('支援西元與民國日期格式', () => {
    expect(normalizeTradeDate('2026.08.05')).toBe('2026-08-05');
    expect(normalizeTradeDate('2026/08/05')).toBe('2026-08-05');
    expect(normalizeTradeDate('115-08-05')).toBe('2026-08-05');
  });

  it('拒絕無效日期並辨識週末', () => {
    expect(normalizeTradeDate('2026-02-30')).toBeNull();
    expect(isWeekend('2026-08-08')).toBe(true);
    expect(previousBusinessDate('2026-08-10')).toBe('2026-08-07');
  });
});
