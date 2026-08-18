import dayjs from 'dayjs';

export function previousWeekday(date: string): string {
  let cursor = dayjs(date).subtract(1, 'day');
  while (cursor.day() === 0 || cursor.day() === 6) cursor = cursor.subtract(1, 'day');
  return cursor.format('YYYY-MM-DD');
}

export async function resolveLatestOfficialDate<T extends { isDemo: boolean }>(
  requestedDate: string,
  load: (date: string) => Promise<T>,
  maxAttempts = 7,
): Promise<{ date: string; response: T; usedFallback: boolean }> {
  let candidate = requestedDate;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await load(candidate);
    if (!response.isDemo || attempt === maxAttempts - 1) {
      return { date: candidate, response, usedFallback: candidate !== requestedDate };
    }
    candidate = previousWeekday(candidate);
  }
  throw new Error('無法確認最近官方交易日');
}

export function latestCompletedTradingDate(now = new Date()): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  let cursor = dayjs(`${parts.year}-${parts.month}-${parts.day}`);
  if (cursor.day() !== 0 && cursor.day() !== 6 && Number(parts.hour) < 18) cursor = cursor.subtract(1, 'day');
  while (cursor.day() === 0 || cursor.day() === 6) cursor = cursor.subtract(1, 'day');
  return cursor.format('YYYY-MM-DD');
}
