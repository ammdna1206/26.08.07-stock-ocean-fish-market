import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { HistoryPoint, MarketSummary, StockQuote } from '../../shared/types';
import { getDateStatus, getHistory, getStock, getStocks, getSummary } from './api';
import type { DateStatus } from './api';
import { FishCanvas } from './components/FishCanvas';
import { StockChart, VolumeChart } from './components/StockChart';
import { latestCompletedTradingDate } from './trading-date';
import './styles.css';

const FAVORITES_KEY = 'stock-ocean-favorites';
const initialDate = latestCompletedTradingDate();

function number(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '資料來源未提供' : value.toLocaleString('zh-TW', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '資料來源未提供' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function App() {
  const [date, setDate] = useState(initialDate);
  const [dateStatus, setDateStatus] = useState<DateStatus | null>(null);
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [selected, setSelected] = useState<StockQuote | null>(null);
  const [detail, setDetail] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [source, setSource] = useState('尚未查詢');
  const [isDemo, setIsDemo] = useState(false);
  const [updatedAt, setUpdatedAt] = useState('');
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState('ALL');
  const [industry, setIndustry] = useState('ALL');
  const [direction, setDirection] = useState('ALL');
  const [minVolume, setMinVolume] = useState('');
  const [maxVolume, setMaxVolume] = useState('');
  const [minChangeRate, setMinChangeRate] = useState('');
  const [maxChangeRate, setMaxChangeRate] = useState('');
  const [sort, setSort] = useState('turnover');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]') as string[]; } catch { return []; }
  });
  const firstFilterRender = useRef(true);

  const query = useMemo(() => ({ market, industry, direction, minVolume: minVolume || undefined, maxVolume: maxVolume || undefined, minChangeRate: minChangeRate || undefined, maxChangeRate: maxChangeRate || undefined, search, sort, page: 1, pageSize: 180 }), [direction, industry, market, maxChangeRate, maxVolume, minChangeRate, minVolume, search, sort]);

  const loadData = useCallback(async (targetDate: string, shouldSetDate = true) => {
    setLoading(true); setProgress(8); setError(''); setNotice('');
    if (shouldSetDate) setDate(targetDate);
    try {
      const statusResponse = await getDateStatus(targetDate);
      setProgress(24);
      setDateStatus(statusResponse.data);
      if (!statusResponse.data.isTradingDay) {
        setStocks([]); setSummary(null); setNotice('此日期不是台股交易日，是否改為查詢前一個交易日？'); setLoading(false); setProgress(0); return;
      }
      setNotice('正在向後端取得行情，會優先使用官方資料，無法連線時自動切換示範資料。');
      const stocksResponse = await getStocks(targetDate, query);
      const summaryResponse = await getSummary(targetDate);
      setProgress(82);
      if (!stocksResponse.success) throw new Error(stocksResponse.message);
      setStocks(stocksResponse.data.stocks); setSummary(summaryResponse.data); setSource(stocksResponse.source); setIsDemo(stocksResponse.isDemo); setUpdatedAt(stocksResponse.updatedAt); setNotice(stocksResponse.message); setProgress(100);
      setTimeout(() => setProgress(0), 500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '資料取得失敗，請稍後重試'); setNotice('可按「載入示範資料」繼續操作'); setStocks([]); setSummary(null); setProgress(0);
    } finally { setLoading(false); }
  }, [query]);

  useEffect(() => { void loadData(initialDate, false); }, []);

  useEffect(() => {
    if (firstFilterRender.current) { firstFilterRender.current = false; return; }
    if (!dateStatus?.isTradingDay || !date) return;
    let cancelled = false;
    const updateStocks = async () => {
      try {
        const response = await getStocks(date, query);
        if (!cancelled && response.success) { setStocks(response.data.stocks); setSource(response.source); setIsDemo(response.isDemo); setUpdatedAt(response.updatedAt); setNotice(`篩選後顯示 ${response.data.total} 檔股票`); }
      } catch { if (!cancelled) setNotice('篩選資料更新失敗，請稍後再試'); }
    };
    void updateStocks();
    return () => { cancelled = true; };
  }, [date, dateStatus?.isTradingDay, query]);

  useEffect(() => {
    if (!selected) { setDetail(null); setHistory([]); return; }
    let cancelled = false;
    setDetail(selected); setHistory([]);
    void getStock(selected.symbol, date).then((response) => { if (!cancelled && response.success && response.data.quote) setDetail(response.data.quote); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [date, selected]);

  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }, [favorites]);

  const industries = useMemo(() => [...new Set(stocks.map((stock) => stock.industry))].sort(), [stocks]);
  const selectedIsFavorite = Boolean(detail && favorites.includes(detail.symbol));

  const loadHistory = async () => {
    if (!detail) return;
    try { const response = await getHistory(detail.symbol, date, 20); setHistory(response.data.points); setNotice(response.message); } catch { setNotice('近期走勢載入失敗，仍保留當日行情'); }
  };

  const selectStock = (stock: StockQuote) => { setSelected(stock); };
  const selectBySymbol = (symbol: string) => { const stock = stocks.find((item) => item.symbol === symbol) ?? summary?.topVolume.find((item) => item.symbol === symbol); if (stock) setSelected(stock); };
  const toggleFavorite = () => { if (!detail) return; setFavorites((current) => current.includes(detail.symbol) ? current.filter((symbol) => symbol !== detail.symbol) : [...current, detail.symbol]); };
  const copyInfo = async () => { if (!detail) return; const text = `${detail.symbol} ${detail.name}｜${date}｜收盤 ${number(detail.close, 2)}｜漲跌 ${percent(detail.changePercent)}｜成交量 ${number(detail.volume)}`; try { await navigator.clipboard.writeText(text); setNotice('已複製股票資訊'); } catch { setNotice('瀏覽器未允許剪貼簿操作'); } };
  const moveDate = (offset: number) => { let next = dayjs(date); do { next = next.add(offset, 'day'); } while (next.day() === 0 || next.day() === 6); void loadData(next.format('YYYY-MM-DD')); };
  const loadPreviousTradingDay = () => { if (dateStatus) void loadData(dateStatus.previousTradingDay); };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark">◒</div><div><div className="brand-name">股海大江</div><div className="brand-subtitle">台股魚群行情平台 <span>MARKET CURRENT</span></div></div></div>
      <div className="topbar-status"><span className="live-dot" />行情查詢與視覺化分析 <span className="desktop-only">｜最後更新 {updatedAt ? dayjs(updatedAt).format('HH:mm:ss') : '--:--:--'}</span></div>
    </header>

    <main className="page-content">
      <section className="query-panel glass-panel">
        <div className="query-heading"><div><p className="eyebrow">DAILY MARKET OBSERVATORY</p><h1>讓每一檔股票，游成一條可讀的行情軌跡</h1></div><div className="source-state"><span className={isDemo ? 'demo-badge' : 'official-badge'}>{isDemo ? 'DEMO 示範資料' : source}</span><span className="tiny-muted">{source}</span></div></div>
        <div className="query-row">
          <label className="date-field"><span>交易日期</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><input className="date-text" value={date} aria-label="交易日期文字輸入" onChange={(event) => setDate(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadData(date); }} /></label>
          <button className="primary-button" onClick={() => void loadData(date)} disabled={loading}>{loading ? <><span className="spinner" />取得中 {progress}%</> : '取得當日行情'}</button>
          <button className="secondary-button" onClick={() => moveDate(-1)} disabled={loading}>← 上一個交易日</button><button className="secondary-button" onClick={() => moveDate(1)} disabled={loading}>下一個交易日 →</button>
          {error && <button className="demo-button" onClick={() => void loadData(date)}>重新載入資料</button>}
        </div>
        {progress > 0 && <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>}
        {(notice || error) && <div className={`notice-bar ${error ? 'notice-error' : ''}`}><span>{error || notice}</span>{dateStatus && !dateStatus.isTradingDay && <button onClick={loadPreviousTradingDay}>切換至 {dateStatus.previousTradingDay}</button>}</div>}
      </section>

      <section className="filter-panel glass-panel">
        <div className="filter-line"><label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋股票代號或名稱" /><kbd>⌘ K</kbd></label><label><span>市場</span><select value={market} onChange={(event) => setMarket(event.target.value)}><option value="ALL">全部市場</option><option value="TWSE">上市 TWSE</option><option value="TPEx">上櫃 TPEx</option></select></label><label><span>產業別</span><select value={industry} onChange={(event) => setIndustry(event.target.value)}><option value="ALL">全部產業</option>{industries.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label><span>方向</span><select value={direction} onChange={(event) => setDirection(event.target.value)}><option value="ALL">漲跌皆列</option><option value="UP">上漲</option><option value="DOWN">下跌</option><option value="FLAT">平盤</option></select></label><label><span>排序</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="turnover">成交金額</option><option value="changeDesc">漲幅由高至低</option><option value="changeAsc">跌幅由高至低</option><option value="name">名稱</option><option value="symbol">代號</option></select></label><button className={`pause-button ${paused ? 'is-paused' : ''}`} onClick={() => setPaused((value) => !value)}>{paused ? '▶ 繼續動畫' : 'Ⅱ 暫停動畫'}</button></div>
        <div className="filter-line compact-filters"><label><span>成交量（股）</span><div className="range-input"><input type="number" min="0" value={minVolume} onChange={(event) => setMinVolume(event.target.value)} placeholder="最小" /><i>—</i><input type="number" min="0" value={maxVolume} onChange={(event) => setMaxVolume(event.target.value)} placeholder="最大" /></div></label><label><span>漲跌幅（%）</span><div className="range-input"><input type="number" step="0.1" value={minChangeRate} onChange={(event) => setMinChangeRate(event.target.value)} placeholder="最小" /><i>—</i><input type="number" step="0.1" value={maxChangeRate} onChange={(event) => setMaxChangeRate(event.target.value)} placeholder="最大" /></div></label><span className="filter-summary">{loading ? '正在整理資料…' : `目前顯示 ${number(stocks.length)} / ${number(summary?.total)} 檔`}</span></div>
      </section>

      <section className="visual-section">
        <div className="section-title"><div><p className="eyebrow">FLOW FIELD / {date}</p><h2>市場水流</h2></div><div className="legend"><span><i className="legend-fish red" />上漲／光澤強度＝漲幅</span><span><i className="legend-fish green" />下跌</span><span><i className="legend-fish gray" />平盤</span><span><i className="legend-ring" />成交金額前 10%</span></div></div>
        <FishCanvas stocks={stocks} selectedSymbol={selected?.symbol} searchTerm={search} paused={paused} onSelect={selectStock} />
        <div className="stage-footer"><span>魚身大小＝成交金額</span><span>游動速度＝成交活躍程度</span><span>拖曳畫布平移・滾輪縮放・點擊魚群查看詳情</span><span>資訊展示與教學研究用途</span></div>
      </section>

      {summary && <Dashboard summary={summary} isDemo={isDemo} onSelect={selectBySymbol} />}
    </main>

    {detail && <aside className="detail-drawer"><div className="drawer-header"><div><p className="eyebrow">SELECTED STOCK</p><h2>{detail.symbol} <span>{detail.name}</span></h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="關閉詳細資料">×</button></div><div className="drawer-meta"><span>{detail.market === 'TWSE' ? '上市 TWSE' : '上櫃 TPEx'}</span><span>{detail.industry}</span><span>{detail.tradeDate}</span></div><div className={`detail-price ${Number(detail.changePercent) >= 0 ? 'text-up' : 'text-down'}`}><strong>{number(detail.close, 2)}</strong><span>{number(detail.change, 2)}　{percent(detail.changePercent)}</span></div><div className="metric-grid">{[['開盤價', number(detail.open, 2)], ['最高價', number(detail.high, 2)], ['最低價', number(detail.low, 2)], ['昨收', number(detail.previousClose, 2)], ['成交股數', number(detail.volume)], ['成交筆數', number(detail.transactionCount)], ['成交金額', number(detail.turnover)], ['當日振幅', percent(detail.amplitude)], ['本益比', number(detail.peRatio, 2)], ['殖利率', percent(detail.dividendYield)], ['股價淨值比', number(detail.priceToBookRatio, 2)], ['交易狀態', detail.status || '一般交易']].map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><b>{value}</b></div>)}</div><div className="chart-section"><div className="chart-title"><span>走勢觀測</span>{!history.length && <button className="link-button" onClick={() => void loadHistory()}>載入近期走勢</button>}</div><StockChart quote={detail} history={history} /><VolumeChart quote={detail} history={history} /></div><div className="drawer-actions"><button className={`secondary-button ${selectedIsFavorite ? 'favorite-active' : ''}`} onClick={toggleFavorite}>{selectedIsFavorite ? '★ 已加入自選' : '☆ 加入自選'}</button><button className="secondary-button" onClick={() => void copyInfo()}>▣ 複製資訊</button></div><div className="data-source-note">資料來源：{detail.source}<br />更新時間：{dayjs(detail.updatedAt).format('YYYY-MM-DD HH:mm:ss')}<br />未提供欄位以「資料來源未提供」表示。</div></aside>}
    <footer className="disclaimer">本平台資料僅供資訊展示與教學研究使用，不構成任何投資建議；實際交易資訊以臺灣證券交易所及證券櫃檯買賣中心公告為準。</footer>
  </div>;
}

