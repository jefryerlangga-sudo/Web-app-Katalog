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
const accountRole = readFileSync(new URL('../src/config/accountRole.ts', import.meta.url), 'utf8');
const pricing = readFileSync(new URL('../src/config/pricing.ts', import.meta.url), 'utf8');
const ai = readFileSync(new URL('../src/server/aiHandler.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
const productRecord = readFileSync(new URL('../src/firebase/productRecord.ts', import.meta.url), 'utf8');

test('rules and app share the existing owner email and require a verified token', () => {
  const email = 'jefryerlangga@gmail.com';
  assert.equal(app.includes(email), true);
  assert.equal(rules.includes(email), true);
  assert.match(rules, /email_verified == true/);
  assert.match(rules, /function isVerifiedMasterAdmin\(\)/);
  assert.match(rules, /allow create, update: if isVerifiedMasterAdmin\(\)/);
});

test('rules do not grant catalog writes from a profile role or admins collection lookup', () => {
  const catalog = rules.slice(rules.indexOf('match /products/'), rules.indexOf('function analyticsRoleOk'));
  assert.equal(catalog.includes("role == 'admin'"), false);
  assert.match(rules, /data\.role == 'pending'/);
  assert.match(rules, /isAdminRoleUpdate\(\)/);
  assert.equal(rules.includes('allow list: if true'), false);
  assert.equal(rules.includes('documents/admins/'), false);
  assert.match(rules, /endUserUnitPrice\(product\.suggestedRetailPrice\)/);
  assert.match(rules, /base \* 13 \+ 999/);
  assert.match(rules, /data\.lineCount <= 50/);
  assert.match(rules, /\[1-4\]\[0-9\]/);
  assert.equal(rules.includes("stockStatus != 'Out of Stock'"), false);
  assert.match(pricing, /END_USER_MARKUP = 0\.3/);
  assert.match(accountRole, /'customer'/);
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

test('dealer cost lives in productAdmin and the assistant does not use Gemini', () => {
  assert.match(rules, /match \/productAdmin\/\{productId\}/);
  assert.match(rules, /function isValidProductAdmin\(/);
  assert.match(rules, /!data\.keys\(\)\.hasAny\(\['wholesalePrice'\]\)/);
  const productBlock = rules.slice(rules.indexOf('match /products/'), rules.indexOf('match /productAdmin/'));
  assert.equal(productBlock.includes('wholesalePrice'), false);
  assert.match(productRecord, /PRODUCT_ADMIN_COLLECTION = 'productAdmin'/);
  assert.match(products, /PRODUCT_ADMIN_COLLECTION/);
  assert.match(products, /readPublicProduct/);
  assert.equal(ai.includes('@google/genai'), false);
  assert.equal(ai.includes('GEMINI_API_KEY'), false);
  assert.match(ai, /XAI_API_KEY/);
  assert.match(ai, /grok-4\.7/);
  assert.equal(server.includes('@google/genai'), false);
  assert.equal(pkg.includes('@google/genai'), false);
  assert.equal(pkg.includes('GEMINI_API_KEY'), false);
  assert.match(envExample, /XAI_API_KEY/);
  assert.equal(envExample.includes('GEMINI_API_KEY'), false);
});
test('order code does not call a WhatsApp or payment API', () => {
  const orderCode = `${orders}\n${whatsapp}`;
  assert.equal(orderCode.includes('fetch('), false);
  assert.equal(orderCode.includes('api.whatsapp.com'), false);
  assert.equal(orderCode.includes('graph.facebook.com'), false);
  assert.match(orders, /priceCart/);
  assert.match(whatsapp, /wa\.me/);
  assert.match(users, /role: 'pending'/);
  assert.equal(users.includes("role: 'admin'"), false);
  assert.equal(app.includes('6281234567890'), false);
});
