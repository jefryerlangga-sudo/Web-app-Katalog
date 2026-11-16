import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCTS_PER_BATCH,
  WRITES_PER_PRODUCT,
  catalogDocId,
  chunkItems,
  commitInChunks,
  prepareCatalogWrites,
} from '../src/firebase/catalogBatch.ts';

test('each Firestore batch stays under 500 writes', () => {
  assert.equal(WRITES_PER_PRODUCT, 2);
  assert.ok(PRODUCTS_PER_BATCH * WRITES_PER_PRODUCT < 500);
  const items = Array.from({ length: 450 }, (_, index) => index);
  const chunks = chunkItems(items, PRODUCTS_PER_BATCH);
  assert.deepEqual(
    chunks.map((chunk) => chunk.length),
    [200, 200, 50]
  );
  for (const chunk of chunks) {
    assert.ok(chunk.length * WRITES_PER_PRODUCT < 500);
  }
});

test('re-importing a SKU keeps the same document id and the last row wins', () => {
  assert.equal(catalogDocId({ sku: 'ACC-ANK-001' }), 'ACC-ANK-001');
  assert.equal(catalogDocId({ id: 'ACC-ANK-001', sku: 'OTHER' }), 'ACC-ANK-001');
  assert.equal(catalogDocId({ sku: 'SKU 1/2' }), 'SKU_1_2');

  const writes = prepareCatalogWrites([
    { sku: 'ACC-ANK-001', name: 'Versi lama' },
    { sku: 'ACC-ANK-001', name: 'Versi baru' },
    { sku: '  ', name: 'Tanpa SKU' },
    { sku: 'ACC-BAS-002', name: '' },
  ]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].id, 'ACC-ANK-001');
  assert.equal(writes[0].product.name, 'Versi baru');
});

test('a failed chunk is named and earlier chunks are already committed', async () => {
  const committed: number[][] = [];
  await assert.rejects(
    () =>
      commitInChunks(
        [1, 2, 3, 4],
        2,
        async (chunk, index) => {
          if (index === 1) throw new Error('permission-denied');
          committed.push(chunk);
        }
      ),
    /Gagal menyimpan batch 2 dari 2 \(produk 3–4\)[\s\S]*permission-denied/
  );
  assert.deepEqual(committed, [[1, 2]]);
});
