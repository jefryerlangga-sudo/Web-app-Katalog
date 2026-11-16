/**
 * Public catalog read for guests. One Firestore runQuery sequence, then the CDN
 * holds the JSON so storefront visits do not each list the products collection.
 */
import appletConfig from '../../firebase-applet-config.json';

export const CATALOG_CACHE_CONTROL = 'public, s-maxage=1800, stale-while-revalidate=86400';
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
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

export async function handleCatalogRequest(
  request: Request,
  options: FetchActiveCatalogOptions = {}
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return Response.json(
      { error: 'Metode tidak diizinkan' },
      { status: 405, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const products = await fetchActiveCatalog(options);
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({ products }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': CATALOG_CACHE_CONTROL,
      },
    });
  } catch {
    return Response.json(
      { error: 'Katalog tidak dapat dimuat' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
