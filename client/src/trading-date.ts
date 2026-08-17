import dayjs from 'dayjs';

export function latestCompletedTradingDate(now = new Date()): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  let cursor = dayjs(`${parts.year}-${parts.month}-${parts.day}`);
  if (cursor.day() !== 0 && cursor.day() !== 6 && Number(parts.hour) < 15) cursor = cursor.subtract(1, 'day');
  while (cursor.day() === 0 || cursor.day() === 6) cursor = cursor.subtract(1, 'day');
  return cursor.format('YYYY-MM-DD');
}
