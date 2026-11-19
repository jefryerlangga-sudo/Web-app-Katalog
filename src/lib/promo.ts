/**
 * Promo membership lives in this repo, not on products/{sku}.
 * Admin Excel import overwrites those documents completely, and firestore.rules
 * are not published by git, so the storefront joins this file to the public catalog.
 */
import { isStorefrontProduct } from '../config/app';
import campaignFile from '../data/promo-cuci-gudang.json' with { type: 'json' };
import { Product } from '../types/product';

export interface PromoCampaignItem {
  sku: string;
  brand: string;
  promoPrice: number;
  stock: number;
}

export interface PromoCampaign {
  id: string;
  title: string;
  active: boolean;
  minPurchase: number;
  brands: string[];
  terms: string[];
  items: PromoCampaignItem[];
}

export interface PromoListing {
  product: Product;
  sku: string;
  brand: string;
  promoPrice: number;
  promoStock: number;
  showRetailStrike: boolean;
}

export interface PublicPromoPayload {
  id: string;
  title: string;
  active: boolean;
  minPurchase: number;
  brands: string[];
  terms: string[];
  items: PromoCampaignItem[];
}

const ITEM_KEYS = ['sku', 'brand', 'promoPrice', 'stock'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parsePromoCampaign(input: unknown): PromoCampaign {
  if (!isRecord(input)) {
    throw new Error('Data promo tidak valid');
  }
  const title = String(input.title ?? '').trim();
  const id = String(input.id ?? '').trim();
  if (!id || !title) {
    throw new Error('Judul promo wajib diisi');
  }
  if (!Array.isArray(input.terms) || input.terms.length === 0) {
    throw new Error('Syarat promo wajib diisi');
  }
  const terms = input.terms.map((term) => String(term ?? '').trim());
  if (terms.some((term) => term.length === 0)) {
    throw new Error('Syarat promo kosong');
  }
  if (!Array.isArray(input.brands) || input.brands.length === 0) {
    throw new Error('Merek promo wajib diisi');
  }
  const brands = input.brands.map((brand) => String(brand ?? '').trim());
  const brandSet = new Set(brands);
  if (brandSet.size !== brands.length || brands.some((brand) => brand.length === 0)) {
    throw new Error('Merek promo tidak valid');
  }
  const minPurchase = Number(input.minPurchase);
  if (!Number.isFinite(minPurchase) || minPurchase < 0) {
    throw new Error('Minimal belanja promo tidak valid');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('Daftar SKU promo kosong');
  }

  const seen = new Set<string>();
  const items: PromoCampaignItem[] = input.items.map((raw) => {
    if (!isRecord(raw)) {
      throw new Error('Item promo tidak valid');
    }
    for (const key of Object.keys(raw)) {
      if (!ITEM_KEYS.includes(key as (typeof ITEM_KEYS)[number])) {
        throw new Error(`Field promo tidak diizinkan: ${key}`);
      }
    }
    const sku = String(raw.sku ?? '').trim();
    const brand = String(raw.brand ?? '').trim();
    const promoPrice = Number(raw.promoPrice);
    const stock = Number(raw.stock);
    if (!sku || sku.length > 64 || seen.has(sku)) {
      throw new Error(`SKU promo tidak valid: ${sku}`);
    }
    if (!brandSet.has(brand)) {
      throw new Error(`Merek promo tidak dikenal: ${brand}`);
    }
    if (!Number.isFinite(promoPrice) || promoPrice < 0) {
      throw new Error(`Harga promo tidak valid: ${sku}`);
    }
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error(`Stok promo tidak valid: ${sku}`);
    }
    seen.add(sku);
    return { sku, brand, promoPrice, stock };
  });

  return {
    id,
    title,
    active: input.active !== false,
    minPurchase,
    brands,
    terms,
    items,
  };
}

export const promoCampaign: PromoCampaign = parsePromoCampaign(campaignFile);

const promoBySku = new Map(promoCampaign.items.map((item) => [item.sku, item]));

export function isPromoSku(sku: string): boolean {
  return promoCampaign.active && promoBySku.has(sku);
}

/** Strikethrough the catalog HET only when the promo price is actually lower. */
export function showRetailStrike(promoPrice: number, suggestedRetailPrice: number): boolean {
  return (
    Number.isFinite(promoPrice) &&
    Number.isFinite(suggestedRetailPrice) &&
    promoPrice < suggestedRetailPrice
  );
}

export function promoStockLabel(stock: number): string {
  const qty = Math.max(0, Math.floor(Number(stock) || 0));
  return qty > 0 ? `Sisa ${qty}` : 'Stok promo habis';
}

/**
 * Active storefront products whose SKU is in the campaign, in campaign order.
 * Missing and inactive SKUs are omitted. Promo fields on the product document are ignored.
 */
export function listPromoProducts(
  products: Product[],
  campaign: PromoCampaign = promoCampaign
): PromoListing[] {
  if (!campaign.active) return [];
  const bySku = new Map<string, Product>();
  for (const product of products) {
    const sku = String(product?.sku ?? '').trim();
    if (!sku || product.isActive === false || !isStorefrontProduct(product.category)) continue;
    if (!bySku.has(sku)) bySku.set(sku, product);
  }

  const listings: PromoListing[] = [];
  const seen = new Set<string>();
  for (const item of campaign.items) {
    if (seen.has(item.sku)) continue;
    seen.add(item.sku);
    const product = bySku.get(item.sku);
    if (!product) continue;
    listings.push({
      product,
      sku: item.sku,
      brand: item.brand,
      promoPrice: item.promoPrice,
      promoStock: item.stock,
      showRetailStrike: showRetailStrike(item.promoPrice, product.suggestedRetailPrice),
    });
  }
  return listings;
}

export function promoOfferForProduct(product: Product): PromoListing | null {
  const match = listPromoProducts([product]);
  return match[0] ?? null;
}

/** Public campaign body attached to GET /api/catalog. No dealer-cost fields. */
export function publicPromoPayload(campaign: PromoCampaign = promoCampaign): PublicPromoPayload {
  return {
    id: campaign.id,
    title: campaign.title,
    active: campaign.active,
    minPurchase: campaign.minPurchase,
    brands: [...campaign.brands],
    terms: [...campaign.terms],
    items: campaign.items.map((item) => ({
      sku: item.sku,
      brand: item.brand,
      promoPrice: item.promoPrice,
      stock: item.stock,
    })),
  };
}
