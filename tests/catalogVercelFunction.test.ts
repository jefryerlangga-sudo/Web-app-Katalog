import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { endUserPrice } from '../src/config/pricing.ts';
import { CATALOG_CACHE_CONTROL } from '../src/server/catalogHandler.ts';
import { promoCampaign } from '../src/server/promoCampaign.ts';

const root = fileURLToPath(new URL('..', import.meta.url));

/**
 * Vercel (nodejs) compiles api/catalog.ts into separate ESM files under /var/task
 * and rewrites `.ts` specifiers to `.js`. It does not bundle them, and Node does
 * not resolve an extensionless relative import. This test follows only explicit
 * `.ts` / `.json` specifiers, then loads the compiled GET handler.
 */
function specifiers(source: string): string[] {
  const found: string[] = [];
  for (const pattern of [/from\s+['"](\.[^'"]+)['"]/g, /import\s+['"](\.[^'"]+)['"]/g]) {
    for (const match of source.matchAll(pattern)) found.push(match[1]);
  }
  return found;
}

function resolveRelative(fromFile: string, specifier: string): string {
  const raw = join(dirname(fromFile), specifier).replaceAll('\\', '/');
  const parts: string[] = [];
  for (const part of raw.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

async function walk(rel: string, seen: Set<string>, tsFiles: string[], jsonFiles: string[]) {
  if (seen.has(rel)) return;
  seen.add(rel);
  if (rel.endsWith('.json')) {
    jsonFiles.push(rel);
    return;
  }
  if (!rel.endsWith('.ts')) return;
  tsFiles.push(rel);
  const source = await readFile(join(root, rel), 'utf8');
  for (const specifier of specifiers(source)) {
    const next = resolveRelative(rel, specifier);
    if (next.endsWith('.ts') || next.endsWith('.json')) {
      await walk(next, seen, tsFiles, jsonFiles);
    }
  }
}

function text(value: string) {
  return { stringValue: value };
}

function integer(value: number) {
  return { integerValue: String(value) };
}

function flag(value: boolean) {
  return { booleanValue: value };
}

test('compiled api/catalog.js loads the way the Vercel Node function does', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portaltech-catalog-fn-'));
  const previousFetch = globalThis.fetch;
  try {
    const tsFiles: string[] = [];
    const jsonFiles: string[] = [];
    await walk('api/catalog.ts', new Set(), tsFiles, jsonFiles);

    await build({
      absWorkingDir: root,
      entryPoints: tsFiles,
      bundle: false,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      outdir: directory,
      outbase: '.',
      logLevel: 'silent',
    });

    const emittedJs: string[] = [];
    for (const rel of tsFiles) {
      const jsRel = rel.replace(/\.ts$/, '.js');
      const abs = join(directory, jsRel);
      const source = (await readFile(abs, 'utf8')).replaceAll('.ts"', '.js"').replaceAll(".ts'", ".js'");
      await writeFile(abs, source);
      emittedJs.push(jsRel);
    }
    for (const rel of jsonFiles) {
      await mkdir(join(directory, dirname(rel)), { recursive: true });
      await writeFile(join(directory, rel), await readFile(join(root, rel)));
    }

    const extensionless: string[] = [];
    for (const rel of emittedJs) {
      const source = await readFile(join(directory, rel), 'utf8');
      for (const specifier of specifiers(source)) {
        if (!specifier.endsWith('.js') && !specifier.endsWith('.json')) {
          extensionless.push(`${rel} imports ${specifier}`);
        }
      }
    }
    assert.deepEqual(extensionless, []);
    assert.equal(existsSync(join(directory, 'src/lib/promo.js')), false);
    assert.equal(existsSync(join(directory, 'src/server/promoCampaign.js')), true);
    assert.equal(existsSync(join(directory, 'src/data/promo-cuci-gudang.json')), true);
    assert.equal(existsSync(join(directory, 'firebase-applet-config.json')), true);

    let fetches = 0;
    let productQueries = 0;
    let roleReads = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetches += 1;
      if (url.includes('accounts:lookup')) {
        const body = JSON.parse(String(init?.body || '{}')) as { idToken?: string };
        const end = body.idToken === 'end-token';
        return new Response(
          JSON.stringify({
            users: [
              {
                localId: end ? 'end-user' : 'grosir-user',
                email: end ? 'end@example.com' : 'buyer@example.com',
                emailVerified: true,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/documents/users/')) {
        roleReads += 1;
        const end = url.includes('end-user');
        return new Response(
          JSON.stringify({ fields: { role: { stringValue: end ? 'end_user' : 'grosir' } } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      productQueries += 1;
      return new Response(
        JSON.stringify([
          {
            document: {
              name: 'projects/demo/databases/db/documents/products/PS-FOO-0009',
              fields: {
                sku: text('PS-FOO-0009'),
                name: text('Foomee Adapter'),
                suggestedRetailPrice: integer(88000),
                wholesalePrice: integer(1000),
                isActive: flag(true),
              },
            },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const mod = (await import(pathToFileURL(join(directory, 'api/catalog.js')).href)) as {
      GET: (request: Request) => Promise<Response>;
      HEAD: (request: Request) => Promise<Response>;
      default: { fetch: (request: Request) => Promise<Response> };
    };
    const locked = await mod.GET(new Request('https://katalog.local/api/catalog'));
    assert.equal(locked.status, 401);
    assert.equal(locked.headers.get('Cache-Control'), CATALOG_CACHE_CONTROL);
    assert.equal(JSON.stringify(await locked.json()).includes('sku'), false);
    assert.equal(fetches, 0);

    const grosirAuth = { headers: { Authorization: 'Bearer grosir-token' } };
    const endAuth = { headers: { Authorization: 'Bearer end-token' } };
    const stamp = Date.now();
    const response = await mod.GET(new Request(`https://katalog.local/api/catalog?v=${stamp}`, grosirAuth));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), CATALOG_CACHE_CONTROL);
    assert.equal(response.headers.get('Vary'), 'Authorization');
    assert.equal(String(response.headers.get('Cache-Control')).includes('s-maxage'), false);
    const body = (await response.json()) as {
      tier: string;
      products: Array<Record<string, unknown>>;
      promo: { title: string; items: Array<{ promoPrice: number }> };
    };
    assert.equal(body.tier, 'grosir');
    assert.equal(body.products.length, 1);
    assert.equal(body.products[0].sku, 'PS-FOO-0009');
    assert.equal(body.products[0].suggestedRetailPrice, 88000);
    assert.equal(body.promo.title, 'List Barang Promo');
    assert.equal(body.promo.items.length, 199);
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes('wholesalePrice'), false);
    assert.equal(serialized.includes('Cuci Gudang'), false);
    assert.equal(fetches > 0, true);

    const endUser = await mod.GET(new Request('https://katalog.local/api/catalog', endAuth));
    const endBody = (await endUser.json()) as {
      products: Array<{ suggestedRetailPrice: number }>;
      promo: { items: Array<{ promoPrice: number }> };
    };
    assert.equal(endUser.status, 200);
    assert.equal(endBody.products[0].suggestedRetailPrice, endUserPrice(88000));
    assert.equal(endBody.promo.items[0].promoPrice, endUserPrice(promoCampaign.items[0].promoPrice));

    const head = await mod.HEAD(
      new Request('https://katalog.local/api/catalog', { method: 'HEAD', headers: grosirAuth.headers })
    );
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('Cache-Control'), CATALOG_CACHE_CONTROL);
    assert.equal(await head.text(), '');

    const viaDefault = await mod.default.fetch(new Request('https://katalog.local/api/catalog', grosirAuth));
    assert.equal(viaDefault.status, 200);
    await viaDefault.text();
    assert.equal(productQueries, 1);
    assert.equal(roleReads, 2);
  } finally {
    globalThis.fetch = previousFetch;
    await rm(directory, { recursive: true, force: true });
  }
});

test('customer-facing promo title is List Barang Promo', () => {
  const home = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/PromoPage.tsx', import.meta.url), 'utf8');
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
  assert.match(home, /\{promo\.title\}/);
  assert.equal(home.includes('Cuci Gudang'), false);
  assert.equal(page.includes('Cuci Gudang'), false);
  assert.match(page, /promo\?\.title/);
  assert.match(header, />\s*PROMO\s*</);
});
