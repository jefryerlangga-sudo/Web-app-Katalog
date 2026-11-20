/**
 * Private Vercel Blob snapshot of the public catalog.
 * Reads and writes use BLOB_READ_WRITE_TOKEN from the connected store
 * `partshop-katalog-private`. No Firebase service account is involved.
 * Relative imports need a .ts extension.
 */
export const CATALOG_BLOB_PATH = 'catalog/products-v1.json';

export const CATALOG_UNSEEDED_ERROR =
  'Katalog belum disinkronkan. Admin perlu menekan Sinkronkan Katalog.';

export interface CatalogBlobStore {
  read(): Promise<Array<Record<string, unknown>> | null>;
  write(products: readonly object[]): Promise<void>;
}

interface BlobGetResult {
  statusCode?: number;
  stream?: ReadableStream<Uint8Array> | null;
}

interface BlobModule {
  get: (pathname: string, options: { access: 'private'; useCache: false }) => Promise<BlobGetResult | null>;
  put: (
    pathname: string,
    body: string,
    options: {
      access: 'private';
      allowOverwrite: true;
      addRandomSuffix: false;
      contentType: string;
    }
  ) => Promise<unknown>;
}

export function snapshotJson(products: readonly object[]): string {
  const clean = products.map(stripWholesale);
  const body = JSON.stringify({ products: clean });
  if (body.includes('wholesalePrice')) {
    throw new Error('Snapshot menolak harga modal');
  }
  return body;
}

export function parseSnapshot(raw: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(raw) as { products?: unknown };
  if (!parsed || !Array.isArray(parsed.products)) {
    throw new Error('Snapshot katalog tidak valid');
  }
  return parsed.products.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Snapshot katalog tidak valid');
    }
    return stripWholesale(item as Record<string, unknown>);
  });
}

export function stripWholesale<T extends object>(product: T): T {
  const copy = { ...product } as T & { wholesalePrice?: unknown };
  delete copy.wholesalePrice;
  return copy;
}

export function createVercelBlobStore(mod: BlobModule): CatalogBlobStore {
  return {
    async read() {
      const result = await mod.get(CATALOG_BLOB_PATH, { access: 'private', useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      const raw = await new Response(result.stream).text();
      return parseSnapshot(raw);
    },
    async write(products) {
      await mod.put(CATALOG_BLOB_PATH, snapshotJson(products), {
        access: 'private',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
      });
    },
  };
}

export async function defaultCatalogBlobStore(): Promise<CatalogBlobStore> {
  const mod = (await import('@vercel/blob')) as BlobModule;
  return createVercelBlobStore(mod);
}