function Dashboard({ summary, isDemo, onSelect }: { summary: MarketSummary; isDemo: boolean; onSelect: (symbol: string) => void }) {
  const twseTurnover = summary.marketComparison.find((item) => item.market === 'TWSE')?.turnover ?? 0;
  const tpexTurnover = summary.marketComparison.find((item) => item.market === 'TPEx')?.turnover ?? 0;
  const turnoverSource = isDemo ? '示範' : '官方';
  const statCards = [['上漲家數', summary.rising, 'text-up'], ['下跌家數', summary.falling, 'text-down'], ['平盤家數', summary.flat, ''], ['無成交家數', summary.noTrade, ''], [`兩市${turnoverSource}成交總額`, number(summary.totalTurnover), ''], [`上市${turnoverSource}成交總額`, number(twseTurnover), ''], [`上櫃${turnoverSource}成交總額`, number(tpexTurnover), '']];
  const table = (title: string, rows: StockQuote[], value: (stock: StockQuote) => string, tone: string) => <div className="ranking-card"><div className="ranking-heading"><span>{title}</span><small>TOP 10</small></div>{rows.slice(0, 5).map((stock, index) => <button className="ranking-row" key={stock.symbol} onClick={() => onSelect(stock.symbol)}><em>{String(index + 1).padStart(2, '0')}</em><span><b>{stock.symbol}</b> {stock.name}</span><strong className={tone}>{value(stock)}</strong></button>)}</div>;
  return <section className="dashboard-section"><div className="section-title"><div><p className="eyebrow">MARKET DASHBOARD</p><h2>今日市場摘要</h2></div><span className="dashboard-count">查詢股票 {number(summary.total)} 檔・成功 {number(summary.successCount)}・失敗 {number(summary.failureCount)}<br />市場成交總額含各類證券；魚群僅呈現普通股</span></div><div className="stat-grid">{statCards.map(([label, value, tone]) => <div className="stat-card" key={label}><span>{label}</span><b className={tone}>{value}</b></div>)}</div><div className="dashboard-grid">{table('成交量最大', summary.topVolume, (stock) => number(stock.volume), '')}{table('漲幅前段', summary.topGainers, (stock) => percent(stock.changePercent), 'text-up')}{table('跌幅前段', summary.topLosers, (stock) => percent(stock.changePercent), 'text-down')}<div className="industry-card"><div className="ranking-heading"><span>產業平均漲跌幅</span><small>{summary.industryPerformance.length} 個產業</small></div>{summary.industryPerformance.slice(0, 8).map((item) => <div className="industry-row" key={item.industry}><span>{item.industry}</span><div className="industry-bar"><i className={item.averageChangePercent >= 0 ? 'bar-up' : 'bar-down'} style={{ width: `${Math.min(Math.abs(item.averageChangePercent) * 15 + 4, 100)}%` }} /></div><b className={item.averageChangePercent >= 0 ? 'text-up' : 'text-down'}>{percent(item.averageChangePercent)}</b></div>)}</div></div><div className="market-compare">{summary.marketComparison.map((item) => <div key={item.market}><span>{item.market === 'TWSE' ? '上市 TWSE' : '上櫃 TPEx'}</span><b>{number(item.total)} 檔</b><strong className={item.averageChangePercent >= 0 ? 'text-up' : 'text-down'}>{percent(item.averageChangePercent)}</strong><small>市場成交總額 {number(item.turnover)}</small></div>)}</div></section>;
}

export default App;
