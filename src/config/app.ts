/**
 * PortalTech catalog identity.
 * MASTER_ADMIN_EMAILS must stay in sync with isVerifiedMasterAdmin() in firestore.rules.
 * UI checks are not the security boundary; Firestore rules are.
 */
export const APP_NAME = 'PortalTech';
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
] as const;

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
 * Public storefront number baked into the client at build time. Not a secret.
 * Empty means checkout still saves the order and does not open WhatsApp.
 * This app never sends WhatsApp messages by itself.
 */
export function configuredWhatsAppNumber(): string {
  const raw = import.meta.env?.VITE_WHATSAPP_NUMBER;
  return String(raw || '').replace(/\D/g, '');
}
