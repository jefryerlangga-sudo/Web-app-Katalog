import assert from 'node:assert/strict';
import test from 'node:test';
import {
  handleAiAssistantQuery,
  keywordFallback,
  runtimeFromEnv,
  toPublicCatalog,
  type AiRuntime,
} from '../src/server/aiHandler.ts';

const catalog = [
  {
    sku: 'ACC-ANK-001',
    name: 'Anker 511 Nano GaN',
    brand: 'Anker',
    category: 'Charger & Adapter',
    positioning: 'Best',
    suggestedRetailPrice: 199000,
    wholesalePrice: 135000,
    stockStatus: 'In Stock',
    compatibility: 'iPhone 15',
    specification: 'GaN 30W',
    sellingPoint1: 'Tidak mudah panas',
    sellingPoint2: 'B',
    sellingPoint3: 'C',
  },
];

function runtime(overrides: Partial<AiRuntime> = {}): AiRuntime {
  return {
    apiKey: '',
    model: 'grok-4.7',
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    fetchImpl: fetch,
    ...overrides,
  };
}

test('runtime reads the key and model from env and defaults the current Grok model', () => {
  const fromEnv = runtimeFromEnv({ XAI_API_KEY: ' secret ', XAI_MODEL: '' });
  assert.equal(fromEnv.apiKey, 'secret');
  assert.equal(fromEnv.model, 'grok-4.7');
  assert.equal(fromEnv.baseUrl, 'https://api.x.ai/v1/chat/completions');
  const custom = runtimeFromEnv({ XAI_API_KEY: 'k', XAI_MODEL: 'grok-4.6', XAI_API_BASE_URL: 'https://example.test/v1' });
  assert.equal(custom.model, 'grok-4.6');
  assert.equal(custom.baseUrl, 'https://example.test/v1');
});

test('public catalog drops dealer cost fields', () => {
  const items = toPublicCatalog(catalog);
  assert.equal(items.length, 1);
  assert.equal('wholesalePrice' in items[0], false);
  assert.equal(items[0].suggestedRetailPrice, 199000);
});

test('missing API key uses keyword search and does not call the network', async () => {
  let called = false;
  const text = await handleAiAssistantQuery(
    { prompt: 'charger iPhone', catalogContext: catalog, viewMode: 'sales' },
    runtime({
      fetchImpl: async () => {
        called = true;
        throw new Error('network should not be used');
      },
    })
  );
  assert.equal(called, false);
  assert.match(text, /ACC-ANK-001/);
  assert.match(text, /199/);
  assert.equal(text.includes('135000'), false);
  assert.equal(text.includes('135.000'), false);
});

test('Grok request sends the key only on the outbound call and keeps dealer cost out of the prompt', async () => {
  let auth = '';
  let body = '';
  const text = await handleAiAssistantQuery(
    { prompt: 'Rekomendasi charger', catalogContext: catalog },
    runtime({
      apiKey: 'xai-test-key',
      model: 'grok-4.7',
      fetchImpl: async (url, init) => {
        auth = String((init?.headers as Record<string, string>).Authorization || '');
        body = String(init?.body || '');
        assert.equal(url, 'https://api.x.ai/v1/chat/completions');
        return new Response(
          JSON.stringify({ choices: [{ message: { content: 'Pakai Anker 511, HET Rp 199.000.' } }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      },
    })
  );
  assert.equal(auth, 'Bearer xai-test-key');
  assert.match(body, /"model":"grok-4\.7"/);
  assert.equal(body.includes('135000'), false);
  assert.equal(body.includes('wholesale'), false);
  assert.match(body, /asisten belanja Partshop\.Katalog/);
  assert.equal(body.includes('PortalTech'), false);
  assert.equal(text, 'Pakai Anker 511, HET Rp 199.000.');
  assert.equal(text.includes('xai-test-key'), false);
});

test('a failed Grok call falls back to the catalog without exposing the key', async () => {
  const text = await handleAiAssistantQuery(
    { prompt: 'Anker', catalogContext: catalog },
    runtime({
      apiKey: 'xai-test-key',
      fetchImpl: async () => new Response('nope', { status: 503 }),
    })
  );
  assert.match(text, /Anker 511/);
  assert.equal(text.includes('xai-test-key'), false);
  assert.equal(keywordFallback('zzz-unknown', toPublicCatalog(catalog)).includes('zzz-unknown'), true);
});
