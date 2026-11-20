/**
 * End-user markup over today's grosir selling price.
 * One value for the catalog API, promo prices, and Firestore order checks.
 * Firestore rules repeat the derived integers (see endUserPrice).
 */
export const END_USER_MARKUP = 0.3;

/** End-user prices round up to this many rupiah. */
export const END_USER_PRICE_STEP = 100;

export type CatalogTier = 'grosir' | 'end_user';

/**
 * Grosir pays the stored selling price.
 * End user pays that price + END_USER_MARKUP, rounded UP to the nearest Rp100.
 *
 * Integer math: ceil(base * 130 / 10000) * 100.
 * 130 is (1 + 0.30) * 100 and 10000 is 100 * END_USER_PRICE_STEP.
 * Exact hundreds stay put (Rp10.000 → Rp13.000). Rp10.001 → Rp13.100.
 */
export function endUserPrice(base: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const whole = Math.round(base);
  const numerator = Math.round((1 + END_USER_MARKUP) * 100);
  const steps = Math.ceil((whole * numerator) / (100 * END_USER_PRICE_STEP));
  return steps * END_USER_PRICE_STEP;
}

export function priceForTier(amount: number, tier: CatalogTier): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  if (tier === 'end_user') return endUserPrice(amount);
  return amount;
}

export function promoForTier<T extends { minPurchase: number; items: Array<{ promoPrice: number }> }>(
  promo: T,
  tier: CatalogTier
): T {
  if (tier !== 'end_user') return promo;
  return {
    ...promo,
    minPurchase: priceForTier(promo.minPurchase, tier),
    items: promo.items.map((item) => ({
      ...item,
      promoPrice: priceForTier(item.promoPrice, tier),
    })),
  };
}
