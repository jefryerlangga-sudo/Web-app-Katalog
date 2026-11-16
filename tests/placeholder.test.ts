import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { splitCatalogWrite } from '../src/firebase/productRecord.ts';
import { PLACEHOLDER_PRODUCT_IMAGE, resolveProductImage } from '../src/lib/productImage.ts';
import { Product } from '../src/types/product.ts';

function sample(imageUrl: string): Product {
  return {
    sku: 'ACC-1',
    name: 'Produk',
    brand: 'Merk',
    category: 'Lainnya',
    subcategory: '',
    imageUrl,
    specification: '',
    compatibility: '',
    sellingPoint1: '',
    sellingPoint2: '',
    sellingPoint3: '',
    suggestedRetailPrice: 1000,
    stockStatus: 'In Stock',
    positioning: 'Good',
    targetCustomer: '',
    isProductFocus: false,
    isBestSeller: false,
    crossSellNotes: '',
    isActive: true,
  };
}

test('empty and broken image URLs resolve to the local placeholder', () => {
  assert.equal(resolveProductImage(''), PLACEHOLDER_PRODUCT_IMAGE);
  assert.equal(resolveProductImage('   '), PLACEHOLDER_PRODUCT_IMAGE);
  assert.equal(resolveProductImage(null), PLACEHOLDER_PRODUCT_IMAGE);
  assert.equal(resolveProductImage(undefined), PLACEHOLDER_PRODUCT_IMAGE);
  assert.equal(resolveProductImage('https://cdn.example/a.jpg', true), PLACEHOLDER_PRODUCT_IMAGE);
  assert.equal(resolveProductImage('https://cdn.example/a.jpg'), 'https://cdn.example/a.jpg');
  assert.equal(PLACEHOLDER_PRODUCT_IMAGE.includes('unsplash'), false);
  const svg = readFileSync(new URL('../public/placeholder-product.svg', import.meta.url), 'utf8');
  assert.match(svg, /Foto belum tersedia/);
});

test('a blank image is stored empty instead of a remote stock photo', () => {
  const { publicData } = splitCatalogWrite(sample('   '));
  assert.equal(publicData.imageUrl, '');
  assert.equal(publicData.imageUrl.includes('unsplash'), false);
  const kept = splitCatalogWrite(sample('https://cdn.example/foto.jpg'));
  assert.equal(kept.publicData.imageUrl, 'https://cdn.example/foto.jpg');
});
