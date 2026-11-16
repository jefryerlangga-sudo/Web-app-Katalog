/** Two writes per product (public doc + productAdmin). Stay under Firestore's 500-write batch cap. */
export const WRITES_PER_PRODUCT = 2;
export const PRODUCTS_PER_BATCH = 200;

export interface BatchSaveProgress {
  saved: number;
  total: number;
  chunkIndex: number;
  chunkCount: number;
}

export interface CatalogWrite<T> {
  id: string;
  product: T;
}

/** Document id follows the SKU (or an existing id), so a second import overwrites the same doc. */
export function catalogDocId(product: { id?: string; sku: string }): string {
  return (product.id || product.sku).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('Ukuran batch tidak valid');
  }
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * Last row for a SKU wins, and each id is written once.
 * Firestore rejects a batch that sets the same document twice.
 */
export function prepareCatalogWrites<T extends { id?: string; sku?: string; name?: string }>(
  items: T[]
): CatalogWrite<T>[] {
  const byId = new Map<string, CatalogWrite<T>>();
  for (const product of items) {
    const sku = product.sku?.trim();
    const name = product.name?.trim();
    if (!sku || !name) continue;
    const id = catalogDocId({ id: product.id, sku });
    if (!id) continue;
    byId.set(id, { id, product: { ...product, sku, name } });
  }
  return [...byId.values()];
}

export function chunkFailureMessage(
  chunkIndex: number,
  chunkCount: number,
  start: number,
  end: number
): string {
  return `Gagal menyimpan batch ${chunkIndex + 1} dari ${chunkCount} (produk ${start}–${end}).`;
}

export async function commitInChunks<T>(
  items: T[],
  size: number,
  commit: (chunk: T[], index: number) => Promise<void>,
  onProgress?: (progress: BatchSaveProgress) => void
): Promise<number> {
  const chunks = chunkItems(items, size);
  if (chunks.length === 0) return 0;

  let saved = 0;
  const total = items.length;
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const start = saved + 1;
    const end = saved + chunk.length;
    onProgress?.({ saved, total, chunkIndex: index, chunkCount: chunks.length });
    try {
      await commit(chunk, index);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${chunkFailureMessage(index, chunks.length, start, end)} ${detail}`);
    }
    saved = end;
    onProgress?.({ saved, total, chunkIndex: index, chunkCount: chunks.length });
  }
  return saved;
}
