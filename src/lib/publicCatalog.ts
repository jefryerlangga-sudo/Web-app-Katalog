import type { CatalogTier } from '../config/pricing';
import type { StorePromo } from './promo';
import { Product } from '../types/product';

const CACHE_KEY = 'partshop_catalog_cache_v2';
const LEGACY_CACHE_KEY = 'partshop_catalog_cache_v1';

interface CatalogCachePayload {
  uid: string;
  tier: CatalogTier;
  products: Product[];
  promo: StorePromo;
}

export interface AuthorizedCatalog {
  products: Product[];
  promo: StorePromo;
  tier: CatalogTier;
}

function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window[kind];
  } catch {
    return null;
  }
}

function readStorage(storage: Storage | null, uid: string, tier: CatalogTier): CatalogCachePayload | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogCachePayload;
    if (!parsed || parsed.uid !== uid || parsed.tier !== tier) return null;
    if (!Array.isArray(parsed.products) || !parsed.promo) return null;
    return {
      uid,
      tier,
      products: parsed.products.map(stripDealerCost) as Product[],
      promo: parsed.promo,
    };
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage | null, payload: CatalogCachePayload) {
  if (!storage) return;
  try {
    storage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...payload,
        products: payload.products.map(stripDealerCost),
      })
    );
  } catch {
    // Quota or private mode. The network response still paints the page.
  }
}

export function stripDealerCost<T extends object>(product: T): Omit<T, 'wholesalePrice'> {
  const copy = { ...product } as Omit<T, 'wholesalePrice'> & { wholesalePrice?: unknown };
  delete copy.wholesalePrice;
  return copy;
}

export function readCatalogCache(uid: string, tier: CatalogTier): CatalogCachePayload | null {
  return (
    readStorage(browserStorage('localStorage'), uid, tier) ??
    readStorage(browserStorage('sessionStorage'), uid, tier)
  );
}

export function writeCatalogCache(uid: string, tier: CatalogTier, products: Product[], promo: StorePromo) {
  const payload = { uid, tier, products, promo };
  writeStorage(browserStorage('localStorage'), payload);
  writeStorage(browserStorage('sessionStorage'), payload);
}

export function clearCatalogCache() {
  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    const storage = browserStorage(kind);
    if (!storage) continue;
    try {
      storage.removeItem(CACHE_KEY);
      storage.removeItem(LEGACY_CACHE_KEY);
    } catch {
      // Private mode.
    }
  }
}

export async function fetchAuthorizedCatalog(
  idToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<AuthorizedCatalog> {
  const response = await fetchImpl('/api/catalog', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (response.status === 401 || response.status === 403) {
    let message = response.status === 401 ? 'Masuk diperlukan' : 'Akun belum disetujui';
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Keep the status fallback.
    }
    throw new Error(message);
  }
  if (!response.ok) {
    throw new Error(`Katalog tidak dapat dimuat (${response.status})`);
  }
  const body = (await response.json()) as { products?: unknown; promo?: StorePromo; tier?: string };
  if (
    !body ||
    !Array.isArray(body.products) ||
    !body.promo ||
    (body.tier !== 'grosir' && body.tier !== 'end_user')
  ) {
    throw new Error('Katalog tidak dapat dimuat');
  }
  return {
    products: body.products.map((item) => stripDealerCost(item as Product) as Product),
    promo: body.promo,
    tier: body.tier,
  };
}
