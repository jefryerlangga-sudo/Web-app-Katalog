/**
 * Shared base-price snapshot for GET /api/catalog.
 * The per-user response stays private. Firestore is read when the snapshot
 * or a role entry is missing, not on every visit.
 * Relative imports in this file need a .ts extension. Vercel compiles it as
 * its own Node ESM module.
 */

/** How long one region keeps the base catalog. Admin saves also clear it. */
export const CATALOG_SNAPSHOT_TTL_SECONDS = 30 * 60;

/** Approved roles only. Pending and rejected results are not cached. */
export const ACCOUNT_ROLE_TTL_SECONDS = 60;

/** This instance remembers a snapshot briefly so a burst does not all miss at once. */
const MEMORY_TTL_MS = 15_000;

/** Stay under the Runtime Cache 2 MB item limit. */
const MAX_RUNTIME_CHUNK_CHARS = 1_200_000;

export const CATALOG_PRODUCT_TAG = 'catalog-products';
export const CATALOG_ROLE_TAG = 'catalog-roles';

const PRODUCTS_KEY = 'products';
const PRODUCTS_PARTS_KEY = 'products-parts';

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

export function createMemoryCatalogCache(now: () => number = Date.now): CatalogCache {
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
      const value = read(PRODUCTS_KEY);
      return Array.isArray(value) ? value : undefined;
    },
    async setProducts(products) {
      values.set(PRODUCTS_KEY, { value: products, exp: now() + CATALOG_SNAPSHOT_TTL_SECONDS * 1000 });
    },
    async getRole(uid) {
      const value = read(roleKey(uid));
      return typeof value === 'string' ? value : undefined;
    },
    async setRole(uid, role) {
      values.set(roleKey(uid), { value: role, exp: now() + ACCOUNT_ROLE_TTL_SECONDS * 1000 });
    },
    async clear() {
      values.clear();
    },
  };
}

/**
 * Process memory in front of the Vercel Runtime Cache.
 * Outside Vercel the runtime layer is absent and this instance is the only copy.
 * The short window is cleared with the snapshot so an admin save is visible on
 * this instance immediately. Other instances drop their window within 15s and
 * then see the tag expiration.
 */
export function createSharedCatalogCache(): CatalogCache {
  const local = createMemoryCatalogCache(() => Date.now());
  const recent = new Map<string, MemoryEntry>();

  function readRecent(key: string): unknown | undefined {
    const entry = recent.get(key);
    if (!entry || entry.exp <= Date.now()) return undefined;
    return entry.value;
  }

  function writeRecent(key: string, value: unknown) {
    recent.set(key, { value, exp: Date.now() + MEMORY_TTL_MS });
  }

  return {
    async getProducts() {
      const fresh = readRecent(PRODUCTS_KEY);
      if (Array.isArray(fresh)) return fresh;
      if (await hasRuntime()) {
        const remote = await readRemoteProducts();
        if (remote) {
          writeRecent(PRODUCTS_KEY, remote);
          return remote;
        }
        return undefined;
      }
      return local.getProducts();
    },
    async setProducts(products) {
      writeRecent(PRODUCTS_KEY, products);
      if (await hasRuntime()) {
        await writeRemoteProducts(products);
        return;
      }
      await local.setProducts(products);
    },
    async getRole(uid) {
      const key = roleKey(uid);
      const fresh = readRecent(key);
      if (typeof fresh === 'string') return fresh;
      if (await hasRuntime()) {
        const remote = await runtimeGet(key);
        if (typeof remote === 'string') {
          writeRecent(key, remote);
          return remote;
        }
        return undefined;
      }
      return local.getRole(uid);
    },
    async setRole(uid, role) {
      const key = roleKey(uid);
      writeRecent(key, role);
      if (await hasRuntime()) {
        await runtimeSet(key, role, ACCOUNT_ROLE_TTL_SECONDS, [CATALOG_ROLE_TAG], 'catalog-role');
        return;
      }
      await local.setRole(uid, role);
    },
    async clear() {
      recent.clear();
      await local.clear();
      await runtimeExpire([CATALOG_PRODUCT_TAG, CATALOG_ROLE_TAG]);
    },
  };
}

let shared: CatalogCache | null = null;

