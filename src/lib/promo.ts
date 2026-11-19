/**
 * Storefront join of a campaign payload onto catalog products.
 * This file must not import the promo JSON. Prices arrive from GET /api/catalog
 * after login. The Vercel function loads the file from src/server/promoCampaign.ts.
 */
import { isStorefrontProduct } from '../config/app';
import { Product } from '../types/product';

export interface StorePromoItem {
  sku: string;
  brand: string;
  promoPrice: number;
  stock: number;
}

export interface StorePromo {
  id: string;
  title: string;
  active: boolean;
  minPurchase: number;
  brands: string[];
  terms: string[];
  items: StorePromoItem[];
}

export interface PromoListing {
  product: Product;
  sku: string;
  brand: string;
  promoPrice: number;
  promoStock: number;
  showRetailStrike: boolean;
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

export function isPromoSku(sku: string, campaign: StorePromo | null | undefined): boolean {
  if (!campaign?.active) return false;
  const wanted = String(sku ?? '').trim();
  return campaign.items.some((item) => item.sku === wanted);
}

/**
 * Active storefront products whose SKU is in the campaign, in campaign order.
 * Missing and inactive SKUs are omitted. Promo fields on the product document are ignored.
 */
export function listPromoProducts(
  products: Product[],
  campaign: StorePromo | null | undefined
): PromoListing[] {
  if (!campaign?.active) return [];
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

export function promoOfferForProduct(
  product: Product,
  campaign: StorePromo | null | undefined
): PromoListing | null {
  const match = listPromoProducts([product], campaign);
  return match[0] ?? null;
}
