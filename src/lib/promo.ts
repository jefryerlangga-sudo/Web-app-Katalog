/**
 * Storefront join of the shipped campaign onto catalog products.
 * GET /api/catalog must not import this file. It imports ../config/app without
 * a specifier extension, which Node rejects in the Vercel function output.
 */
import { isStorefrontProduct } from '../config/app';
import { promoCampaign, type PromoCampaign } from '../server/promoCampaign.ts';
import { Product } from '../types/product';

export {
  parsePromoCampaign,
  promoCampaign,
  publicPromoPayload,
  type PromoCampaign,
  type PromoCampaignItem,
  type PublicPromoPayload,
} from '../server/promoCampaign.ts';

export interface PromoListing {
  product: Product;
  sku: string;
  brand: string;
  promoPrice: number;
  promoStock: number;
  showRetailStrike: boolean;
}

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
