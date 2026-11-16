import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  CATALOG_CACHE_CONTROL,
  fetchActiveCatalog,
  handleCatalogRequest,
  type FetchActiveCatalogOptions,
} from '../src/server/catalogHandler.ts';

function text(value: string) {
  return { stringValue: value };
}

function integer(value: number) {
  return { integerValue: String(value) };
}

function flag(value: boolean) {
  return { booleanValue: value };
}

function document(id: string, fields: Record<string, unknown>) {
  return {
    document: {
      name: `projects/demo/databases/db/documents/products/${id}`,
      fields,
    },
  };
}

test('catalog pages through Firestore and drops inactive rows and wholesalePrice', async () => {
  const bodies: Array<{ structuredQuery: { startAt?: { before: boolean; values: Array<{ referenceValue: string }> } } }> = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body || '{}')));
    if (bodies.length === 1) {
      return new Response(
        JSON.stringify([
          document('A', {
            sku: text('A'),
            name: text('Alpha'),
            suggestedRetailPrice: integer(1000),
            wholesalePrice: integer(400),
            isActive: flag(true),
            imageUrl: text(''),
          }),
          document('B', {
            sku: text('B'),
            name: text('Beta'),
            suggestedRetailPrice: integer(2000),
            wholesalePrice: { doubleValue: 900 },
            isActive: flag(false),
          }),
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify([
        document('C', {
          sku: text('C'),
          name: text('Gamma'),
          suggestedRetailPrice: integer(3000),
          isActive: flag(true),
          dealerCost: integer(1),
        }),
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const options: FetchActiveCatalogOptions = {
    fetchImpl,
    endpoint: 'https://firestore.test/runQuery',
    pageSize: 2,
  };
  const products = await fetchActiveCatalog(options);
  assert.deepEqual(
    products.map((product) => product.sku),
    ['A', 'C']
  );
  assert.equal(products[0].suggestedRetailPrice, 1000);
  assert.equal(products[0].imageUrl, '');
  assert.equal('wholesalePrice' in products[0], false);
  assert.equal('dealerCost' in products[0], false);
  assert.equal(JSON.stringify(products).includes('wholesalePrice'), false);
  assert.equal(bodies[1].structuredQuery.startAt?.before, false);
  assert.match(bodies[1].structuredQuery.startAt?.values[0].referenceValue || '', /\/products\/B$/);
});

test('GET /api/catalog returns public JSON with the shared cache header', async () => {
  const response = await handleCatalogRequest(new Request('https://katalog.local/api/catalog'), {
    fetchImpl: async () =>
      new Response(
        JSON.stringify([
          document('ACC-1', {
            sku: text('ACC-1'),
            name: text('Charger'),
            suggestedRetailPrice: integer(15000),
            wholesalePrice: { doubleValue: 8000 },
            isActive: flag(true),
          }),
        ]),
        { status: 200 }
      ),
    endpoint: 'https://firestore.test/runQuery',
    pageSize: 10,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), CATALOG_CACHE_CONTROL);
  const body = (await response.json()) as { products: Array<Record<string, unknown>> };
  assert.equal(body.products.length, 1);
  assert.equal(body.products[0].sku, 'ACC-1');
  assert.equal(Object.prototype.hasOwnProperty.call(body.products[0], 'wholesalePrice'), false);
  assert.equal(JSON.stringify(body).includes('wholesalePrice'), false);
});

test('catalog route stays outside the SPA rewrite and does not use the client SDK', () => {
  const vercel = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  assert.match(vercel, /\(\?!api\/\)/);
  const source = readFileSync(new URL('../api/catalog.ts', import.meta.url), 'utf8');
  const handler = readFileSync(new URL('../src/server/catalogHandler.ts', import.meta.url), 'utf8');
  const express = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(source, /export function GET/);
  assert.match(handler, /documents:runQuery/);
  assert.match(handler, /s-maxage=1800, stale-while-revalidate=86400/);
  assert.equal(handler.includes("from 'firebase/"), false);
  assert.match(express, /app\.get\('\/api\/catalog'/);
});
