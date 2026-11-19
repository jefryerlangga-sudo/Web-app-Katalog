/**
 * Campaign data for GET /api/catalog.
 * Vercel compiles this function to separate Node ESM files. Every relative
 * import needs an explicit extension (.ts is rewritten to .js, .json stays).
 * Do not import client modules from here: an extensionless specifier such as
 * '../config/app' crashes the function with ERR_MODULE_NOT_FOUND.
 */
import campaignFile from '../data/promo-cuci-gudang.json' with { type: 'json' };

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