export function getSharedCatalogCache(): CatalogCache {
  if (!shared) shared = createSharedCatalogCache();
  return shared;
}

function roleKey(uid: string): string {
  return `role:${uid}`;
}

interface RuntimeCacheLike {
  get: (key: string) => Promise<unknown | null>;
  set: (key: string, value: unknown, options?: { name?: string; tags?: string[]; ttl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
  expireTag: (tag: string | string[]) => Promise<void>;
}

let runtimePromise: Promise<RuntimeCacheLike | null> | undefined;

function hasRuntime(): Promise<boolean> {
  return runtime().then((cache) => cache !== null);
}

async function runtime(): Promise<RuntimeCacheLike | null> {
  if (process.env.VERCEL !== '1') return null;
  if (!runtimePromise) {
    runtimePromise = (async () => {
      try {
        const mod = (await import('@vercel/functions')) as {
          getCache?: (options?: { namespace?: string }) => RuntimeCacheLike;
        };
        if (typeof mod.getCache !== 'function') return null;
        return mod.getCache({ namespace: 'partshop-katalog' });
      } catch {
        return null;
      }
    })();
  }
  return runtimePromise;
}

async function runtimeGet(key: string): Promise<unknown> {
  try {
    const cache = await runtime();
    if (!cache) return undefined;
    const value = await cache.get(key);
    return value ?? undefined;
  } catch {
    return undefined;
  }
}

async function runtimeSet(key: string, value: unknown, ttl: number, tags: string[], name: string) {
  try {
    const cache = await runtime();
    if (!cache) return;
    await cache.set(key, value, { ttl, tags, name });
  } catch {
    // The in-process copy still serves this instance. The next miss reads Firestore.
  }
}

async function runtimeExpire(tags: string[]) {
  try {
    const cache = await runtime();
    if (!cache) return;
    await cache.expireTag(tags);
  } catch {
    // Local memory was already cleared by the caller.
  }
}

async function readRemoteProducts(): Promise<unknown[] | undefined> {
  const single = await runtimeGet(PRODUCTS_KEY);
  if (Array.isArray(single)) return single;
  const parts = await runtimeGet(PRODUCTS_PARTS_KEY);
  const count = typeof parts === 'number' ? parts : 0;
  if (count < 1) return undefined;
  const products: unknown[] = [];
  for (let index = 0; index < count; index += 1) {
    const chunk = await runtimeGet(`${PRODUCTS_KEY}:${index}`);
    if (!Array.isArray(chunk)) return undefined;
    products.push(...chunk);
  }
  return products;
}

async function writeRemoteProducts(products: unknown[]) {
  const json = JSON.stringify(products);
  if (json.length <= MAX_RUNTIME_CHUNK_CHARS) {
    await runtimeSet(PRODUCTS_KEY, products, CATALOG_SNAPSHOT_TTL_SECONDS, [CATALOG_PRODUCT_TAG], 'catalog-products');
    await runtimeDelete(PRODUCTS_PARTS_KEY);
    return;
  }
  const chunks = chunkProducts(products);
  await runtimeSet(PRODUCTS_PARTS_KEY, chunks.length, CATALOG_SNAPSHOT_TTL_SECONDS, [CATALOG_PRODUCT_TAG], 'catalog-products-parts');
  for (let index = 0; index < chunks.length; index += 1) {
    await runtimeSet(
      `${PRODUCTS_KEY}:${index}`,
      chunks[index],
      CATALOG_SNAPSHOT_TTL_SECONDS,
      [CATALOG_PRODUCT_TAG],
      `catalog-products-${index}`
    );
  }
  await runtimeDelete(PRODUCTS_KEY);
}

async function runtimeDelete(key: string) {
  try {
    const cache = await runtime();
    if (!cache) return;
    await cache.delete(key);
  } catch {
    // Best effort. TTL still drops the old key.
  }
}

function chunkProducts(products: unknown[]): unknown[][] {
  const chunks: unknown[][] = [];
  let current: unknown[] = [];
  for (const product of products) {
    const candidate = [...current, product];
    if (current.length > 0 && JSON.stringify(candidate).length >= MAX_RUNTIME_CHUNK_CHARS) {
      chunks.push(current);
      current = [product];
      continue;
    }
    current = candidate;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
