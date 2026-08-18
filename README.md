# 股海大江——台股魚群行情平台

《股海大江》是以 React、TypeScript、Vite、Tailwind CSS、Canvas、Apache ECharts、Node.js、Express 與 SQLite 建置的台股行情查詢與視覺化分析平台。每一條魚代表一檔股票，魚身大小對應成交金額、顏色對應漲跌方向、光圈標示成交金額前 10%，游動速度對應成交活躍程度。

本專案第一階段以「可實際執行的示範版本」為交付重點，後端已保留官方資料 Provider 與 SQLite 快取接口；官方資料來源暫時無法連線或回應格式變更時，系統會自動使用 96 檔示範股票，不會讓首頁空白。

## 快速開始

需求：Node.js 20 LTS 以上、npm 10 以上。

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

開啟：<http://localhost:5173>

後端 API：<http://localhost:4000/api/health>

生產建置與測試：

```bash
npm run build
npm test
npm start
```

若執行環境沒有 npm，可使用等價的 `pnpm install`、`pnpm dev`、`pnpm build`、`pnpm test`。

## 環境變數

| 變數 | 預設值 | 說明 |
|---|---|---|
| `PORT` | `4000` | Express API 連接埠 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS 允許來源，可用逗號分隔 |
| `DATA_PROVIDER` | `auto` | `auto` 優先呼叫 TWSE／TPEx，失敗回退 `DEMO`；也可設 `demo` |
| `UPSTREAM_TIMEOUT_MS` | `30000` | 官方資料請求逾時時間；TPEx 每日檔案較大，不宜設得過短 |
| `HISTORY_UPSTREAM_TIMEOUT_MS` | `20000` | 單一月份官方個股歷史資料請求逾時時間 |
| `HISTORY_FETCH_CONCURRENCY` | `1` | 歷史月份同時抓取數，限制為1～6；公開站建議維持1以避免官方流量限制 |
| `HISTORY_FETCH_DELAY_MS` | `500` | 歷史月份請求間隔毫秒數 |
| `HISTORY_FETCH_RETRIES` | `2` | 單月官方請求重試次數，限制為1～3 |
| `HISTORY_RETRY_DELAY_MS` | `800` | 歷史月份重試的基礎等待毫秒數 |
| `DB_PATH` | `./data/market.sqlite` | SQLite 檔案位置 |

## 公開網址

本專案包含 GitHub Actions 工作流程，可將前端示範版本部署至 GitHub Pages。公開版本使用內建 96 檔示範行情，不需要另外啟動 Express API，適合直接在桌機、平板與手機瀏覽；本機或正式後端模式仍可使用 TWSE、TPEx Provider。

推送 `main` 分支後，工作流程會自動建置公開頁面：

`https://ammdna1206.github.io/26.08.07-stock-ocean-fish-market/`

若 Repository 尚未啟用 Pages，請至 GitHub Repository 的 **Settings → Pages**，將 **Source** 設為 **GitHub Actions**。

## 已完成功能

- React + TypeScript + Vite 前端、Express + TypeScript 後端、SQLite 快取。
- `MarketDataProvider`、`TwseProvider`、`TpexProvider`、`MockProvider` 統一資料接口。
- 日期支援 `2026.08.05`、`2026/08/05`、`2026-08-05` 與民國年格式；週末提示並可切換前一交易日。
- 96 檔以上示範股票，包含上市與上櫃、產業、無成交、漲跌與基本估值欄位缺值示範。
- Canvas 魚群：景深背景、水波、光影、光圈、魚身代號、碰撞避讓、拖曳、縮放、搜尋聚焦、暫停、LOD（最多繪製 180 條）、鍵盤焦點與 reduced-motion 靜態模式。
- 股票詳情：OHLC、成交量、2019年至今官方日K線、歷史成交股數／金額、自選股、複製資訊、資料來源與更新時間。
- 市場摘要：漲跌平盤、無成交、兩市官方成交總額、成交量／漲幅／跌幅排行、產業平均、上市／上櫃比較。市場總額包含官方統計的各類證券，魚群則僅呈現普通股。
- API 參數驗證、Helmet、CORS、請求頻率限制、官方上游逾時、錯誤回退、XSS 由 React 編碼處理、SQLite 參數化查詢。
- 繁體中文介面、桌面／平板／手機版、台股紅漲綠跌、免責聲明。

