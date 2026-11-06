import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { handleAiAssistantQuery } from './src/server/aiHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// API Endpoints
app.post('/api/ai-assistant', async (req, res) => {
  try {
    const text = await handleAiAssistantQuery(req.body);
    res.json({ text });
  } catch (error: any) {
    console.error('AI assistant error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

// Serve frontend static build in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Partshop Sales Catalog server running on http://0.0.0.0:${PORT}`);
});
