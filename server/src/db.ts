import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { StockQuote } from '../../shared/types';

export interface CachedDaily {
  tradeDate: string;
  quotes: StockQuote[];
  source: string;
  isDemo: boolean;
  updatedAt: string;
}

export class MarketDatabase {
  private readonly db: Database.Database;

  constructor(filename = process.env.DB_PATH ?? './data/market.sqlite') {
    const resolved = path.resolve(filename);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_cache (
        trade_date TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        source TEXT NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS history_cache (
        cache_key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        source TEXT NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `);
  }

  getDaily(tradeDate: string): CachedDaily | null {
    const row = this.db.prepare('SELECT * FROM daily_cache WHERE trade_date = ?').get(tradeDate) as { trade_date: string; payload: string; source: string; is_demo: number; updated_at: string } | undefined;
    if (!row) return null;
    return { tradeDate: row.trade_date, quotes: JSON.parse(row.payload) as StockQuote[], source: row.source, isDemo: Boolean(row.is_demo), updatedAt: row.updated_at };
  }

  setDaily(cache: CachedDaily): void {
    this.db.prepare(`INSERT INTO daily_cache (trade_date, payload, source, is_demo, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(trade_date) DO UPDATE SET payload=excluded.payload, source=excluded.source, is_demo=excluded.is_demo, updated_at=excluded.updated_at`).run(cache.tradeDate, JSON.stringify(cache.quotes), cache.source, cache.isDemo ? 1 : 0, cache.updatedAt);
  }

  getHistory(key: string): { payload: unknown; source: string; isDemo: boolean; updatedAt: string } | null {
    const row = this.db.prepare('SELECT * FROM history_cache WHERE cache_key = ?').get(key) as { payload: string; source: string; is_demo: number; updated_at: string } | undefined;
    return row ? { payload: JSON.parse(row.payload), source: row.source, isDemo: Boolean(row.is_demo), updatedAt: row.updated_at } : null;
  }

  setHistory(key: string, payload: unknown, source: string, isDemo: boolean, updatedAt: string): void {
    this.db.prepare(`INSERT INTO history_cache (cache_key, payload, source, is_demo, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload, source=excluded.source, is_demo=excluded.is_demo, updated_at=excluded.updated_at`).run(key, JSON.stringify(payload), source, isDemo ? 1 : 0, updatedAt);
  }
}
