import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createApp } from '../server.ts';
import { MAX_AI_BODY_BYTES, type AiRuntime } from '../src/server/aiHandler.ts';

const catalog = [
  {
    sku: 'ACC-ROB-103',
    name: 'Robot Kabel Type-C',
    brand: 'Robot',
    category: 'Kabel Data & Charging',
    positioning: 'Good',
    suggestedRetailPrice: 25000,
    wholesalePrice: 12000,
    stockStatus: 'In Stock',
    compatibility: 'Android Type-C',
    specification: '2.4A',
    sellingPoint1: 'Lentur',
    sellingPoint2: 'B',
    sellingPoint3: 'C',
  },
];

async function withServer(runtime: AiRuntime, fn: (base: string) => Promise<void>) {
  const server = createApp(runtime, { rateLimitPerMinute: 0 }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('POST /api/ai-assistant falls back when no key is configured', async () => {
  let called = false;
  await withServer(
    {
      apiKey: '',
      model: 'grok-4.7',
      baseUrl: 'https://api.x.ai/v1/chat/completions',
      fetchImpl: async () => {
        called = true;
        throw new Error('should not fetch');
      },
    },
    async (base) => {
      const res = await fetch(`${base}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'kabel type-c', catalogContext: catalog }),
      });
      assert.equal(res.status, 200);
      const payload = (await res.json()) as { text: string };
      assert.match(payload.text, /ACC-ROB-103/);
      assert.equal(JSON.stringify(payload).includes('12000'), false);
      assert.equal(called, false);
    }
  );
});

test('POST /api/ai-assistant returns mocked Grok text and hides the API key', async () => {
  const secret = 'xai-live-looking-key';
  let seenAuth = '';
  await withServer(
    {
      apiKey: secret,
      model: 'grok-4.6',
      baseUrl: 'https://api.x.ai/v1/chat/completions',
      fetchImpl: async (_url, init) => {
        seenAuth = String((init?.headers as Record<string, string>).Authorization || '');
        const requestBody = String(init?.body || '');
        assert.match(requestBody, /grok-4\.6/);
        assert.equal(requestBody.includes('wholesalePrice'), false);
        assert.equal(requestBody.includes('12000'), false);
        return new Response(
          JSON.stringify({ choices: [{ message: { content: 'Kabel Robot, HET Rp 25.000.' } }] }),
          { status: 200 }
        );
      },
    },
    async (base) => {
      const res = await fetch(`${base}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'kabel', catalogContext: catalog, viewMode: 'sales' }),
      });
      const raw = await res.text();
      assert.equal(res.status, 200);
      assert.equal(raw.includes(secret), false);
      assert.match(raw, /Kabel Robot/);
      assert.equal(seenAuth, `Bearer ${secret}`);
    }
  );
});

test('POST /api/ai-assistant rate limit returns 429', async () => {
  const server = createApp(
    {
      apiKey: '',
      model: 'grok-4.7',
      baseUrl: 'https://api.x.ai/v1/chat/completions',
      fetchImpl: fetch,
    },
    { rateLimitPerMinute: 1 }
  ).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  try {
    const body = JSON.stringify({ prompt: 'halo', catalogContext: [] });
    const first = await fetch(`http://127.0.0.1:${port}/api/ai-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const second = await fetch(`http://127.0.0.1:${port}/api/ai-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('POST /api/ai-assistant rejects invalid JSON', async () => {
  await withServer(
    {
      apiKey: '',
      model: 'grok-4.7',
      baseUrl: 'https://api.x.ai/v1/chat/completions',
      fetchImpl: async () => {
        throw new Error('should not fetch');
      },
    },
    async (base) => {
      const res = await fetch(`${base}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      });
      assert.equal(res.status, 400);
      assert.equal(await res.text(), JSON.stringify({ error: 'JSON tidak valid' }));
    }
  );
});

test('POST /api/ai-assistant rejects a body over 512kb', async () => {
  await withServer(
    {
      apiKey: 'xai-should-not-leak',
      model: 'grok-4.7',
      baseUrl: 'https://api.x.ai/v1/chat/completions',
      fetchImpl: async () => {
        throw new Error('should not fetch');
      },
    },
    async (base) => {
      const res = await fetch(`${base}/api/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'a'.repeat(MAX_AI_BODY_BYTES) }),
      });
      const raw = await res.text();
      assert.equal(res.status, 413);
      assert.equal(raw, JSON.stringify({ error: 'Permintaan terlalu besar' }));
      assert.equal(raw.includes('xai-should-not-leak'), false);
    }
  );
});
