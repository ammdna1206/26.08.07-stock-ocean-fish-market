# API 說明

基礎網址：`http://localhost:4000/api`

## `GET /market/dates/:date`

日期接受西元或民國年，分隔符可用 `-`、`/`、`.`。回傳 `isTradingDay`、`previousTradingDay`、`nextTradingDay`。

## `GET /market/dates/:date/stocks`

回傳 `data.stocks`、`total`、`totalBeforeFilter`、`industries`。查詢參數：

```text
market=ALL|TWSE|TPEx
industry=半導體業
direction=ALL|UP|DOWN|FLAT
minVolume=0&maxVolume=1000000
minChangeRate=-5&maxChangeRate=5
search=2330
sort=turnover|changeDesc|changeAsc|name|symbol
page=1&pageSize=180
```

## `GET /market/dates/:date/summary`

回傳市場統計、排行、產業平均與上市／上櫃比較。

## `GET /stocks/:symbol`

可使用 `?date=YYYY-MM-DD` 指定查詢日。未提供的估值或成交欄位保持 `null`，前端顯示「資料來源未提供」。

## `GET /stocks/:symbol/history`

參數 `days` 限制在 5 至 60。示範資料提供近期走勢；官方資料模式在歷史資料尚未串接時回傳空陣列並說明原因，不製造數字。

## Provider 擴充

實作 `MarketDataProvider` 的 `fetchDaily(date)`，將來源欄位清理成 `StockQuote`，再於 `MarketService` 注入即可替換資料來源。SQLite 的 `daily_cache` 與 `history_cache` 不依賴特定 Provider，未來可將 `MarketDatabase` 換成 PostgreSQL repository。