## 官方資料來源

- 臺灣證券交易所公開資料：`MI_INDEX` 每日收盤行情與交易資料；依官方漲跌符號還原正負值。
- 證券櫃檯買賣中心公開資料：最新交易日優先使用 `tpex_mainboard_daily_close_quotes` OpenAPI，歷史日期回退 `DAILY_CLOSE_quotes/stk_quote_result.php`；兩者均校驗資料日期。
- 官方資料會排除 ETF、債券、權證等非普通股商品，只保留四位數普通股代號。
- 個股歷史行情：TWSE 使用允許跨來源讀取的 `STOCK_DAY` 月資料，由瀏覽器直接向官方網站取得，避免公開伺服器共用 IP 流量限制；TPEx 使用後端代理 `afterTrading/tradingStock` 月資料。TPEx 歷史欄位以張、仟元公布，平台會換算為股、元。
- TWSE 另提供 OpenAPI 入口，正式環境可依授權與欄位需求替換 `TwseProvider`：<https://openapi.twse.com.tw/>

前端不直接呼叫官方 API，所有上游請求由 Express Provider 代理、清理與寫入 SQLite。不同日期的快取以 `trade_date` 為鍵；歷史走勢則依市場、股票與月份分開快取。

## API 文件

所有回應均採：

```json
{
  "success": true,
  "data": {},
  "source": "TWSE+TPEx",
  "isDemo": false,
  "updatedAt": "2026-08-06T00:00:00.000Z",
  "message": ""
}
```

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/health` | 健康檢查 |
| GET | `/api/market/dates/:date` | 日期格式、週末與前後交易日狀態 |
| GET | `/api/market/dates/:date/stocks` | 行情股票列表 |
| GET | `/api/market/dates/:date/summary` | 市場摘要與排行榜 |
| GET | `/api/stocks/:symbol?date=YYYY-MM-DD` | 個股詳細資料 |
| GET | `/api/stocks/:symbol/history?market=TWSE&from=2019-01-01&to=YYYY-MM-DD` | 2019年至今個股官方歷史行情 |

股票列表支援：`market`、`industry`、`direction`、`minVolume`、`maxVolume`、`minChangeRate`、`maxChangeRate`、`search`、`sort`、`page`、`pageSize`。

## 資料欄位對照

| 平台欄位 | TWSE／TPEx 常見欄位 | 缺值處理 |
|---|---|---|
| `tradeDate` | 查詢日期 | ISO `YYYY-MM-DD` |
| `symbol`／`name` | 證券代號／證券名稱 | 無法識別的資料列剔除 |
| `open`／`high`／`low`／`close` | 開盤價／最高價／最低價／收盤價 | `null`，前端顯示資料來源未提供 |
| `previousClose` | 昨日收盤價 | `null` |
| `change`／`changePercent` | 漲跌價差／由昨收換算 | `null` |
| `volume` | 成交股數或成交量 | 空值轉 `0` |
| `transactionCount` | 成交筆數 | `null` |
| `turnover` | 成交金額 | 空值轉 `0` |
| `peRatio`／`dividendYield`／`priceToBookRatio` | 本益比／殖利率／股價淨值比 | `null` |
| `market`／`industry` | Provider 固定市場／來源產業欄位 | 產業缺值為「資料來源未提供」 |
| `source`／`updatedAt` | Provider 名稱／後端時間 | 每次回應產生 |

## 測試與限制

目前已包含日期正規化、民國年、無效日期、週末與前一交易日工具測試。`npm test`、`npm run build` 是交付驗收指令。

官方資料端點屬公開網站，可能因交易日、國定假日、來源網站流量控管或回應格式調整而暫時失敗；因此 `auto` 模式會在官方 Provider 失敗時以 `DEMO` 來源回退。個股歷史行情按月份抓取並寫入 SQLite 快取，已完成月份不重複請求，當月資料每5分鐘可重新整理；示範模式仍只提供可辨識的近期走勢資料。

本平台資料僅供資訊展示與教學研究使用，不構成任何投資建議；實際交易資訊以臺灣證券交易所及證券櫃檯買賣中心公告為準。

## 主要頁面截圖

- [桌面首頁](docs/screenshots/home-desktop.png)
- [手機首頁](docs/screenshots/home-mobile.png)
- [股票詳情面板](docs/screenshots/stock-detail.png)
