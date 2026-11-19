import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { endUserPrice } from '../src/config/pricing.ts';
import { promoCampaign, publicPromoPayload } from '../src/server/promoCampaign.ts';
import {
  CATALOG_CACHE_CONTROL,
  fetchActiveCatalog,
  handleCatalogRequest,
  type FetchActiveCatalogOptions,
} from '../src/server/catalogHandler.ts';

function allow(tier: 'grosir' | 'end_user') {
  return async () => ({ ok: true as const, access: { tier } });
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
    authorize: allow('grosir'),
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
  assert.equal(response.headers.get('Vary'), 'Authorization');
  assert.equal(CATALOG_CACHE_CONTROL.includes('s-maxage'), false);
  const body = (await response.json()) as { products: Array<Record<string, unknown>>; tier: string };
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
  const access = readFileSync(new URL('../src/server/catalogAccess.ts', import.meta.url), 'utf8');
  const express = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(source, /export function GET/);
  assert.match(handler, /documents:runQuery/);
  assert.match(handler, /private, no-store/);
  assert.match(handler, /authorizeCatalogRequest/);
  assert.match(access, /accounts:lookup/);
  assert.equal(handler.includes('s-maxage'), false);
  assert.equal(handler.includes("from 'firebase/"), false);
  assert.match(express, /app\.get\('\/api\/catalog'/);
  assert.match(express, /incomingCatalogRequest/);
});

test('catalog rejects logged-out, pending, and rejected callers with no product data', async () => {
  let queries = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('accounts:lookup')) {
      return new Response(
        JSON.stringify({
          users: [{ localId: 'buyer-1', email: 'buyer@example.com', emailVerified: true }],
        }),
        { status: 200 }
      );
    }
    if (url.includes('/documents/users/')) {
      return new Response(
        JSON.stringify({ fields: { role: { stringValue: role } } }),
        { status: role ? 200 : 404 }
      );
    }
    queries += 1;
    return new Response('[]', { status: 200 });
  };

  const anonymous = await handleCatalogRequest(new Request('https://katalog.local/api/catalog'), { fetchImpl });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.headers.get('Cache-Control'), 'private, no-store');
  const anonymousBody = await anonymous.json();
  assert.equal(JSON.stringify(anonymousBody).includes('sku'), false);
  assert.equal('products' in (anonymousBody as object), false);
  assert.equal(queries, 0);

  let role: string | null = 'pending';
  const pending = await handleCatalogRequest(
    new Request('https://katalog.local/api/catalog', { headers: { Authorization: 'Bearer token' } }),
    { fetchImpl }
  );
  assert.equal(pending.status, 403);
  assert.equal(JSON.stringify(await pending.json()).includes('sku'), false);
  assert.equal(queries, 0);

  role = 'rejected';
  const rejected = await handleCatalogRequest(
    new Request('https://katalog.local/api/catalog', { headers: { Authorization: 'Bearer token' } }),
    { fetchImpl }
  );
  assert.equal(rejected.status, 403);
  await rejected.json();

  role = null;
  const missing = await handleCatalogRequest(
    new Request('https://katalog.local/api/catalog', { headers: { Authorization: 'Bearer token' } }),
    { fetchImpl }
  );
  assert.equal(missing.status, 403);
  await missing.json();
  assert.equal(queries, 0);
});

test('a Firestore quota failure is not described as a rejected account', async () => {
  let queries = 0;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('accounts:lookup')) {
      return new Response(
        JSON.stringify({
          users: [{ localId: 'buyer-1', email: 'buyer@example.com', emailVerified: true }],
        }),
        { status: 200 }
      );
    }
    if (url.includes('/documents/users/')) {
      return new Response('quota', { status: 429 });
    }
    queries += 1;
    return new Response('[]', { status: 200 });
  };
  const response = await handleCatalogRequest(
    new Request('https://katalog.local/api/catalog', { headers: { Authorization: 'Bearer token' } }),
    { fetchImpl }
  );
  assert.equal(response.status, 502);
  const body = (await response.json()) as { error?: string; products?: unknown };
  assert.equal(body.error, 'Katalog tidak dapat dimuat');
  assert.equal(body.products, undefined);
  assert.equal(queries, 0);
});

