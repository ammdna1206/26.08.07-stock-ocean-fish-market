import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createApiRouter } from './api';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('此來源未被允許存取 API'));
} }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: '請求過於頻繁，請稍後再試' } }));
app.use('/api', createApiRouter());
const clientDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client');
app.use(express.static(clientDirectory));
app.use((request, response) => {
  if (request.method === 'GET' && request.accepts('html')) {
    return response.sendFile(path.join(clientDirectory, 'index.html'));
  }
  return response.status(404).json({ success: false, data: {}, source: 'SYSTEM', isDemo: false, updatedAt: new Date().toISOString(), message: '找不到 API 路徑' });
});
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => response.status(500).json({ success: false, data: {}, source: 'SYSTEM', isDemo: false, updatedAt: new Date().toISOString(), message: error instanceof Error ? error.message : '伺服器發生未預期錯誤' }));

app.listen(port, () => {
  console.log('股海大江 API 已啟動：http://localhost:' + port);
});

export { app };
