/**
 * Firestore rules tests. Run only against the local emulator via demo-portaltech.
 * Do not point this file at the live project.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { buildHitWrites, type AnalyticsEvent } from '../src/lib/analyticsAggregate.ts';
import type { RulesTestContext } from '@firebase/rules-unit-testing';
import { ORDER_ITEM_BATCH } from '../src/config/app.ts';
import { endUserPrice } from '../src/config/pricing.ts';

function productFor(id: string, price: number, overrides: Record<string, unknown> = {}) {
  return validProduct({
    sku: id,
    name: `Produk ${id}`,
    suggestedRetailPrice: price,
    ...overrides,
  });
}

type TestDb = ReturnType<RulesTestContext['firestore']>;

const MASTER_EMAIL = 'jefryerlangga@gmail.com';
const PRODUCT_ID = 'ACC-ANK-001';
const RETAIL = 199000;

let testEnv: RulesTestEnvironment;

function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    sku: 'ACC-ANK-001',
    name: 'Anker 511 Nano',
    brand: 'Anker',
    category: 'Charger & Adapter',
    subcategory: 'Fast Charger GaN',
    imageUrl: 'https://example.com/a.jpg',
    specification: 'GaN 30W',
    compatibility: 'iPhone',
    sellingPoint1: 'A',
    sellingPoint2: 'B',
    sellingPoint3: 'C',
    suggestedRetailPrice: RETAIL,
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

function orderPayload(uid: string, email: string, overrides: Record<string, unknown> = {}) {
  const quantity = 2;
  const unitPrice = RETAIL;
  const now = '2026-11-08T12:00:00.000Z';
  return {
    userId: uid,
    customerName: 'Pelanggan',
    customerEmail: email,
    customerPhone: '081234567890',
    items: [
      {
        productId: PRODUCT_ID,
        sku: 'ACC-ANK-001',
        name: 'Anker 511 Nano',
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      },
    ],
    itemCount: quantity,
    subtotal: unitPrice * quantity,
    total: unitPrice * quantity,
    status: 'pending',
    note: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type OrderWrite = ReturnType<typeof orderPayload>;

function headerFrom(payload: OrderWrite) {
  const { items, ...rest } = payload;
  return {
    ...rest,
    lineCount: items.length,
    productIds: items.map((item) => item.productId),
  };
}

async function saveOrder(db: TestDb, id: string, payload: OrderWrite) {
  const { items } = payload;
  await setDoc(doc(db, 'orders', id), headerFrom(payload));
  for (let index = 0; index < items.length; index += ORDER_ITEM_BATCH) {
    const batch = writeBatch(db);
    items.slice(index, index + ORDER_ITEM_BATCH).forEach((item, offset) => {
      batch.set(doc(db, 'orders', id, 'items', String(index + offset)), {
        userId: payload.userId,
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      });
    });
    await batch.commit();
  }
}

function profile(uid: string, email: string, role = 'customer') {
  const now = '2026-11-08T12:00:00.000Z';
  return {
    uid,
    email,
    displayName: 'Pelanggan',
    photoURL: '',
    role,
    phone: '',
    createdAt: now,
    updatedAt: now,
  };
}

function dbFor(uid: string, email: string, emailVerified: boolean): TestDb {
  return testEnv.authenticatedContext(uid, { email, email_verified: emailVerified }).firestore();
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-portaltech',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seedProduct(data = validProduct()) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'products', PRODUCT_ID), data);
  });
}

async function seedBuyer(uid: string, email: string, role = 'customer') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', uid), profile(uid, email, role));
  });
}

test('guests and customers cannot read product prices directly', async () => {
  await seedProduct();
  const guest = testEnv.unauthenticatedContext().firestore();
  const customer = dbFor('cust-1', 'cust@example.com', true);
  await assertFails(getDoc(doc(guest, 'products', PRODUCT_ID)));
  await assertFails(getDocs(collection(guest, 'products')));
  await assertFails(getDoc(doc(customer, 'products', PRODUCT_ID)));
  await assertFails(getDocs(collection(customer, 'products')));
  await assertFails(setDoc(doc(guest, 'products', 'ACC-NEW-1'), validProduct({ sku: 'ACC-NEW-1' })));
  await assertFails(deleteDoc(doc(guest, 'products', PRODUCT_ID)));
  await assertFails(getDoc(doc(guest, 'productAdmin', PRODUCT_ID)));
  await assertFails(getDocs(collection(guest, 'productAdmin')));
  const master = dbFor('master-1', MASTER_EMAIL, true);
  const snap = await assertSucceeds(getDoc(doc(master, 'products', PRODUCT_ID)));
  assert.equal(snap.data()?.suggestedRetailPrice, RETAIL);
  assert.equal(Object.prototype.hasOwnProperty.call(snap.data(), 'wholesalePrice'), false);
});

test('customers and unverified owner emails cannot modify products', async () => {
  await seedProduct();
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const unverifiedOwner = dbFor('owner-unverified', MASTER_EMAIL, false);
  const wrongDomain = dbFor('staff', 'staff@admin.partshop.com', true);
  await assertFails(setDoc(doc(customer, 'products', 'ACC-NEW-2'), validProduct({ sku: 'ACC-NEW-2' })));
  await assertFails(updateDoc(doc(customer, 'products', PRODUCT_ID), { name: 'Diubah customer' }));
  await assertFails(deleteDoc(doc(customer, 'products', PRODUCT_ID)));
  await assertFails(setDoc(doc(unverifiedOwner, 'products', 'ACC-NEW-3'), validProduct({ sku: 'ACC-NEW-3' })));
  await assertFails(setDoc(doc(wrongDomain, 'products', 'ACC-NEW-4'), validProduct({ sku: 'ACC-NEW-4' })));
});

test('an admins collection document does not grant product writes', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'admins', 'allowlisted'), {
      email: 'allow@example.com',
      role: 'superadmin',
    });
  });
  const allowlisted = dbFor('allowlisted', 'allow@example.com', true);
  await assertFails(setDoc(doc(allowlisted, 'products', 'ACC-NEW-5'), validProduct({ sku: 'ACC-NEW-5' })));
  await assertFails(getDoc(doc(allowlisted, 'admins', 'allowlisted')));
});

test('verified master admin can write products and the admins collection', async () => {
  const master = dbFor('master-1', 'JefryErlangga@gmail.com', true);
  await assertSucceeds(setDoc(doc(master, 'products', PRODUCT_ID), validProduct()));
  await assertSucceeds(updateDoc(doc(master, 'products', PRODUCT_ID), { isActive: false }));
  await assertSucceeds(setDoc(doc(master, 'admins', 'master-1'), { email: MASTER_EMAIL, role: 'owner' }));
  await assertSucceeds(deleteDoc(doc(master, 'products', PRODUCT_ID)));
});

test('wholesale price is rejected on public products and locked to productAdmin', async () => {
  const master = dbFor('master-1', MASTER_EMAIL, true);
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const guest = testEnv.unauthenticatedContext().firestore();

  await assertFails(setDoc(doc(master, 'products', PRODUCT_ID), validProduct({ wholesalePrice: 135000 })));
  await assertSucceeds(setDoc(doc(master, 'products', PRODUCT_ID), validProduct()));
  await assertSucceeds(setDoc(doc(master, 'productAdmin', PRODUCT_ID), {
    wholesalePrice: 135000,
    updatedAt: '2026-11-16T00:00:00.000Z',
  }));
  const adminSnap = await assertSucceeds(getDoc(doc(master, 'productAdmin', PRODUCT_ID)));
  assert.equal(adminSnap.data()?.wholesalePrice, 135000);
  await assertSucceeds(getDocs(collection(master, 'productAdmin')));

  await assertFails(getDoc(doc(customer, 'productAdmin', PRODUCT_ID)));
  await assertFails(getDocs(collection(customer, 'productAdmin')));
  await assertFails(setDoc(doc(customer, 'productAdmin', PRODUCT_ID), {
    wholesalePrice: 1,
    updatedAt: '2026-11-16T00:00:00.000Z',
  }));
  await assertFails(getDoc(doc(guest, 'productAdmin', PRODUCT_ID)));
  await assertFails(getDoc(doc(guest, 'products', PRODUCT_ID)));
  await assertFails(getDoc(doc(customer, 'products', PRODUCT_ID)));

  const adminSnapProduct = await assertSucceeds(getDoc(doc(master, 'products', PRODUCT_ID)));
  assert.equal(adminSnapProduct.data()?.suggestedRetailPrice, RETAIL);
  assert.equal(Object.prototype.hasOwnProperty.call(adminSnapProduct.data(), 'wholesalePrice'), false);
});

test('legacy wholesale field can be deleted by the master admin and is not redacted on read before that', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'products', PRODUCT_ID), {
      ...validProduct(),
      wholesalePrice: 135000,
    });
  });
  const guest = testEnv.unauthenticatedContext().firestore();
  const master = dbFor('master-1', MASTER_EMAIL, true);
  await assertFails(getDoc(doc(guest, 'products', PRODUCT_ID)));
  const legacy = await assertSucceeds(getDoc(doc(master, 'products', PRODUCT_ID)));
  assert.equal(legacy.data()?.wholesalePrice, 135000);

  const customer = dbFor('cust-1', 'cust@example.com', true);
  await assertFails(updateDoc(doc(customer, 'products', PRODUCT_ID), {
    wholesalePrice: deleteField(),
    updatedAt: '2026-11-16T01:00:00.000Z',
  }));

  await assertSucceeds(updateDoc(doc(master, 'products', PRODUCT_ID), {
    wholesalePrice: deleteField(),
    updatedAt: '2026-11-16T01:00:00.000Z',
  }));
  const cleaned = await assertSucceeds(getDoc(doc(master, 'products', PRODUCT_ID)));
  assert.equal(Object.prototype.hasOwnProperty.call(cleaned.data(), 'wholesalePrice'), false);
  assert.equal(cleaned.data()?.suggestedRetailPrice, RETAIL);
});

test('master admin can store a legacy wholesale price in productAdmin while removing it from the public product', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'products', PRODUCT_ID), {
      ...validProduct(),
      wholesalePrice: 135000,
    });
  });
  const master = dbFor('master-1', MASTER_EMAIL, true);
  const guest = testEnv.unauthenticatedContext().firestore();
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const now = '2026-11-16T02:00:00.000Z';
  await assertSucceeds(setDoc(doc(master, 'productAdmin', PRODUCT_ID), {
    wholesalePrice: 135000,
    updatedAt: now,
  }));
  await assertSucceeds(updateDoc(doc(master, 'products', PRODUCT_ID), {
    isActive: false,
    updatedAt: now,
    wholesalePrice: deleteField(),
  }));
  const adminSnap = await assertSucceeds(getDoc(doc(master, 'productAdmin', PRODUCT_ID)));
  assert.equal(adminSnap.data()?.wholesalePrice, 135000);
  await assertFails(getDoc(doc(guest, 'products', PRODUCT_ID)));
  await assertFails(getDoc(doc(customer, 'products', PRODUCT_ID)));
  const publicSnap = await assertSucceeds(getDoc(doc(master, 'products', PRODUCT_ID)));
  assert.equal(publicSnap.data()?.isActive, false);
  assert.equal(Object.prototype.hasOwnProperty.call(publicSnap.data(), 'wholesalePrice'), false);
  await assertFails(getDoc(doc(guest, 'productAdmin', PRODUCT_ID)));
});

test('customers cannot elevate role or read another profile', async () => {
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const other = dbFor('cust-2', 'other@example.com', true);
  const master = dbFor('master-1', MASTER_EMAIL, true);
  await assertSucceeds(setDoc(doc(customer, 'users', 'cust-1'), profile('cust-1', 'cust@example.com', 'pending')));
  await assertFails(setDoc(doc(customer, 'users', 'cust-1'), profile('cust-1', 'cust@example.com', 'grosir')));
  await assertFails(setDoc(doc(customer, 'users', 'cust-1'), profile('cust-1', 'cust@example.com', 'end_user')));
  await assertFails(setDoc(doc(customer, 'users', 'cust-1'), profile('cust-1', 'cust@example.com', 'admin')));
  await assertFails(setDoc(doc(customer, 'users', 'cust-2'), profile('cust-2', 'cust@example.com', 'pending')));
  await assertFails(getDoc(doc(customer, 'users', 'cust-2')));
  await assertSucceeds(getDoc(doc(customer, 'users', 'cust-1')));
  await assertFails(
    updateDoc(doc(customer, 'users', 'cust-1'), {
      role: 'grosir',
      updatedAt: '2026-11-08T13:00:00.000Z',
    })
  );
  await assertSucceeds(
    updateDoc(doc(customer, 'users', 'cust-1'), {
      displayName: 'Nama Baru',
      updatedAt: '2026-11-08T13:00:00.000Z',
    })
  );
  await assertSucceeds(
    updateDoc(doc(master, 'users', 'cust-1'), {
      role: 'grosir',
      updatedAt: '2026-11-08T14:00:00.000Z',
    })
  );
  await assertSucceeds(
    updateDoc(doc(master, 'users', 'cust-1'), {
      role: 'end_user',
      updatedAt: '2026-11-08T15:00:00.000Z',
    })
  );
  await assertFails(
    updateDoc(doc(master, 'users', 'cust-1'), {
      role: 'admin',
      updatedAt: '2026-11-08T16:00:00.000Z',
    })
  );
  await assertFails(
    updateDoc(doc(customer, 'users', 'cust-1'), {
      role: 'grosir',
      updatedAt: '2026-11-08T17:00:00.000Z',
    })
  );
  await assertFails(getDocs(collection(other, 'users')));
  await assertSucceeds(getDocs(collection(master, 'users')));
});

test('order create requires ownership, pending status, and the buyer tier price', async () => {
  await seedProduct();
  await seedBuyer('cust-1', 'cust@example.com', 'customer');
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const other = dbFor('cust-2', 'other@example.com', true);
  const guest = testEnv.unauthenticatedContext().firestore();

  await assertSucceeds(saveOrder(customer, 'ORD-1', orderPayload('cust-1', 'cust@example.com')));
  await assertFails(saveOrder(customer, 'ORD-FAKE', orderPayload('cust-1', 'cust@example.com', {
    items: [
      {
        productId: PRODUCT_ID,
        sku: 'ACC-ANK-001',
        name: 'Anker 511 Nano',
        unitPrice: 1,
        quantity: 1,
        lineTotal: 1,
      },
    ],
    itemCount: 1,
    subtotal: 1,
    total: 1,
  })));
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-TOTAL'), headerFrom(orderPayload('cust-1', 'cust@example.com', {
    total: 1,
  }))));
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-OWNER'), headerFrom(orderPayload('cust-2', 'cust@example.com'))));
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-STATUS'), headerFrom(orderPayload('cust-1', 'cust@example.com', {
    status: 'confirmed',
  }))));
  await assertFails(setDoc(doc(guest, 'orders', 'ORD-GUEST'), orderPayload('guest', 'cust@example.com')));

  await assertSucceeds(getDoc(doc(customer, 'orders', 'ORD-1')));
  const lines = await assertSucceeds(getDocs(query(
    collection(customer, 'orders', 'ORD-1', 'items'),
    where('userId', '==', 'cust-1'),
  )));
  assert.equal(lines.size, 1);
  await assertFails(getDocs(collection(customer, 'orders', 'ORD-1', 'items')));
  await assertFails(getDocs(collection(other, 'orders', 'ORD-1', 'items')));
  await assertFails(getDoc(doc(other, 'orders', 'ORD-1')));
  await assertSucceeds(getDocs(query(collection(customer, 'orders'), where('userId', '==', 'cust-1'))));
  await assertFails(getDocs(collection(customer, 'orders')));
  await assertFails(getDocs(query(collection(customer, 'orders'), where('userId', '==', 'cust-2'))));
  await assertFails(updateDoc(doc(customer, 'orders', 'ORD-1'), { status: 'cancelled', updatedAt: '2026-11-08T13:00:00.000Z' }));
});

test('inactive or missing products and master price edits are rejected', async () => {
  await seedBuyer('cust-1', 'cust@example.com', 'grosir');
  await seedProduct(validProduct({ isActive: false }));
  const customer = dbFor('cust-1', 'cust@example.com', true);
  await assertFails(saveOrder(customer, 'ORD-OFF', orderPayload('cust-1', 'cust@example.com')));

  await testEnv.clearFirestore();
  await seedBuyer('cust-1', 'cust@example.com', 'grosir');
  await seedProduct(validProduct({ stockStatus: 'Out of Stock' }));
  await assertSucceeds(saveOrder(customer, 'ORD-STOCK', orderPayload('cust-1', 'cust@example.com')));

  await testEnv.clearFirestore();
  await seedBuyer('cust-1', 'cust@example.com', 'grosir');
  await seedProduct();
  await assertSucceeds(saveOrder(customer, 'ORD-OK', orderPayload('cust-1', 'cust@example.com')));

  const master = dbFor('master-1', MASTER_EMAIL, true);
  await assertSucceeds(updateDoc(doc(master, 'orders', 'ORD-OK'), {
    status: 'confirmed',
    updatedAt: '2026-11-08T13:00:00.000Z',
  }));
  await assertFails(updateDoc(doc(master, 'orders', 'ORD-OK'), { total: 1 }));
  await assertFails(updateDoc(doc(master, 'orders', 'ORD-OK'), { userId: 'master-1' }));
  await assertSucceeds(getDoc(doc(master, 'orders', 'ORD-OK')));
  const masterLines = await assertSucceeds(getDocs(collection(master, 'orders', 'ORD-OK', 'items')));
  assert.equal(masterLines.size, 1);

  let stored: Record<string, unknown> | undefined;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snap = await getDoc(doc(context.firestore(), 'orders', 'ORD-OK'));
    stored = snap.data();
  });
  assert.equal(stored?.total, RETAIL * 2);
  assert.equal(stored?.status, 'confirmed');
  assert.equal(stored?.userId, 'cust-1');
});

test('end users pay the marked-up price and pending accounts cannot order', async () => {
  await seedProduct();
  await seedBuyer('end-1', 'end@example.com', 'end_user');
  await seedBuyer('wait-1', 'wait@example.com', 'pending');
  const endUser = dbFor('end-1', 'end@example.com', true);
  const pending = dbFor('wait-1', 'wait@example.com', true);
  const unitPrice = endUserPrice(RETAIL);
  const priced = orderPayload('end-1', 'end@example.com', {
    items: [
      {
        productId: PRODUCT_ID,
        sku: 'ACC-ANK-001',
        name: 'Anker 511 Nano',
        unitPrice,
        quantity: 2,
        lineTotal: unitPrice * 2,
      },
    ],
    itemCount: 2,
    subtotal: unitPrice * 2,
    total: unitPrice * 2,
  });
  await assertSucceeds(saveOrder(endUser, 'ORD-END', priced));
  await assertFails(saveOrder(endUser, 'ORD-BASE', orderPayload('end-1', 'end@example.com')));
  await assertFails(setDoc(doc(pending, 'orders', 'ORD-WAIT'), headerFrom(orderPayload('wait-1', 'wait@example.com'))));
});

const ANALYTICS_DAY = '2026-11-20';
const ANALYTICS_SEEN = '2026-11-20T03:00:00.000Z';

function hitPayload(uid: string, email: string, role: string, events: AnalyticsEvent[]) {
  const [body] = buildHitWrites(events, { uid, email, name: 'Pelanggan', role }, {
    date: ANALYTICS_DAY,
    seen: ANALYTICS_SEEN,
  });
  return {
    id: `${body.date}_${body.uid}`,
    data: {
      date: body.date,
      uid: body.uid,
      email: body.email,
      name: body.name,
      role: body.role,
      seen: body.seen,
      pages: body.pages,
      events: arrayUnion(...body.events),
    },
  };
}

async function writeHit(db: TestDb, uid: string, email: string, role: string, events: AnalyticsEvent[]) {
  const payload = hitPayload(uid, email, role, events);
  await setDoc(doc(db, 'analyticsHits', payload.id), payload.data, { merge: true });
}

const visitEvents: AnalyticsEvent[] = [
  { type: 'visit' },
  { type: 'page', page: 'home' },
  { type: 'click', click: 'product_view' },
  { type: 'product', metric: 'views', product: { id: 'ACC-ANK-001', sku: 'ACC-ANK-001', name: 'Anker 511 Nano' } },
];

test('approved buyers can append their own analytics and cannot inflate or read it', async () => {
  await seedBuyer('cust-1', 'cust@example.com', 'customer');
  await seedBuyer('end-1', 'end@example.com', 'end_user');
  await seedBuyer('wait-1', 'wait@example.com', 'pending');
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const endUser = dbFor('end-1', 'end@example.com', true);
  const pending = dbFor('wait-1', 'wait@example.com', true);
  const guest = testEnv.unauthenticatedContext().firestore();
  const master = dbFor('master-1', MASTER_EMAIL, true);
  const customerId = `${ANALYTICS_DAY}_cust-1`;

  await assertSucceeds(writeHit(customer, 'cust-1', 'cust@example.com', 'customer', visitEvents));
  await assertFails(getDoc(doc(customer, 'analyticsHits', customerId)));
  await assertFails(getDocs(collection(customer, 'analyticsHits')));
  await assertFails(deleteDoc(doc(customer, 'analyticsHits', customerId)));

  const stored = await assertSucceeds(getDoc(doc(master, 'analyticsHits', customerId)));
  assert.equal(stored.data()?.email, 'cust@example.com');
  assert.equal(Array.isArray(stored.data()?.events) && stored.data()?.events.length, 4);
  await assertSucceeds(getDocs(collection(master, 'analyticsHits')));

  await assertSucceeds(writeHit(customer, 'cust-1', 'cust@example.com', 'customer', [{ type: 'page', page: 'search' }]));
  const after = await assertSucceeds(getDoc(doc(master, 'analyticsHits', customerId)));
  assert.equal(after.data()?.events.length, 5);

  await assertFails(setDoc(doc(customer, 'analyticsHits', customerId), {
    events: arrayUnion('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'),
  }, { merge: true }));
  await assertFails(writeHit(customer, 'someone', 'cust@example.com', 'customer', [{ type: 'page', page: 'home' }]));
  await assertFails(writeHit(customer, 'cust-1', 'other@example.com', 'customer', [{ type: 'page', page: 'home' }]));

  await assertSucceeds(writeHit(endUser, 'end-1', 'end@example.com', 'end_user', [{ type: 'visit' }, { type: 'page', page: 'focus' }]));
  await assertFails(writeHit(pending, 'wait-1', 'wait@example.com', 'pending', visitEvents));
  await assertFails(writeHit(guest, 'ghost', 'ghost@example.com', 'customer', visitEvents));
  await assertSucceeds(writeHit(master, 'master-1', MASTER_EMAIL, 'admin', [{ type: 'visit' }, { type: 'page', page: 'laporan' }]));
  await assertSucceeds(deleteDoc(doc(master, 'analyticsHits', `${ANALYTICS_DAY}_master-1`)));
});

function orderOfSize(uid: string, email: string, count: number, role: 'grosir' | 'end_user') {
  const items = Array.from({ length: count }, (_, index) => {
    const id = `P${index}`;
    const base = 10000 + index * 1500;
    const unitPrice = role === 'end_user' ? endUserPrice(base) : base;
    return {
      productId: id,
      sku: id,
      name: `Produk ${id}`,
      unitPrice,
      quantity: 1,
      lineTotal: unitPrice,
    };
  });
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return orderPayload(uid, email, {
    items,
    itemCount: count,
    subtotal: total,
    total,
  });
}

async function seedCatalog(count: number, role: string, email: string, uid: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    for (let index = 0; index < count; index += 1) {
      const id = `P${index}`;
      await setDoc(doc(store, 'products', id), productFor(id, 10000 + index * 1500));
    }
    await setDoc(doc(store, 'users', uid), profile(uid, email, role));
  });
}

test('one, eight, twelve, and twenty line carts check out, and twenty-one is rejected', async () => {
  for (const role of ['grosir', 'end_user'] as const) {
    for (const count of [1, 8, 12, 20]) {
      await testEnv.clearFirestore();
      const uid = 'buyer-1';
      const email = 'buyer@example.com';
      await seedCatalog(count, role, email, uid);
      const buyer = dbFor(uid, email, true);
      await assertSucceeds(saveOrder(buyer, `ORD-${role}-${count}`, orderOfSize(uid, email, count, role)));
      const lines = await assertSucceeds(getDocs(query(
        collection(buyer, 'orders', `ORD-${role}-${count}`, 'items'),
        where('userId', '==', uid),
      )));
      assert.equal(lines.size, count);
    }
  }

  await testEnv.clearFirestore();
  await seedCatalog(21, 'end_user', 'buyer@example.com', 'buyer-1');
  const endBuyer = dbFor('buyer-1', 'buyer@example.com', true);
  await assertFails(saveOrder(endBuyer, 'ORD-21', orderOfSize('buyer-1', 'buyer@example.com', 21, 'end_user')));

  await testEnv.clearFirestore();
  await seedCatalog(8, 'grosir', 'buyer@example.com', 'buyer-1');
  const buyer = dbFor('buyer-1', 'buyer@example.com', true);
  const allowed = orderOfSize('buyer-1', 'buyer@example.com', 1, 'grosir');
  await assertSucceeds(saveOrder(buyer, 'ORD-SLOT', allowed));
  await assertFails(setDoc(doc(buyer, 'orders', 'ORD-SLOT', 'items', '20'), {
    userId: 'buyer-1',
    productId: 'P0',
    sku: 'P0',
    name: 'Produk P0',
    unitPrice: 10000,
    quantity: 1,
    lineTotal: 10000,
  }));

  const wrong = orderOfSize('buyer-1', 'buyer@example.com', 8, 'grosir');
  wrong.items[3].unitPrice = 1;
  wrong.items[3].lineTotal = 1;
  wrong.subtotal = wrong.items.reduce((sum, item) => sum + item.lineTotal, 0);
  wrong.total = wrong.subtotal;
  await assertFails(saveOrder(buyer, 'ORD-CHEAP', wrong));
});

test('an older order that still stores its lines on the header can be read and updated', async () => {
  const legacy = orderPayload('cust-1', 'cust@example.com');
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'orders', 'ORD-OLD'), legacy);
  });
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const snap = await assertSucceeds(getDoc(doc(customer, 'orders', 'ORD-OLD')));
  assert.equal(Array.isArray(snap.data()?.items), true);
  assert.equal(snap.data()?.items.length, 1);
  const master = dbFor('master-1', MASTER_EMAIL, true);
  await assertSucceeds(updateDoc(doc(master, 'orders', 'ORD-OLD'), {
    status: 'completed',
    updatedAt: '2026-11-08T13:00:00.000Z',
  }));
  const after = await assertSucceeds(getDoc(doc(customer, 'orders', 'ORD-OLD')));
  assert.equal(after.data()?.status, 'completed');
  assert.equal(after.data()?.items[0].name, 'Anker 511 Nano');
});

test('end user prices that are not multiples of 1000 match the client formula', async () => {
  await seedBuyer('end-1', 'end@example.com', 'end_user');
  const awkward = [1, 50, 10500, 10001, 150050, 199000, 626000, 999999];
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const store = context.firestore();
    for (const price of awkward) {
      await setDoc(doc(store, 'products', `N${price}`), productFor(`N${price}`, price));
    }
  });
  const endUser = dbFor('end-1', 'end@example.com', true);
  for (const price of awkward) {
    const unitPrice = endUserPrice(price);
    await assertSucceeds(saveOrder(endUser, `ORD-N-${price}`, orderPayload('end-1', 'end@example.com', {
      items: [{
        productId: `N${price}`,
        sku: `N${price}`,
        name: `Produk N${price}`,
        unitPrice,
        quantity: 1,
        lineTotal: unitPrice,
      }],
      itemCount: 1,
      subtotal: unitPrice,
      total: unitPrice,
    })));
  }
  await assertFails(saveOrder(endUser, 'ORD-BASE', orderPayload('end-1', 'end@example.com', {
    items: [{
      productId: 'N199000',
      sku: 'N199000',
      name: 'Produk N199000',
      unitPrice: 199000,
      quantity: 1,
      lineTotal: 199000,
    }],
    itemCount: 1,
    subtotal: 199000,
    total: 199000,
  })));
});
