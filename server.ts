import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleAiAssistantQuery, runtimeFromEnv, type AiRuntime } from './src/server/aiHandler';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppOptions {
  /** Requests per IP per minute. 0 disables the limit (tests). */
  rateLimitPerMinute?: number;
}

export function createApp(runtime: AiRuntime = runtimeFromEnv(), options: AppOptions = {}) {
  const app = express();
  const limit = options.rateLimitPerMinute ?? 30;
  const hits = new Map<string, { count: number; resetAt: number }>();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '512kb' }));

  app.post('/api/ai-assistant', async (req, res) => {
    if (limit > 0) {
      const ip = req.ip || req.socket.remoteAddress || 'local';
      const now = Date.now();
      const bucket = hits.get(ip);
      if (!bucket || bucket.resetAt <= now) {
        hits.set(ip, { count: 1, resetAt: now + 60_000 });
      } else if (bucket.count >= limit) {
        res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
        return;
      } else {
        bucket.count += 1;
      }
    }

    try {
      const text = await handleAiAssistantQuery(req.body, runtime);
      res.json({ text });
    } catch {
      console.error('AI assistant error');
      res.status(500).json({ error: 'Asisten sedang tidak tersedia' });
    }
  });

  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) res.status(404).end();
    });
  });

  return app;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === path.resolve(entry);
}

if (isDirectRun()) {
  const PORT = process.env.PORT || 3000;
  createApp().listen(PORT, () => {
    console.log(`PortalTech Catalog server running on http://0.0.0.0:${PORT}`);
  });
}
