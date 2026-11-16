/** Neutral stand-in when a product has no photo or the photo URL fails. */
export const PLACEHOLDER_PRODUCT_IMAGE = '/placeholder-product.svg';

export function resolveProductImage(url: string | null | undefined, failed = false): string {
  const trimmed = String(url ?? '').trim();
  if (!trimmed || failed) return PLACEHOLDER_PRODUCT_IMAGE;
  return trimmed;
}
