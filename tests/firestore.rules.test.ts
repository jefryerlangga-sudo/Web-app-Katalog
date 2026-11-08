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
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { RulesTestContext } from '@firebase/rules-unit-testing';

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
    wholesalePrice: 135000,
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

test('guests can read products and cannot write them', async () => {
  await seedProduct();
  const guest = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(guest, 'products', PRODUCT_ID)));
  await assertSucceeds(getDocs(collection(guest, 'products')));
  await assertFails(setDoc(doc(guest, 'products', 'ACC-NEW-1'), validProduct({ sku: 'ACC-NEW-1' })));
  await assertFails(deleteDoc(doc(guest, 'products', PRODUCT_ID)));
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

test('customers cannot elevate role or read another profile', async () => {
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const other = dbFor('cust-2', 'other@example.com', true);
  await assertSucceeds(setDoc(doc(customer, 'users', 'cust-1'), profile('cust-1', 'cust@example.com')));
  await assertFails(setDoc(doc(customer, 'users', 'cust-1'), profile('cust-1', 'cust@example.com', 'admin')));
  await assertFails(setDoc(doc(customer, 'users', 'cust-2'), profile('cust-2', 'cust@example.com')));
  await assertFails(getDoc(doc(customer, 'users', 'cust-2')));
  await assertSucceeds(getDoc(doc(customer, 'users', 'cust-1')));
  await assertFails(
    updateDoc(doc(customer, 'users', 'cust-1'), {
      role: 'admin',
      updatedAt: '2026-11-08T13:00:00.000Z',
    })
  );
  await assertSucceeds(
    updateDoc(doc(customer, 'users', 'cust-1'), {
      displayName: 'Nama Baru',
      updatedAt: '2026-11-08T13:00:00.000Z',
    })
  );
  await assertFails(getDocs(collection(other, 'users')));
});

test('order create requires ownership, pending status, and catalog retail price', async () => {
  await seedProduct();
  const customer = dbFor('cust-1', 'cust@example.com', true);
  const other = dbFor('cust-2', 'other@example.com', true);
  const guest = testEnv.unauthenticatedContext().firestore();

  await assertSucceeds(setDoc(doc(customer, 'orders', 'ORD-1'), orderPayload('cust-1', 'cust@example.com')));
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-FAKE'), orderPayload('cust-1', 'cust@example.com', {
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
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-TOTAL'), orderPayload('cust-1', 'cust@example.com', {
    total: 1,
  })));
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-OWNER'), orderPayload('cust-2', 'cust@example.com')));
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-STATUS'), orderPayload('cust-1', 'cust@example.com', {
    status: 'confirmed',
  })));
  await assertFails(setDoc(doc(guest, 'orders', 'ORD-GUEST'), orderPayload('guest', 'cust@example.com')));

  await assertSucceeds(getDoc(doc(customer, 'orders', 'ORD-1')));
  await assertFails(getDoc(doc(other, 'orders', 'ORD-1')));
  await assertSucceeds(getDocs(query(collection(customer, 'orders'), where('userId', '==', 'cust-1'))));
  await assertFails(getDocs(collection(customer, 'orders')));
  await assertFails(getDocs(query(collection(customer, 'orders'), where('userId', '==', 'cust-2'))));
  await assertFails(updateDoc(doc(customer, 'orders', 'ORD-1'), { status: 'cancelled', updatedAt: '2026-11-08T13:00:00.000Z' }));
});

test('inactive or missing products and master price edits are rejected', async () => {
  await seedProduct(validProduct({ isActive: false }));
  const customer = dbFor('cust-1', 'cust@example.com', true);
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-OFF'), orderPayload('cust-1', 'cust@example.com')));

  await testEnv.clearFirestore();
  await seedProduct(validProduct({ stockStatus: 'Out of Stock' }));
  await assertFails(setDoc(doc(customer, 'orders', 'ORD-STOCK'), orderPayload('cust-1', 'cust@example.com')));

  await testEnv.clearFirestore();
  await seedProduct();
  await assertSucceeds(setDoc(doc(customer, 'orders', 'ORD-OK'), orderPayload('cust-1', 'cust@example.com')));

  const master = dbFor('master-1', MASTER_EMAIL, true);
  await assertSucceeds(updateDoc(doc(master, 'orders', 'ORD-OK'), {
    status: 'confirmed',
    updatedAt: '2026-11-08T13:00:00.000Z',
  }));
  await assertFails(updateDoc(doc(master, 'orders', 'ORD-OK'), { total: 1 }));
  await assertFails(updateDoc(doc(master, 'orders', 'ORD-OK'), { userId: 'master-1' }));
  await assertSucceeds(getDoc(doc(master, 'orders', 'ORD-OK')));

  let stored: Record<string, unknown> | undefined;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const snap = await getDoc(doc(context.firestore(), 'orders', 'ORD-OK'));
    stored = snap.data();
  });
  assert.equal(stored?.total, RETAIL * 2);
  assert.equal(stored?.status, 'confirmed');
  assert.equal(stored?.userId, 'cust-1');
});
