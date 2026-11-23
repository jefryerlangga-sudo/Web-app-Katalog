import assert from 'node:assert/strict';
import test from 'node:test';
import { formatWhatsAppLink } from '../src/firebase/whatsappLink.ts';
import { purchaseExportSheets, summarizePurchases } from '../src/lib/analyticsAggregate.ts';
import {
  normalizePhone,
  presentOrder,
  priceCart,
} from '../src/firebase/orderPricing.ts';
import { Order, Product } from '../src/types/product.ts';

function product(overrides: Partial<Product> = {}): Product {
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
    ...overrides,
  };
}

test('checkout price comes from catalog retail, not the cart unit price', () => {
  const priced = priceCart(
    [
      {
        productId: 'ACC-ANK-001',
        sku: 'TAMPERED',
        name: 'Murah',
        brand: 'Anker',
        imageUrl: '',
        unitPrice: 1,
        quantity: 2,
      },
    ],
    [product()]
  );
  assert.equal(priced.items[0].unitPrice, 199000);
  assert.equal(priced.items[0].sku, 'ACC-ANK-001');
  assert.equal(priced.items[0].name, 'Anker 511 Nano');
  assert.equal(priced.items[0].lineTotal, 398000);
  assert.equal(priced.subtotal, 398000);
  assert.equal(priced.total, 398000);
  assert.equal(priced.itemCount, 2);
});

test('missing, inactive, and unbounded carts are rejected, and empty stock still prices', () => {
  assert.throws(() => priceCart([{ ...cartLine(), productId: 'missing' }], [product()]), /Firestore/);
  assert.throws(() => priceCart([cartLine()], [product({ isActive: false })]), /nonaktif/);
  const emptied = priceCart([cartLine()], [product({ stockStatus: 'Out of Stock' })]);
  assert.equal(emptied.total, 199000);
  assert.throws(() => priceCart([cartLine(), { ...cartLine(), productId: 'ACC-ANK-001' }], [product()]), /duplikat/);
  assert.throws(() => priceCart([{ ...cartLine(), quantity: 1.5 }], [product()]), /Jumlah/);
  assert.throws(() => priceCart([{ ...cartLine(), quantity: 100 }], [product()]), /Jumlah/);
  const twenty = Array.from({ length: 20 }, (_, index) => ({
    ...cartLine(),
    productId: `P-${index}`,
  }));
  const catalog = twenty.map((line, index) => product({ id: `P-${index}`, sku: `P-${index}`, name: `Item ${index}` }));
  assert.equal(priceCart(twenty, catalog).items.length, 20);
  const twentyOne = [...twenty, { ...cartLine(), productId: 'P-20' }];
  const catalog21 = [...catalog, product({ id: 'P-20', sku: 'P-20', name: 'Item 20' })];
  assert.throws(() => priceCart(twentyOne, catalog21), /Maksimal/);
});

test('existing orders keep their embedded lines, and new orders are rebuilt from item docs', () => {
  const legacy: Order = {
    id: 'ORD-OLD',
    userId: 'uid',
    customerName: 'Sari',
    customerEmail: 'sari@example.com',
    customerPhone: '081234567890',
    items: [
      { productId: 'A', sku: 'A', name: 'Kabel', unitPrice: 10000, quantity: 2, lineTotal: 20000 },
    ],
    itemCount: 2,
    subtotal: 20000,
    total: 20000,
    status: 'pending',
    note: '',
    createdAt: '2026-11-08T12:00:00.000Z',
    updatedAt: '2026-11-08T12:00:00.000Z',
  };
  const kept = presentOrder(legacy, []);
  assert.equal(kept.items[0].name, 'Kabel');
  assert.equal(kept.total, 20000);

  const fresh = presentOrder(
    { ...legacy, id: 'ORD-NEW', items: [], itemCount: 1, subtotal: 1, total: 1 },
    [
      { productId: 'B', sku: 'B', name: 'Charger', unitPrice: 50000, quantity: 1, lineTotal: 50000 },
      { productId: 'C', sku: 'C', name: 'Glass', unitPrice: 15000, quantity: 3, lineTotal: 45000 },
    ]
  );
  assert.equal(fresh.items.length, 2);
  assert.equal(fresh.itemCount, 4);
  assert.equal(fresh.total, 95000);
  assert.equal(fresh.subtotal, 95000);

  const summary = summarizePurchases([kept, fresh], new Map([['uid', 'grosir']]), {
    status: 'all',
    customer: '',
  });
  assert.equal(summary.orders.length, 2);
  assert.equal(summary.orders.find((order) => order.id === 'ORD-OLD')?.items.length, 1);
  assert.equal(summary.orders.find((order) => order.id === 'ORD-NEW')?.items.length, 2);
  assert.equal(summary.orders.find((order) => order.id === 'ORD-NEW')?.total, 95000);
  const sheets = purchaseExportSheets(summary);
  const exported = sheets.lines.map((row) => row[1]);
  assert.equal(exported.includes('A'), true);
  assert.equal(exported.includes('B'), true);
  assert.equal(exported.includes('C'), true);
});

test('phone numbers are reduced to 8-20 digits', () => {
  assert.equal(normalizePhone('+62 812-3456-7890'), '6281234567890');
  assert.throws(() => normalizePhone('123'), /8–20/);
});

test('WhatsApp helper only builds a wa.me link and skips an empty number', () => {
  const order: Order = {
    id: 'ORD-1',
    userId: 'uid',
    customerName: 'Sari',
    customerEmail: 'sari@example.com',
    customerPhone: '081234567890',
    items: [
      {
        productId: 'ACC-ANK-001',
        sku: 'ACC-ANK-001',
        name: 'Anker 511 Nano',
        unitPrice: 199000,
        quantity: 1,
        lineTotal: 199000,
      },
    ],
    itemCount: 1,
    subtotal: 199000,
    total: 199000,
    status: 'pending',
    note: 'dekat & gerbang',
    createdAt: '2026-11-08T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z',
  };
  assert.equal(formatWhatsAppLink('', order), null);
  const link = formatWhatsAppLink('+62 812-000', order);
  assert.ok(link);
  assert.match(link, /^https:\/\/wa\.me\/62812000\?text=/);
  assert.equal(link.includes('graph.facebook.com'), false);
  assert.equal(link.includes('api.whatsapp.com'), false);
  const text = decodeURIComponent(link.split('text=')[1]);
  assert.match(text, /^Halo Partshop\.Katalog, saya ingin menindaklanjuti pesanan ORD-1/);
  assert.equal(text.includes('PortalTech'), false);
  assert.match(text, /ORD-1/);
  assert.match(text, /199\.000|199000/);
  assert.match(text, /dekat & gerbang/);
});

function cartLine() {
  return {
    productId: 'ACC-ANK-001',
    sku: 'ACC-ANK-001',
    name: 'Anker 511 Nano',
    brand: 'Anker',
    imageUrl: '',
    unitPrice: 1,
    quantity: 1,
  };
}
