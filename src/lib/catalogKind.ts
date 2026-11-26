import { Product } from '../types/product';

export const BATTERY_CATEGORY = 'Baterai';

export type CatalogMode = 'aksesoris' | 'baterai';

export const PHONE_BRANDS = [
  'iPhone',
  'Samsung',
  'Infinix',
  'Oppo',
  'Vivo',
  'Xiaomi/Redmi/Poco',
  'Realme',
  'Asus',
  'Itel',
  'Tecno',
  'Lainnya',
] as const;

export const BATTERY_MAKES = ['OG', 'HX', 'LF'] as const;

export function isBatteryProduct(product: Pick<Product, 'category'>): boolean {
  return product.category === BATTERY_CATEGORY;
}

export function catalogModeFromPath(path: string): CatalogMode {
  const clean = path.replace(/\/+$/, '') || '/';
  return clean === '/baterai' ? 'baterai' : 'aksesoris';
}
