import dayjs from 'dayjs';

const DATE_PATTERN = /^(\d{3,4})[./-](\d{1,2})[./-](\d{1,2})$/;

export function normalizeTradeDate(input: string): string | null {
  const value = input.trim();
  const matched = DATE_PATTERN.exec(value);
  if (!matched) return null;
  const rawYear = Number(matched[1]);
  const year = rawYear < 1911 ? rawYear + 1911 : rawYear;
  const month = Number(matched[2]);
  const date = Number(matched[3]);
  const parsed = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`);
  if (!parsed.isValid() || parsed.year() !== year || parsed.month() !== month - 1 || parsed.date() !== date) return null;
  return parsed.format('YYYY-MM-DD');
}

export function isWeekend(date: string): boolean {
  const weekday = dayjs(date).day();
  return weekday === 0 || weekday === 6;
}

export function previousBusinessDate(date: string): string {
  let cursor = dayjs(date).subtract(1, 'day');
  for (let index = 0; index < 14; index += 1) {
    if (!isWeekend(cursor.format('YYYY-MM-DD'))) return cursor.format('YYYY-MM-DD');
    cursor = cursor.subtract(1, 'day');
  }
  return dayjs(date).subtract(1, 'day').format('YYYY-MM-DD');
}

export function nextBusinessDate(date: string): string {
  let cursor = dayjs(date).add(1, 'day');
  for (let index = 0; index < 14; index += 1) {
    if (!isWeekend(cursor.format('YYYY-MM-DD'))) return cursor.format('YYYY-MM-DD');
    cursor = cursor.add(1, 'day');
  }
  return dayjs(date).add(1, 'day').format('YYYY-MM-DD');
}

export function sourceDate(date: string): string {
  return date.replaceAll('-', '');
}
