# 公開後端部署

GitHub Pages 只能執行前端，若要讓分享網址查詢完整上市／上櫃行情，需另外部署本專案的 Express API。

## Render Blueprint

本專案已提供：

- `Dockerfile`
- `render.yaml`
- `/api/health` 健康檢查
- TWSE／TPEx 官方 Provider
- SQLite 同日期快取
- CORS 來源限制與請求頻率限制

在 Render 建立 Blueprint，選擇本 GitHub Repository 後，Render 會依照 `render.yaml` 建立 Web Service。部署完成後，以 Render 提供的服務網址測試：

```text
https://<render-service>.onrender.com/api/health
```

回應應包含：

```json
{
  "success": true,
  "data": { "status": "ok" }
}
```

## 公開前端連線

取得 Render API 網址後，在 GitHub Actions 的 Pages 建置環境設定：

```text
VITE_STATIC_DEMO=false
VITE_API_BASE_URL=https://<render-service>.onrender.com/api
```

之後重新執行 Pages 部署，公開網址就會改用 Express API，查詢數量可與本機端相同。

Render 免費方案的檔案系統為暫存性質；SQLite 快取在服務重啟後會重新建立，資料仍會由官方 Provider 重新取得。若需要長期保存快取，應改用 PostgreSQL 或具備持久磁碟的方案。
