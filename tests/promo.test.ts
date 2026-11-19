import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { priceCart } from '../src/firebase/orderPricing.ts';
import {
  CATALOG_CACHE_CONTROL,
  handleCatalogRequest,
} from '../src/server/catalogHandler.ts';
import {
  listPromoProducts,
  parsePromoCampaign,
  promoCampaign,
  promoStockLabel,
  publicPromoPayload,
  showRetailStrike,
  type PromoCampaign,
} from '../src/lib/promo.ts';
import { Product } from '../src/types/product.ts';

const FORBIDDEN = /wholesalePrice|wholesale|harga_modal|modal_grosir|dealerCost|productAdmin/i;

function catalogProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: overrides.sku || 'PS-FOO-0009',
    sku: 'PS-FOO-0009',
    name: 'Foomee Adapter Charger 20W/Qc 3A CQ15',
    brand: 'Foomee',
    category: 'Charger & Adapter',
    subcategory: 'Charger',
    imageUrl: '',
    specification: '',
    compatibility: 'Type-C',
    sellingPoint1: '',
    sellingPoint2: '',
    sellingPoint3: '',
    suggestedRetailPrice: 88000,
    stockStatus: 'In Stock',
    positioning: 'Better',
    targetCustomer: '',
    isProductFocus: false,
    isBestSeller: false,
    crossSellNotes: '',
    isActive: true,
    ...overrides,
  };
}

test('shipped promo campaign is the 199 public SKUs and has no dealer cost', () => {
  const fileUrl = new URL('../src/data/promo-cuci-gudang.json', import.meta.url);
  const rawText = readFileSync(fileUrl, 'utf8');
  assert.equal(FORBIDDEN.test(rawText), false);
  const parsed = parsePromoCampaign(JSON.parse(rawText));
  assert.equal(parsed.items.length, 199);
  assert.equal(parsed.title, 'List Barang Promo');
  assert.equal(rawText.includes('Cuci Gudang'), false);
  assert.equal(parsed.active, true);
  assert.equal(parsed.minPurchase, 2500000);
  assert.deepEqual(parsed.brands, ['Foomee', 'Olike', 'Rexi', 'Mcdodo', 'Baseus']);
  assert.match(parsed.terms.join(' '), /Rp2\.500\.000/);
  assert.match(parsed.terms.join(' '), /rak display Foomee/);
  assert.match(parsed.terms.join(' '), /tidak kelipatan/);
  assert.match(parsed.terms.join(' '), /selama stok ada/);
  const skus = new Set(parsed.items.map((item) => item.sku));
  assert.equal(skus.size, 199);
  assert.equal(parsed.items.every((item) => item.stock > 0 && item.promoPrice > 0), true);
  const counts = Object.fromEntries(parsed.brands.map((brand) => [brand, 0]));
  for (const item of parsed.items) counts[item.brand] += 1;
  assert.deepEqual(counts, {
    Foomee: 29,
    Olike: 61,
    Rexi: 41,
    Mcdodo: 49,
    Baseus: 19,
  });
});

test('promo list keeps shipped prices after a full product overwrite and hides inactive or missing SKUs', () => {
  const kept = catalogProduct({
    sku: 'PS-FOO-0009',
    id: 'PS-FOO-0009',
    suggestedRetailPrice: 88000,
    isProductFocus: false,
    isBestSeller: false,
  });
  const inactive = catalogProduct({
    sku: 'PS-FOO-0014',
    id: 'PS-FOO-0014',
    isActive: false,
    suggestedRetailPrice: 165000,
  });
  const hiddenCategory = catalogProduct({
    sku: 'PS-FOO-0034',
    id: 'PS-FOO-0034',
    category: 'Braking System',
    suggestedRetailPrice: 42000,
  });
  const unrelated = catalogProduct({
    sku: 'PS-NOT-A-PROMO',
    id: 'PS-NOT-A-PROMO',
    name: 'Bukan promo',
  });

  const listings = listPromoProducts([kept, inactive, hiddenCategory, unrelated]);
  assert.deepEqual(
    listings.map((item) => item.sku),
    ['PS-FOO-0009']
  );
  assert.equal(listings[0].promoPrice, 88000);
  assert.equal(listings[0].promoStock, 1);
  assert.equal(listings[0].showRetailStrike, false);
  assert.equal(promoStockLabel(listings[0].promoStock), 'Sisa 1');
  assert.equal(promoStockLabel(0), 'Stok promo habis');
  assert.equal('wholesalePrice' in listings[0], false);
});

