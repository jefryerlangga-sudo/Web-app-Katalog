/**
 * Signed-in catalog read. Prices depend on the caller's approved tier, so the
 * HTTP response is private and is not stored on the shared CDN.
 * The base product list is one shared snapshot (in-process, and on Vercel the
 * Runtime Cache). A normal visit reads the caller's role once, or not at all
 * when that role is still in the short cache. The ~1,500 product documents are
 * read only when the snapshot is missing or an admin has cleared it.
 * `promo` is the campaign shipped in the repo (no Firestore read).
 * Import server modules with a .ts extension. Vercel emits each TypeScript file
 * as its own Node ESM module and does not resolve extensionless imports.
 */
import appletConfig from '../../firebase-applet-config.json' with { type: 'json' };
import { priceForTier, promoForTier, type CatalogTier } from '../config/pricing.ts';
import { authorizeCatalogRequest, type CatalogAuthorization } from './catalogAccess.ts';
import { getSharedCatalogCache, type CatalogCache } from './catalogCache.ts';
import {
  CATALOG_UNSEEDED_ERROR,
  defaultCatalogBlobStore,
  type CatalogBlobStore,
} from './catalogBlob.ts';
import { publicPromoPayload } from './promoCampaign.ts';

/** Browser and CDN must not reuse one account's prices for another. */
export const CATALOG_CACHE_CONTROL = 'private, no-store';
export const CATALOG_PAGE_SIZE = 300;

const PUBLIC_FIELDS = [
  'sku',
  'name',
  'brand',
  'category',
  'subcategory',
  'imageUrl',
  'specification',
  'compatibility',
  'sellingPoint1',
  'sellingPoint2',
  'sellingPoint3',
  'suggestedRetailPrice',
  'stockStatus',
  'positioning',
  'targetCustomer',
  'isProductFocus',
  'isBestSeller',
  'crossSellNotes',
  'isActive',
  'createdAt',
  'updatedAt',
] as const;

type PublicField = (typeof PUBLIC_FIELDS)[number];

export interface PublicCatalogProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  imageUrl: string;
  specification: string;
  compatibility: string;
  sellingPoint1: string;
  sellingPoint2: string;
  sellingPoint3: string;
  suggestedRetailPrice: number;
  stockStatus: string;
  positioning: string;
  targetCustomer: string;
  isProductFocus: boolean;
  isBestSeller: boolean;
  crossSellNotes: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name?: string;
  fields?: Record<string, FirestoreValue>;
}

export interface CatalogSource {
  projectId: string;
  firestoreDatabaseId: string;
  apiKey: string;
}

export interface FetchActiveCatalogOptions {
  fetchImpl?: typeof fetch;
  source?: CatalogSource;
  pageSize?: number;
  endpoint?: string;
  /** Service-account bearer. Bypasses security rules when product reads are admin-only. */
  accessToken?: string;
  authorize?: (request: Request) => Promise<CatalogAuthorization>;
  /**
   * Shared base-price snapshot. Pass null to skip it.
   * Omitted on a real request uses the process/Runtime Cache.
   * Omitted together with fetchImpl or endpoint skips it, so tests stay isolated.
   */
  catalogCache?: CatalogCache | null;
  /** Private Blob snapshot. Omitted with fetchImpl/endpoint skips the real store. */
  blobStore?: CatalogBlobStore | null;
}

export function catalogResponseHeaders(): Record<string, string> {
  return {
    'Cache-Control': CATALOG_CACHE_CONTROL,
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
    Vary: 'Authorization',
    Pragma: 'no-cache',
  };
}

export function incomingCatalogRequest(
  method: string,
  authorization: string | null | undefined
): Request {
  const headers = new Headers();
  if (authorization) headers.set('authorization', authorization);
  return new Request('http://localhost/api/catalog', { method, headers });
}

function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue ?? '';
  if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return Boolean(value.booleanValue);
  if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return value.timestampValue ?? '';
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (value.arrayValue) return (value.arrayValue.values ?? []).map((entry) => decodeValue(entry));
  if (value.mapValue?.fields) {
    const mapped: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value.mapValue.fields)) {
      mapped[key] = decodeValue(entry);
    }
    return mapped;
  }
  return undefined;
}

