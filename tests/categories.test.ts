import assert from 'node:assert/strict';
import test from 'node:test';
import { ACCESSORY_CATEGORIES, listStorefrontCategories } from '../src/config/app.ts';

test('category list keeps the built-ins, adds catalog extras, and hides spare parts', () => {
  const list = listStorefrontCategories([
    'Braking System',
    'Custom Gadget',
    'charger & adapter',
    '',
    'Custom Gadget',
  ]);
  for (const name of [
    'Memory & Flashdisk',
    'Lainnya',
    'Komputer & Gaming',
    'Kipas/Fan',
    'CCTV & Smart Home',
    'Smartwatch & Wearable',
    'Konverter & OTG',
    'Modem & Jaringan',
  ]) {
    assert.equal(list.includes(name), true, name);
  }
  assert.equal(list.includes('Braking System'), false);
  assert.equal(list.includes('Custom Gadget'), true);
  assert.equal(list.filter((name) => name.toLowerCase() === 'charger & adapter').length, 1);
  assert.equal(list[0], ACCESSORY_CATEGORIES[0]);
  assert.ok(list.indexOf('Custom Gadget') > list.indexOf('Modem & Jaringan'));
});
