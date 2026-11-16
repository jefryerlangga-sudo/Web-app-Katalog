import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  applyDealerCost,
  planActiveToggle,
  readPublicProduct,
  splitCatalogWrite,
} from '../src/firebase/productRecord.ts';
import { Product } from '../src/types/product.ts';

function sample(overrides: Partial<Product> = {}): Product {
  return {
    id: 'ACC-ANK-001',
    sku: 'ACC-ANK-001',
    name: 'Anker 511 Nano',
    brand: 'Anker',
    category: 'Charger & Adapter',
    subcategory: 'Fast Charger GaN',
    imageUrl: 'https://example.com/a.jpg',
    specification: 'GaN',
    compatibility: 'iPhone',
    sellingPoint1: 'A',
    sellingPoint2: 'B',
    sellingPoint3: 'C',
    wholesalePrice: 135000,
    suggestedRetailPrice: 199000,
    stockStatus: 'In Stock',
    positioning: 'Best',
    targetCustomer: 'Konter HP',
    isProductFocus: true,
    isBestSeller: true,
    crossSellNotes: '',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('public catalog writes omit wholesale price and keep retail price', () => {
  const { publicData, adminData } = splitCatalogWrite(sample(), '2026-11-16T00:00:00.000Z');
  assert.equal('wholesalePrice' in publicData, false);
  assert.equal(publicData.suggestedRetailPrice, 199000);
  assert.equal(publicData.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(publicData.updatedAt, '2026-11-16T00:00:00.000Z');
  assert.equal(adminData.wholesalePrice, 135000);
  assert.equal(adminData.updatedAt, '2026-11-16T00:00:00.000Z');
  assert.deepEqual(Object.keys(adminData).sort(), ['updatedAt', 'wholesalePrice']);
});

test('reading a legacy product document strips wholesale price before UI state', () => {
  const product = readPublicProduct('ACC-ANK-001', {
    ...sample(),
    wholesalePrice: 135000,
  });
  assert.equal(product.id, 'ACC-ANK-001');
  assert.equal(product.suggestedRetailPrice, 199000);
  assert.equal('wholesalePrice' in product, false);
});

test('dealer cost is attached only for an admin and only from the admin map', () => {
  const raw = readPublicProduct('ACC-ANK-001', { ...sample(), wholesalePrice: 1 });
  const guest = applyDealerCost(raw, { 'ACC-ANK-001': 135000 }, false);
  assert.equal('wholesalePrice' in guest, false);

  const admin = applyDealerCost(raw, { 'ACC-ANK-001': 135000 }, true);
  assert.equal(admin.wholesalePrice, 135000);

  const preview = applyDealerCost({ ...raw, id: undefined }, { 'ACC-ANK-001': 88000 }, true);
  assert.equal(preview.wholesalePrice, 88000);

  const missing = applyDealerCost(raw, {}, true);
  assert.equal('wholesalePrice' in missing, false);
});

test('toggle copies a legacy public wholesale price before it is removed', () => {
  const now = '2026-11-16T00:00:00.000Z';
  const copied = planActiveToggle({
    currentActive: true,
    publicWholesale: 135000,
    adminWholesale: undefined,
    now,
  });
  assert.equal(copied.isActive, false);
  assert.deepEqual(copied.adminWrite, { wholesalePrice: 135000, updatedAt: now });

  const kept = planActiveToggle({
    currentActive: false,
    publicWholesale: 135000,
    adminWholesale: 90000,
    now,
  });
  assert.equal(kept.isActive, true);
  assert.equal(kept.adminWrite, null);

  const absent = planActiveToggle({
    currentActive: true,
    publicWholesale: undefined,
    adminWholesale: undefined,
    now,
  });
  assert.equal(absent.adminWrite, null);
  assert.equal(absent.isActive, false);
});

test('client sources do not embed the sample dealer price list', () => {
  const banned = ['135000', '24000', '48000', '32000', '12000', '185000', '78000', '145000', '230000', '38000', '8500', '28000', 'SAMPLE_WHOLESALE'];
  const files = [
    '../src/firebase/productsService.ts',
    '../src/components/ExcelImportModal.tsx',
    '../src/pages/AdminPage.tsx',
    '../src/context/CatalogContext.tsx',
  ];
  for (const file of files) {
    const text = readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const token of banned) {
      assert.equal(text.includes(token), false, `${file} still contains ${token}`);
    }
  }
});