export function catalogQueryUrl(source: CatalogSource = appletConfig): string {
  const projectId = encodeURIComponent(source.projectId);
  const databaseId = encodeURIComponent(source.firestoreDatabaseId);
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${encodeURIComponent(source.apiKey)}`;
}

export function toPublicCatalogProduct(document: FirestoreDocument): PublicCatalogProduct | null {
  const name = document.name || '';
  const id = name.split('/').pop() || '';
  const fields = document.fields || {};
  if (!id) return null;

  const raw: Partial<Record<PublicField, unknown>> = {};
  for (const key of PUBLIC_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      raw[key] = decodeValue(fields[key]);
    }
  }

  const sku = String(raw.sku ?? '').trim();
  const productName = String(raw.name ?? '').trim();
  if (!sku || !productName) return null;
  if (raw.isActive === false) return null;

  const price = Number(raw.suggestedRetailPrice);
  return {
    id,
    sku,
    name: productName,
    brand: String(raw.brand ?? ''),
    category: String(raw.category ?? ''),
    subcategory: String(raw.subcategory ?? ''),
    imageUrl: String(raw.imageUrl ?? '').trim(),
    specification: String(raw.specification ?? ''),
    compatibility: String(raw.compatibility ?? ''),
    sellingPoint1: String(raw.sellingPoint1 ?? ''),
    sellingPoint2: String(raw.sellingPoint2 ?? ''),
    sellingPoint3: String(raw.sellingPoint3 ?? ''),
    suggestedRetailPrice: Number.isFinite(price) && price >= 0 ? price : 0,
    stockStatus: String(raw.stockStatus ?? 'In Stock'),
    positioning: String(raw.positioning ?? 'Better'),
    targetCustomer: String(raw.targetCustomer ?? ''),
    isProductFocus: Boolean(raw.isProductFocus),
    isBestSeller: Boolean(raw.isBestSeller),
    crossSellNotes: String(raw.crossSellNotes ?? ''),
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function queryBody(pageSize: number, startAfter: string | null) {
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: 'products' }],
    orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
    limit: pageSize,
  };
  if (startAfter) {
    structuredQuery.startAt = {
      values: [{ referenceValue: startAfter }],
      before: false,
    };
  }
  return { structuredQuery };
}

export async function fetchActiveCatalog(options: FetchActiveCatalogOptions = {}): Promise<PublicCatalogProduct[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const pageSize = options.pageSize ?? CATALOG_PAGE_SIZE;
  const endpoint = options.endpoint ?? catalogQueryUrl(options.source);
  const products: PublicCatalogProduct[] = [];
  let startAfter: string | null = null;

  for (let page = 0; page < 40; page += 1) {
    let response: Response;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
    response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(queryBody(pageSize, startAfter)),
      });
    } catch {
      throw new Error('Katalog tidak dapat dimuat');
    }
    if (!response.ok) {
      throw new Error(`Katalog tidak dapat dimuat (${response.status})`);
    }

    const rows = (await response.json()) as Array<{ document?: FirestoreDocument }>;
    const documents = (Array.isArray(rows) ? rows : []).filter((row) => row.document?.name);
    for (const row of documents) {
      const product = toPublicCatalogProduct(row.document as FirestoreDocument);
      if (product) products.push(product);
    }
    if (documents.length < pageSize) break;
    startAfter = documents[documents.length - 1].document?.name || null;
    if (!startAfter) break;
  }

  return products;
}

function catalogJson(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: catalogResponseHeaders() });
}

function resolveCatalogCache(options: FetchActiveCatalogOptions): CatalogCache | undefined {
  if (options.catalogCache === null) return undefined;
  if (options.catalogCache) return options.catalogCache;
  if (options.fetchImpl || options.endpoint) return undefined;
  return getSharedCatalogCache();
}

function resolveBlobStore(options: FetchActiveCatalogOptions): CatalogBlobStore | undefined {
  if (options.blobStore === null) return undefined;
  if (options.blobStore) return options.blobStore;
  if (options.fetchImpl || options.endpoint) return undefined;
  return {
    read: async () => {
      const store = await defaultCatalogBlobStore();
      return store.read();
    },
    write: async (products) => {
      const store = await defaultCatalogBlobStore();
      await store.write(products);
    },
  };
}

function bearerToken(request: Request): string | null {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

const UNSYNCED_STATUS = 503;

async function readSnapshot(
  options: FetchActiveCatalogOptions,
  cache: CatalogCache | undefined,
  blob: CatalogBlobStore | undefined,
  idToken: string | null,
  canSeed: boolean
): Promise<PublicCatalogProduct[] | 'unseeded'> {
  if (cache) {
    const memory = await cache.getProducts();
    if (memory) return memory as PublicCatalogProduct[];
  }
  if (blob) {
    const stored = await blob.read();
    if (stored) {
      const products = stored as unknown as PublicCatalogProduct[];
      if (cache) await cache.setProducts(products);
      return products;
    }
  }
  if (!canSeed || !idToken) return 'unseeded';
  const products = await fetchActiveCatalog({ ...options, accessToken: idToken });
  if (blob) await blob.write(products);
  if (cache) await cache.setProducts(products);
  return products;
}

function priceProducts(products: PublicCatalogProduct[], tier: CatalogTier): PublicCatalogProduct[] {
  if (tier !== 'end_user') return products;
  return products.map((product) => ({
    ...product,
    suggestedRetailPrice: priceForTier(product.suggestedRetailPrice, tier),
  }));
}

export async function handleCatalogRequest(
  request: Request,
  options: FetchActiveCatalogOptions = {}
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return catalogJson({ error: 'Metode tidak diizinkan' }, 405);
  }

  const cache = resolveCatalogCache(options);
  const authorize =
    options.authorize ??
    ((incoming: Request) =>
      authorizeCatalogRequest(incoming, {
        fetchImpl: options.fetchImpl,
        source: options.source,
        roleCache: cache,
      }));

  const decision = await authorize(request);
  if (!decision.ok) {
    return catalogJson({ error: decision.error }, decision.status);
  }

  const blob = resolveBlobStore(options);
  try {
    const products = await readSnapshot(
      options,
      cache,
      blob,
      bearerToken(request),
      Boolean(decision.access.canRefresh)
    );
    if (products === 'unseeded') {
      return catalogJson({ error: CATALOG_UNSEEDED_ERROR }, UNSYNCED_STATUS);
    }
    const payload = {
      products: priceProducts(products, decision.access.tier),
      promo: promoForTier(publicPromoPayload(), decision.access.tier),
      tier: decision.access.tier,
    };
    const serialized = JSON.stringify(payload);
    if (serialized.includes('wholesalePrice')) {
      return catalogJson({ error: 'Katalog tidak dapat dimuat' }, 502);
    }
    return new Response(request.method === 'HEAD' ? null : serialized, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...catalogResponseHeaders(),
      },
    });
  } catch {
    return catalogJson({ error: 'Katalog tidak dapat dimuat' }, 502);
  }
}

/** Rebuilds the private Blob snapshot from Firestore. Master admin only. */
export async function handleCatalogRefresh(
  request: Request,
  options: FetchActiveCatalogOptions = {}
): Promise<Response> {
  if (request.method !== 'POST') {
    return catalogJson({ error: 'Metode tidak diizinkan' }, 405);
  }
  const cache = resolveCatalogCache(options);
  const authorize =
    options.authorize ??
    ((incoming: Request) =>
      authorizeCatalogRequest(incoming, {
        fetchImpl: options.fetchImpl,
        source: options.source,
        roleCache: cache,
      }));
  const decision = await authorize(request);
  if (!decision.ok) {
    return catalogJson({ error: decision.error }, decision.status);
  }
  if (!decision.access.canRefresh) {
    return catalogJson({ error: 'Hanya master admin yang dapat menyegarkan katalog' }, 403);
  }
  const idToken = bearerToken(request);
  if (!idToken) {
    return catalogJson({ error: 'Masuk diperlukan' }, 401);
  }
  const blob = resolveBlobStore(options);
  try {
    const products = await fetchActiveCatalog({ ...options, accessToken: idToken });
    if (blob) await blob.write(products);
    if (cache) {
      await cache.clear();
      await cache.setProducts(products);
    }
    const body = JSON.stringify({ ok: true, count: products.length });
    if (body.includes('wholesalePrice')) {
      return catalogJson({ error: 'Katalog tidak dapat dimuat' }, 502);
    }
    return catalogJson({ ok: true, count: products.length }, 200);
  } catch {
    return catalogJson({ error: 'Katalog tidak dapat dimuat' }, 502);
  }
}
