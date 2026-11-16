import { Product } from '../types/product';

const CACHE_KEY = 'partshop_catalog_cache_v1';

interface CatalogCachePayload {
  products: Product[];
}

function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window[kind];
  } catch {
    return null;
  }
}

function readStorage(storage: Storage | null): Product[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogCachePayload;
    if (!parsed || !Array.isArray(parsed.products) || parsed.products.length === 0) return null;
    return parsed.products.map(stripDealerCost);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | null, products: Product[]) {
  if (!storage) return;
  try {
    storage.setItem(CACHE_KEY, JSON.stringify({ products: products.map(stripDealerCost) }));
  } catch {
    // Quota or private mode. The network response still paints the page.
  }
}

export function stripDealerCost<T extends object>(product: T): Omit<T, 'wholesalePrice'> {
  const copy = { ...product } as Omit<T, 'wholesalePrice'> & { wholesalePrice?: unknown };
  delete copy.wholesalePrice;
  return copy;
}

export function readCatalogCache(): Product[] | null {
  return readStorage(browserStorage('localStorage')) ?? readStorage(browserStorage('sessionStorage'));
}

export function writeCatalogCache(products: Product[]) {
  const safe = products.map(stripDealerCost) as Product[];
  writeStorage(browserStorage('localStorage'), safe);
  writeStorage(browserStorage('sessionStorage'), safe);
}

export async function fetchPublicCatalog(fetchImpl: typeof fetch = fetch): Promise<Product[]> {
  const response = await fetchImpl('/api/catalog');
  if (!response.ok) {
    throw new Error(`Katalog tidak dapat dimuat (${response.status})`);
  }
  const body = (await response.json()) as { products?: unknown };
  if (!body || !Array.isArray(body.products)) {
    throw new Error('Katalog tidak dapat dimuat');
  }
  return body.products.map((item) => stripDealerCost(item as Product) as Product);
}
