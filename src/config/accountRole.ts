import { isMasterAdminUser } from './app.ts';
import type { CatalogTier } from './pricing.ts';

/** Roles a signed-in user may store. `customer` is the legacy approved grosir account. */
export const STORED_ACCOUNT_ROLES = ['pending', 'rejected', 'grosir', 'end_user', 'customer'] as const;

export type StoredAccountRole = (typeof STORED_ACCOUNT_ROLES)[number];

/** Roles the master admin may assign. Legacy `customer` is not re-issued. */
export const ASSIGNABLE_ACCOUNT_ROLES = ['pending', 'rejected', 'grosir', 'end_user'] as const;

export type AssignableAccountRole = (typeof ASSIGNABLE_ACCOUNT_ROLES)[number];

export function isStoredAccountRole(role: unknown): role is StoredAccountRole {
  return typeof role === 'string' && (STORED_ACCOUNT_ROLES as readonly string[]).includes(role);
}

export function isApprovedAccountRole(role: unknown): role is 'grosir' | 'end_user' | 'customer' {
  return role === 'grosir' || role === 'end_user' || role === 'customer';
}

/**
 * Price tier for a verified identity.
 * The master admin always sees today's selling price, even when their profile is pending.
 * Legacy `customer` stays on grosir prices so existing accounts are not repriced.
 */
export function tierForAccount(input: {
  email?: string | null;
  emailVerified?: boolean;
  role?: string | null;
}): CatalogTier | null {
  if (isMasterAdminUser({ email: input.email, emailVerified: Boolean(input.emailVerified) })) {
    return 'grosir';
  }
  if (input.role === 'end_user') return 'end_user';
  if (input.role === 'grosir' || input.role === 'customer') return 'grosir';
  return null;
}

export function accountRoleLabel(role: string | null | undefined, isAdmin = false): string {
  if (isAdmin) return 'Master Admin';
  if (role === 'end_user') return 'Akun End User';
  if (role === 'grosir' || role === 'customer') return 'Akun Grosir';
  if (role === 'rejected') return 'Ditolak';
  if (role === 'pending') return 'Menunggu persetujuan';
  return 'Belum disetujui';
}
