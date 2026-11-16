import { PositioningTier, Product, StockStatus } from '../types/product';

/** Public catalog. Readable by guests. Must not contain dealer cost. */
export const PRODUCTS_COLLECTION = 'products';

/** Verified master-admin only. Holds wholesalePrice for the same document id. */
export const PRODUCT_ADMIN_COLLECTION = 'productAdmin';

const STOCK: readonly StockStatus[] = ['In Stock', 'Low Stock', 'Pre-Order', 'Out of Stock'];
const TIERS: readonly PositioningTier[] = ['Good', 'Better', 'Best'];

export interface PublicProductWrite {
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
  stockStatus: StockStatus;
  positioning: PositioningTier;
  targetCustomer: string;
  isProductFocus: boolean;
  isBestSeller: boolean;
  crossSellNotes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAdminWrite {
  wholesalePrice: number;
  updatedAt: string;
}

export function stripWholesalePrice<T extends object>(data: T): Omit<T, 'wholesalePrice'> {
  const copy = { ...data } as Omit<T, 'wholesalePrice'> & { wholesalePrice?: unknown };
  delete copy.wholesalePrice;
  return copy;
}

/** Drop dealer cost before the document ever reaches React state. */
export function readPublicProduct(id: string, data: Record<string, unknown>): Product {
  const rest = stripWholesalePrice(data);
  return {
    ...(rest as unknown as Product),
    id,
  };
}

function clip(value: unknown, max: number, fallback = ''): string {
  const text = String(value ?? fallback).trim();
  return text.length > max ? text.slice(0, max) : text;
}

function money(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount;
}

/**
 * Public payload is a full document overwrite (no merge), so a legacy wholesalePrice
 * field is removed. Dealer cost is written only to productAdmin/{id}.
 */
export function splitCatalogWrite(
  product: Product,
  now = new Date().toISOString()
): { publicData: PublicProductWrite; adminData: ProductAdminWrite } {
  const stock = STOCK.includes(product.stockStatus) ? product.stockStatus : 'In Stock';
  const tier = TIERS.includes(product.positioning) ? product.positioning : 'Better';
  const publicData: PublicProductWrite = {
    sku: clip(product.sku, 64),
    name: clip(product.name, 150),
    brand: clip(product.brand, 80),
    category: clip(product.category, 80),
    subcategory: clip(product.subcategory, 80),
    imageUrl: clip(product.imageUrl, 500),
    specification: clip(product.specification, 1000),
    compatibility: clip(product.compatibility, 600),
    sellingPoint1: clip(product.sellingPoint1, 200),
    sellingPoint2: clip(product.sellingPoint2, 200),
    sellingPoint3: clip(product.sellingPoint3, 200),
    suggestedRetailPrice: money(product.suggestedRetailPrice),
    stockStatus: stock,
    positioning: tier,
    targetCustomer: clip(product.targetCustomer, 300),
    isProductFocus: Boolean(product.isProductFocus),
    isBestSeller: Boolean(product.isBestSeller),
    crossSellNotes: clip(product.crossSellNotes, 300),
    isActive: product.isActive !== false,
    createdAt: product.createdAt || now,
    updatedAt: now,
  };

  return {
    publicData,
    adminData: {
      wholesalePrice: money(product.wholesalePrice),
      updatedAt: now,
    },
  };
}

/**
 * Dealer cost is attached in memory for the verified master admin only.
 * Values come from productAdmin, never from the public products document.
 */
function asDealerPrice(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Active/inactive toggle. A legacy wholesalePrice on the public document is copied
 * into productAdmin before that field is removed. An existing positive dealer price
 * is left in place.
 */
export function planActiveToggle(input: {
  currentActive: boolean;
  publicWholesale: unknown;
  adminWholesale: unknown;
  now: string;
}): { isActive: boolean; adminWrite: ProductAdminWrite | null } {
  const isActive = !input.currentActive;
  const legacy = asDealerPrice(input.publicWholesale);
  const existing = asDealerPrice(input.adminWholesale);
  if (legacy == null || legacy === 0) {
    return { isActive, adminWrite: null };
  }
  if (existing != null && existing > 0) {
    return { isActive, adminWrite: null };
  }
  return {
    isActive,
    adminWrite: { wholesalePrice: legacy, updatedAt: input.now },
  };
}

export function applyDealerCost(
  product: Product,
  costs: Record<string, number>,
  isAdmin: boolean
): Product {
  const base = stripWholesalePrice(product as unknown as Record<string, unknown>) as unknown as Product;
  if (!isAdmin) return base;
  const cost = product.id ? costs[product.id] : costs[product.sku];
  if (typeof cost !== 'number' || !Number.isFinite(cost)) return base;
  return { ...base, wholesalePrice: cost };
}
