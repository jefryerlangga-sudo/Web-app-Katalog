/**
 * Partshop.Katalog catalog identity.
 * MASTER_ADMIN_EMAILS must stay in sync with isVerifiedMasterAdmin() in firestore.rules.
 * UI checks are not the security boundary; Firestore rules are.
 */
export const APP_NAME = 'Partshop.Katalog';
export const APP_TAGLINE = 'Katalog & portal belanja aksesoris HP';

/** Owner master-admin identity already present in firestore.rules. Do not add accounts here. */
export const MASTER_ADMIN_EMAILS: readonly string[] = ['jefryerlangga@gmail.com'];

export const ACCESSORY_CATEGORIES = [
  'Charger & Adapter',
  'Kabel Data & Charging',
  'Audio & TWS Earbuds',
  'Powerbank & Baterai',
  'Tempered Glass & Pelindung',
  'Holder & Mount HP',
  'Casing & Aksesoris Proteksi',
  'Memory & Flashdisk',
  'Lainnya',
  'Komputer & Gaming',
  'Kipas/Fan',
  'CCTV & Smart Home',
  'Smartwatch & Wearable',
  'Konverter & OTG',
  'Modem & Jaringan',
] as const;

/** Shown after an admin save. Catalog responses are private and not shared on the CDN. */
export const CUSTOMER_CATALOG_DELAY_NOTE = 'Perubahan harga tampil saat pelanggan memuat ulang katalog';

/**
 * Legacy spare-part categories. Storefront hides them.
 * Documents in these categories are not deleted by the app.
 */
export const HIDDEN_STOREFRONT_CATEGORIES = [
  'Braking System',
  'Drivetrain',
  'Engine & Electrical',
] as const;

export const MAX_ORDER_LINES = 10;
export const MAX_QTY_PER_LINE = 99;

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return MASTER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** Verified master admin only. Guests, customers, and unverified tokens are not admins. */
export function isMasterAdminUser(
  user: { email?: string | null; emailVerified?: boolean } | null | undefined
): boolean {
  if (!user?.emailVerified) return false;
  return isMasterAdminEmail(user.email);
}

export function isStorefrontProduct(category: string | null | undefined): boolean {
  if (!category) return false;
  return !HIDDEN_STOREFRONT_CATEGORIES.includes(
    category as (typeof HIDDEN_STOREFRONT_CATEGORIES)[number]
  );
}

/**
 * Built-in categories first, then any other storefront category already on a product.
 * Hidden spare-part categories stay off the list.
 */
export function listStorefrontCategories(categories: Iterable<string | null | undefined>): string[] {
  const known = new Map(ACCESSORY_CATEGORIES.map((name) => [name.toLowerCase(), name]));
  const hidden = new Set(HIDDEN_STOREFRONT_CATEGORIES.map((name) => name.toLowerCase()));
  const extras: string[] = [];
  const seen = new Set<string>();

  for (const raw of categories) {
    const name = String(raw ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (known.has(key) || hidden.has(key) || seen.has(key)) continue;
    seen.add(key);
    extras.push(name);
  }

  extras.sort((left, right) => left.localeCompare(right, 'id'));
  return [...ACCESSORY_CATEGORIES, ...extras];
}

/**
 * Public storefront number baked into the client at build time. Not a secret.
 * Empty means checkout still saves the order and does not open WhatsApp.
 * This app never sends WhatsApp messages by itself.
 */
export function configuredWhatsAppNumber(): string {
  const raw = import.meta.env?.VITE_WHATSAPP_NUMBER;
  return String(raw || '').replace(/\D/g, '');
}
