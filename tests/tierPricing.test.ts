import assert from 'node:assert/strict';
import test from 'node:test';
import { tierForAccount } from '../src/config/accountRole.ts';
import { endUserPrice, priceForTier, promoForTier } from '../src/config/pricing.ts';

test('end-user prices add 30 percent and round up to the nearest Rp100', () => {
  assert.equal(endUserPrice(0), 0);
  assert.equal(endUserPrice(-10), 0);
  assert.equal(endUserPrice(10000), 13000);
  assert.equal(endUserPrice(10001), 13100);
  assert.equal(endUserPrice(88000), 114400);
  assert.equal(endUserPrice(199000), 258700);
  assert.equal(endUserPrice(15000), 19500);
  assert.equal(endUserPrice(1), 100);
  assert.equal(endUserPrice(76), 100);
  assert.equal(endUserPrice(77), 200);
  assert.equal(endUserPrice(100), 200);
  assert.equal(priceForTier(10000, 'grosir'), 10000);
  assert.equal(priceForTier(10000, 'end_user'), 13000);
});

test('promo prices and the minimum purchase follow the same tier', () => {
  const promo = {
    minPurchase: 10000,
    items: [{ promoPrice: 10001 }, { promoPrice: 88000 }],
  };
  assert.deepEqual(promoForTier(promo, 'grosir'), promo);
  assert.deepEqual(promoForTier(promo, 'end_user'), {
    minPurchase: 13000,
    items: [{ promoPrice: 13100 }, { promoPrice: 114400 }],
  });
});

test('only approved roles and the verified owner receive a price tier', () => {
  assert.equal(tierForAccount({ role: 'pending', email: 'a@b.c', emailVerified: true }), null);
  assert.equal(tierForAccount({ role: 'rejected', email: 'a@b.c', emailVerified: true }), null);
  assert.equal(tierForAccount({ role: null, email: 'a@b.c', emailVerified: true }), null);
  assert.equal(tierForAccount({ role: 'grosir', email: 'a@b.c', emailVerified: true }), 'grosir');
  assert.equal(tierForAccount({ role: 'customer', email: 'a@b.c', emailVerified: true }), 'grosir');
  assert.equal(tierForAccount({ role: 'end_user', email: 'a@b.c', emailVerified: true }), 'end_user');
  assert.equal(
    tierForAccount({
      role: 'pending',
      email: 'jefryerlangga@gmail.com',
      emailVerified: true,
    }),
    'grosir'
  );
  assert.equal(
    tierForAccount({
      role: 'grosir',
      email: 'jefryerlangga@gmail.com',
      emailVerified: false,
    }),
    'grosir'
  );
});
