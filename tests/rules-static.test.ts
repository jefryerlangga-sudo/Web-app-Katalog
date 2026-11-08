import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/config/app.ts', import.meta.url), 'utf8');
const products = readFileSync(new URL('../src/firebase/productsService.ts', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../src/context/CatalogContext.tsx', import.meta.url), 'utf8');
const orders = readFileSync(new URL('../src/firebase/ordersService.ts', import.meta.url), 'utf8');
const whatsapp = readFileSync(new URL('../src/firebase/whatsappLink.ts', import.meta.url), 'utf8');
const users = readFileSync(new URL('../src/firebase/usersService.ts', import.meta.url), 'utf8');

test('rules and app share the existing owner email and require a verified token', () => {
  const email = 'jefryerlangga@gmail.com';
  assert.equal(app.includes(email), true);
  assert.equal(rules.includes(email), true);
  assert.match(rules, /email_verified == true/);
  assert.match(rules, /function isVerifiedMasterAdmin\(\)/);
  assert.match(rules, /allow create, update: if isVerifiedMasterAdmin\(\)/);
});

test('rules do not grant catalog writes from a profile role or admins collection lookup', () => {
  assert.equal(rules.includes("role == 'admin'"), false);
  assert.match(rules, /data\.role == 'customer'/);
  assert.equal(rules.includes('documents/admins/'), false);
  assert.match(rules, /suggestedRetailPrice == item\.unitPrice/);
  assert.match(rules, /data\.total == data\.subtotal/);
  assert.match(rules, /data\.status == 'pending'/);
});

test('seed data and guest UI no longer treat visitors as admin or motorcycle-part samples', () => {
  assert.equal(products.includes('Brembo'), false);
  assert.equal(products.includes('Bando'), false);
  assert.equal(products.includes('NGK'), false);
  assert.equal(products.includes('Braking System'), false);
  assert.equal(catalog.includes('@admin.partshop.com'), false);
  assert.equal(catalog.includes('if (!user) {\n      return true;'), false);
  assert.match(products, /snapshot\.empty/);
  assert.match(products, /isMasterAdminUser\(auth\.currentUser\)/);
  assert.equal(products.includes('deleteDoc(collection'), false);
});

test('order code does not call a WhatsApp or payment API', () => {
  const orderCode = `${orders}\n${whatsapp}`;
  assert.equal(orderCode.includes('fetch('), false);
  assert.equal(orderCode.includes('api.whatsapp.com'), false);
  assert.equal(orderCode.includes('graph.facebook.com'), false);
  assert.match(orders, /priceCart/);
  assert.match(whatsapp, /wa\.me/);
  assert.match(users, /role: 'customer'/);
  assert.equal(users.includes("role: 'admin'"), false);
  assert.equal(app.includes('6281234567890'), false);
});