test('grosir keeps the selling price and end user pays 30 percent rounded up', async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('accounts:lookup')) {
      return new Response(
        JSON.stringify({
          users: [{ localId: 'buyer-1', email, emailVerified: true }],
        }),
        { status: 200 }
      );
    }
    if (url.includes('/documents/users/')) {
      return new Response(JSON.stringify({ fields: { role: { stringValue: role } } }), { status: 200 });
    }
    return new Response(
      JSON.stringify([
        document('PS-1', {
          sku: text('PS-1'),
          name: text('Kabel'),
          suggestedRetailPrice: integer(10001),
          wholesalePrice: integer(4000),
          isActive: flag(true),
        }),
      ]),
      { status: 200 }
    );
  };

  let role = 'grosir';
  let email = 'grosir@example.com';
  const grosir = await handleCatalogRequest(
    new Request('https://katalog.local/api/catalog', { headers: { Authorization: 'Bearer token' } }),
    { fetchImpl }
  );
  assert.equal(grosir.status, 200);
  const grosirBody = (await grosir.json()) as {
    tier: string;
    products: Array<{ suggestedRetailPrice: number }>;
    promo: { minPurchase: number; items: Array<{ promoPrice: number }> };
  };
  assert.equal(grosirBody.tier, 'grosir');
  assert.equal(grosirBody.products[0].suggestedRetailPrice, 10001);
  assert.equal(grosirBody.promo.items[0].promoPrice, promoCampaign.items[0].promoPrice);
  assert.equal(grosirBody.promo.minPurchase, promoCampaign.minPurchase);
  assert.equal(JSON.stringify(grosirBody).includes('wholesalePrice'), false);

  role = 'customer';
  const legacy = await handleCatalogRequest(
    new Request('https://katalog.local/api/catalog', { headers: { Authorization: 'Bearer token' } }),
    { fetchImpl }
  );
  const legacyBody = (await legacy.json()) as { products: Array<{ suggestedRetailPrice: number }> };
  assert.equal(legacy.status, 200);
  assert.equal(legacyBody.products[0].suggestedRetailPrice, 10001);

  role = 'end_user';
  const endUser = await handleCatalogRequest(
    new Request('https://katalog.local/api/catalog', { headers: { Authorization: 'Bearer token' } }),
    { fetchImpl }
  );
  const endBody = (await endUser.json()) as {
    tier: string;
    products: Array<{ suggestedRetailPrice: number }>;
    promo: { minPurchase: number; items: Array<{ sku: string; promoPrice: number }> };
  };
  assert.equal(endUser.status, 200);
  assert.equal(endBody.tier, 'end_user');
  assert.equal(endBody.products[0].suggestedRetailPrice, endUserPrice(10001));
  assert.equal(endBody.products[0].suggestedRetailPrice, 13100);
  assert.equal(endBody.promo.items[0].promoPrice, endUserPrice(promoCampaign.items[0].promoPrice));
  assert.equal(endBody.promo.minPurchase, endUserPrice(promoCampaign.minPurchase));
  assert.equal(JSON.stringify(endBody).includes('wholesalePrice'), false);

  role = 'pending';
  email = 'jefryerlangga@gmail.com';
  const admin = await handleCatalogRequest(
    new Request('https://katalog.local/api/catalog', { headers: { Authorization: 'Bearer token' } }),
    { fetchImpl }
  );
  const adminBody = (await admin.json()) as { tier: string; products: Array<{ suggestedRetailPrice: number }> };
  assert.equal(admin.status, 200);
  assert.equal(adminBody.tier, 'grosir');
  assert.equal(adminBody.products[0].suggestedRetailPrice, 10001);
  assert.deepEqual(publicPromoPayload().items[0].promoPrice, promoCampaign.items[0].promoPrice);
});