test('strikethrough only when promo price is below suggested retail', () => {
  assert.equal(showRetailStrike(88000, 88000), false);
  assert.equal(showRetailStrike(80000, 88000), true);
  assert.equal(showRetailStrike(90000, 88000), false);

  const cheaperRetailGap = listPromoProducts([
    catalogProduct({ suggestedRetailPrice: 100000 }),
  ]);
  assert.equal(cheaperRetailGap[0].showRetailStrike, true);
  assert.equal(cheaperRetailGap[0].promoPrice, 88000);

  const paused: PromoCampaign = { ...promoCampaign, active: false, items: promoCampaign.items.slice(0, 1) };
  assert.deepEqual(listPromoProducts([catalogProduct()], paused), []);
});

test('every shipped SKU is listed when the catalog copy is active, with no fake discount', () => {
  const products = promoCampaign.items.map((item) =>
    catalogProduct({
      id: item.sku,
      sku: item.sku,
      brand: 'nama lain',
      name: item.sku,
      suggestedRetailPrice: item.promoPrice,
    })
  );
  const listings = listPromoProducts(products);
  assert.equal(listings.length, 199);
  assert.equal(listings.every((item) => item.showRetailStrike === false), true);
  assert.equal(listings.filter((item) => item.brand === 'Mcdodo').length, 49);
  assert.equal(listings[0].brand, 'Foomee');
});

test('checkout still prices the catalog HET and ignores a lower promo figure', () => {
  const product = catalogProduct({
    id: 'PS-FOO-0009',
    sku: 'PS-FOO-0009',
    suggestedRetailPrice: 100000,
  });
  const offer = listPromoProducts([product])[0];
  const priced = priceCart(
    [
      {
        productId: product.id || product.sku,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        imageUrl: '',
        unitPrice: offer.promoPrice,
        quantity: 1,
      },
    ],
    [product]
  );
  assert.equal(priced.items[0].unitPrice, 100000);
  assert.equal(priced.total, 100000);
});

test('GET /api/catalog attaches the promo payload without changing the CDN cache header', async () => {
  const response = await handleCatalogRequest(new Request('https://katalog.local/api/catalog'), {
    fetchImpl: async () =>
      new Response(
        JSON.stringify([
          {
            document: {
              name: 'projects/demo/databases/db/documents/products/PS-FOO-0009',
              fields: {
                sku: { stringValue: 'PS-FOO-0009' },
                name: { stringValue: 'Foomee Adapter' },
                suggestedRetailPrice: { integerValue: '88000' },
                wholesalePrice: { integerValue: '1000' },
                isActive: { booleanValue: true },
              },
            },
          },
        ]),
        { status: 200 }
      ),
    endpoint: 'https://firestore.test/runQuery',
    pageSize: 10,
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), CATALOG_CACHE_CONTROL);
  assert.equal(CATALOG_CACHE_CONTROL, 'public, s-maxage=1800, stale-while-revalidate=86400');
  const body = (await response.json()) as {
    products: Array<Record<string, unknown>>;
    promo: ReturnType<typeof publicPromoPayload>;
  };
  assert.equal(body.products.length, 1);
  assert.equal(body.products[0].sku, 'PS-FOO-0009');
  assert.equal(body.promo.items.length, 199);
  assert.equal(body.promo.title, promoCampaign.title);
  assert.deepEqual(body.promo, publicPromoPayload());
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes('wholesalePrice'), false);
  assert.equal(FORBIDDEN.test(serialized), false);
});
