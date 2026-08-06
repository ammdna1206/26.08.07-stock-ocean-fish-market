export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replaceAll(',', '').replaceAll('%', '').trim();
  if (!cleaned || cleaned === '--' || cleaned === '---' || cleaned === '-') return null;
  const parsed = Number(cleaned.replace(/^\+/, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function safeNumber(value: number | null | undefined, fallback = 0): number {
  return value === null || value === undefined || !Number.isFinite(value) ? fallback : value;
}

export function directionOf(change: number | null): 'UP' | 'DOWN' | 'FLAT' {
  if (!change || Math.abs(change) < 0.0000001) return 'FLAT';
  return change > 0 ? 'UP' : 'DOWN';
}
