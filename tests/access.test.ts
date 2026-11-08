import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configuredWhatsAppNumber,
  isMasterAdminEmail,
  isMasterAdminUser,
  isStorefrontProduct,
} from '../src/config/app.ts';

test('guests and unverified or non-owner accounts are not master admin', () => {
  assert.equal(isMasterAdminUser(null), false);
  assert.equal(isMasterAdminUser(undefined), false);
  assert.equal(isMasterAdminUser({ email: null, emailVerified: true }), false);
  assert.equal(isMasterAdminUser({ email: 'jefryerlangga@gmail.com', emailVerified: false }), false);
  assert.equal(isMasterAdminUser({ email: 'customer@example.com', emailVerified: true }), false);
  assert.equal(isMasterAdminUser({ email: 'someone@admin.partshop.com', emailVerified: true }), false);
});

test('verified owner email is master admin regardless of letter case', () => {
  assert.equal(isMasterAdminEmail(' JefryErlangga@gmail.com '), true);
  assert.equal(
    isMasterAdminUser({ email: 'JefryErlangga@gmail.com', emailVerified: true }),
    true
  );
});

test('storefront keeps phone accessories and hides spare-part categories', () => {
  assert.equal(isStorefrontProduct('Holder & Mount HP'), true);
  assert.equal(isStorefrontProduct('Charger & Adapter'), true);
  assert.equal(isStorefrontProduct('Braking System'), false);
  assert.equal(isStorefrontProduct('Drivetrain'), false);
  assert.equal(isStorefrontProduct('Engine & Electrical'), false);
});

test('WhatsApp number is empty unless the public env value is set', () => {
  const previous = import.meta.env?.VITE_WHATSAPP_NUMBER;
  assert.equal(configuredWhatsAppNumber(), String(previous || '').replace(/\D/g, ''));
});
