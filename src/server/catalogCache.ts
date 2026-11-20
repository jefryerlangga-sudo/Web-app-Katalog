/**
 * Short in-process cache for the base catalog snapshot and approved roles.
 * The shared copy of the product list lives in the private Vercel Blob.
 * This file has no package imports. Relative imports need a .ts extension.
 */

/** Approved roles only. Pending and rejected results are not cached. */
export const ACCOUNT_ROLE_TTL_SECONDS = 60;

/** This instance reuses a snapshot briefly so a burst does not re-read the Blob. */
export const CATALOG_MEMORY_TTL_MS = 15_000;

export interface CatalogCache {
  getProducts(): Promise<unknown[] | undefined>;
  setProducts(products: unknown[]): Promise<void>;
  getRole(uid: string): Promise<string | undefined>;
  setRole(uid: string, role: string): Promise<void>;
  clear(): Promise<void>;
}

interface MemoryEntry {
  value: unknown;
  exp: number;
}

export function createMemoryCatalogCache(
  now: () => number = Date.now,
  productTtlMs = CATALOG_MEMORY_TTL_MS
): CatalogCache {
  const values = new Map<string, MemoryEntry>();

  function read(key: string): unknown | undefined {
    const entry = values.get(key);
    if (!entry) return undefined;
    if (entry.exp <= now()) {
      values.delete(key);
      return undefined;
    }
    return entry.value;
  }

  return {
    async getProducts() {
      const value = read('products');
      return Array.isArray(value) ? value : undefined;
    },
    async setProducts(products) {
      values.set('products', { value: products, exp: now() + productTtlMs });
    },
    async getRole(uid) {
      const value = read(`role:${uid}`);
      return typeof value === 'string' ? value : undefined;
    },
    async setRole(uid, role) {
      values.set(`role:${uid}`, { value: role, exp: now() + ACCOUNT_ROLE_TTL_SECONDS * 1000 });
    },
    async clear() {
      values.clear();
    },
  };
}

let shared: CatalogCache | null = null;

export function getSharedCatalogCache(): CatalogCache {
  if (!shared) shared = createMemoryCatalogCache();
  return shared;
}
