import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import handler, { handleAiAssistantRequest, POST } from '../api/ai-assistant.ts';
import {
  MAX_AI_BODY_BYTES,
  type AiRuntime,
} from '../src/server/aiHandler.ts';

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

function runtime(overrides: Partial<AiRuntime> = {}): AiRuntime {
  return {
    apiKey: '',
    model: 'grok-4.7',
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    fetchImpl: async () => {
      throw new Error('should not fetch');
    },
    ...overrides,
  };
}

function requestFor(method: string, body?: string, contentType: string | null = 'application/json'): Request {
  const headers = new Headers();
  if (contentType) headers.set('content-type', contentType);
  return new Request('https://katalog.local/api/ai-assistant', {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });
}

test('vercel.json builds the Vite SPA and leaves /api to the function', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    framework: string;
    buildCommand: string;
    outputDirectory: string;
    rewrites: Array<{ source: string; destination: string }>;
    builds?: unknown;
    routes?: unknown;
  };
  assert.equal(config.framework, 'vite');
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  assert.equal('builds' in config, false);
  assert.equal('routes' in config, false);
  assert.deepEqual(config.rewrites, [
    { source: '/:path((?!api/).*)', destination: '/index.html' },
  ]);

  const source = readFileSync(new URL('../api/ai-assistant.ts', import.meta.url), 'utf8');
  assert.match(source, /export\s+(?:async\s+)?function\s+POST\b/);
  assert.match(source, /export\s+default\b/);
  assert.match(source, /handleAiAssistantQuery/);
  assert.match(source, /runtimeFromEnv/);
  assert.match(source, /XAI_API_KEY/);
  assert.equal(source.includes('VITE_XAI'), false);
  assert.equal(source.includes('import.meta.env'), false);
  assert.doesNotMatch(source, /from\s+['"]express['"]/);
  assert.doesNotMatch(source, /from\s+['"]\.\.\/server/);
});

test('POST falls back to the catalog when no key is configured', async () => {
  let called = false;
  const response = await handleAiAssistantRequest(
    requestFor('POST', JSON.stringify({ prompt: 'kabel type-c', catalogContext: catalog })),
    runtime({
      fetchImpl: async () => {
        called = true;
        throw new Error('should not fetch');
      },
    })
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as { text: string };
  assert.match(payload.text, /ACC-ROB-103/);
  assert.equal(JSON.stringify(payload).includes('12000'), false);
  assert.equal(called, false);
});

test('POST returns mocked Grok text and hides the API key', async () => {
  const secret = 'xai-live-looking-key';
  let seenAuth = '';
  const response = await handleAiAssistantRequest(
    requestFor(
      'POST',
      JSON.stringify({ prompt: 'kabel', catalogContext: catalog, viewMode: 'sales' })
    ),
    runtime({
      apiKey: secret,
      model: 'grok-4.6',
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
    })
  );
  const raw = await response.text();
  assert.equal(response.status, 200);
  assert.equal(raw.includes(secret), false);
  assert.match(raw, /Kabel Robot/);
  assert.equal(seenAuth, `Bearer ${secret}`);
});

test('a failed Grok call falls back without exposing the key', async () => {
  const secret = 'xai-test-key';
  const response = await handleAiAssistantRequest(
    requestFor('POST', JSON.stringify({ prompt: 'Robot', catalogContext: catalog })),
    runtime({
      apiKey: secret,
      fetchImpl: async () => new Response('nope', { status: 503 }),
    })
  );
  const raw = await response.text();
  assert.equal(response.status, 200);
  assert.match(raw, /Robot Kabel/);
  assert.equal(raw.includes(secret), false);
});

test('POST reads XAI_API_KEY from the server environment and does not return it', async () => {
  const previousKey = process.env.XAI_API_KEY;
  const previousFetch = globalThis.fetch;
  const secret = 'env-only-secret';
  let seenAuth = '';
  process.env.XAI_API_KEY = secret;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    seenAuth = new Headers(init?.headers).get('authorization') || '';
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'Jawaban dari env.' } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }) as typeof fetch;
  try {
    const response = await POST(
      requestFor('POST', JSON.stringify({ prompt: 'halo', catalogContext: [] }))
    );
    const raw = await response.text();
    assert.equal(response.status, 200);
    assert.equal(seenAuth, `Bearer ${secret}`);
    assert.equal(raw.includes(secret), false);
    assert.match(raw, /Jawaban dari env/);
  } finally {
    if (previousKey === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
});

test('oversized, invalid, and non-JSON bodies match the Express limits', async () => {
  let queries = 0;
  const query = async () => {
    queries += 1;
    return 'should not run';
  };
  const over = `${' '.repeat(MAX_AI_BODY_BYTES - 1)}{}`;
  assert.equal(new TextEncoder().encode(over).byteLength, MAX_AI_BODY_BYTES + 1);
  const tooBig = await handleAiAssistantRequest(requestFor('POST', over), runtime(), query);
  assert.equal(tooBig.status, 413);
  assert.equal((await tooBig.json()).error, 'Permintaan terlalu besar');

  const exact = `${' '.repeat(MAX_AI_BODY_BYTES - 2)}{}`;
  assert.equal(new TextEncoder().encode(exact).byteLength, MAX_AI_BODY_BYTES);
  const atLimit = await handleAiAssistantRequest(
    requestFor('POST', exact),
    runtime(),
    async () => 'muat'
  );
  assert.equal(atLimit.status, 200);
  assert.equal((await atLimit.json()).text, 'muat');

  const invalid = await handleAiAssistantRequest(requestFor('POST', '{'), runtime(), query);
  assert.equal(invalid.status, 400);
  const scalar = await handleAiAssistantRequest(requestFor('POST', '12'), runtime(), query);
  assert.equal(scalar.status, 400);

  const empty = await handleAiAssistantRequest(requestFor('POST', ''), runtime());
  assert.equal(empty.status, 200);
  assert.match((await empty.json()).text, /Tulis pertanyaan/);

  const ignored = await handleAiAssistantRequest(
    requestFor('POST', JSON.stringify({ prompt: 'kabel type-c', catalogContext: catalog }), null),
    runtime()
  );
  assert.equal(ignored.status, 200);
  assert.match((await ignored.json()).text, /Tulis pertanyaan/);
  assert.equal(queries, 0);
});

test('non-POST requests are rejected and unexpected failures hide the key', async () => {
  const secret = 'xai-secret-key';
  for (const send of [handleAiAssistantRequest, POST, handler.fetch]) {
    const response = await send(requestFor('GET'));
    assert.equal(response.status, 405);
    await response.text();
  }
  const failed = await handleAiAssistantRequest(
    requestFor('POST', JSON.stringify({ prompt: 'halo' })),
    runtime({ apiKey: secret }),
    async () => {
      throw new Error(`boom ${secret}`);
    }
  );
  const raw = await failed.text();
  assert.equal(failed.status, 500);
  assert.equal(raw, JSON.stringify({ error: 'Asisten sedang tidak tersedia' }));
  assert.equal(raw.includes(secret), false);
});

test('the function bundles as ESM and does not pull the Express server', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portaltech-ai-fn-'));
  const outfile = join(directory, 'ai-assistant.mjs');
  try {
    await build({
      absWorkingDir: fileURLToPath(new URL('..', import.meta.url)),
      entryPoints: ['api/ai-assistant.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      outfile,
      logLevel: 'silent',
    });
    const bundled = await readFile(outfile, 'utf8');
    assert.doesNotMatch(bundled, /from\s+['"]express['"]/);
    assert.doesNotMatch(bundled, /require\(['"]express['"]\)/);
    assert.doesNotMatch(bundled, /from\s+['"]firebase['"]/);
    assert.equal(bundled.includes('VITE_XAI'), false);
    assert.match(bundled, /XAI_API_KEY/);
    assert.match(bundled, /export\s*\{/);
    assert.ok(bundled.length < 100_000);

    const mod = (await import(pathToFileURL(outfile).href)) as {
      handleAiAssistantRequest: typeof handleAiAssistantRequest;
      POST: typeof POST;
      default: { fetch: typeof handler.fetch };
    };
    let called = false;
    const response = await mod.handleAiAssistantRequest(
      requestFor('POST', JSON.stringify({ prompt: 'kabel type-c', catalogContext: catalog })),
      runtime({
        fetchImpl: async () => {
          called = true;
          throw new Error('should not fetch');
        },
      })
    );
    const payload = (await response.json()) as { text: string };
    assert.equal(response.status, 200);
    assert.match(payload.text, /ACC-ROB-103/);
    assert.equal(payload.text.includes('12000'), false);
    assert.equal(called, false);
    const denied = await mod.default.fetch(requestFor('GET'));
    assert.equal(denied.status, 405);
    assert.equal(typeof mod.POST, 'function');
    assert.equal(typeof mod.default.fetch, 'function');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
