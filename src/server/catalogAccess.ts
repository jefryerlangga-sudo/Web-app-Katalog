/**
 * Authorize GET /api/catalog. Verifies the Firebase ID token with Identity Toolkit,
 * then reads users/{uid}.role with that token. No firebase-admin import: Vercel
 * compiles this file as its own Node ESM module, so every relative import has an
 * extension.
 */
import appletConfig from '../../firebase-applet-config.json' with { type: 'json' };
import { tierForAccount } from '../config/accountRole.ts';
import type { CatalogTier } from '../config/pricing.ts';

export interface CatalogTokenSource {
  projectId: string;
  firestoreDatabaseId: string;
  apiKey: string;
}

export interface CatalogAccess {
  tier: CatalogTier;
}

export type CatalogAuthorization =
  | { ok: true; access: CatalogAccess }
  | { ok: false; status: 401 | 403 | 502; error: string };

export class AccountReadError extends Error {
  constructor(readonly status: number) {
    super('role');
  }
}

interface Identity {
  uid: string;
  email: string;
  emailVerified: boolean;
}

const BEARER = /^Bearer\s+(\S+)$/i;

function sourceOf(source?: CatalogTokenSource): CatalogTokenSource {
  return source ?? appletConfig;
}

export async function lookupIdentity(
  idToken: string,
  fetchImpl: typeof fetch,
  source?: CatalogTokenSource
): Promise<Identity> {
  const config = sourceOf(source);
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(config.apiKey)}`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    throw new Error('token');
  }
  const body = (await response.json()) as {
    users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
  };
  const user = body.users?.[0];
  const uid = String(user?.localId || '').trim();
  if (!uid) throw new Error('token');
  return {
    uid,
    email: String(user?.email || ''),
    emailVerified: user?.emailVerified === true,
  };
}

export async function readAccountRole(
  uid: string,
  idToken: string,
  fetchImpl: typeof fetch,
  source?: CatalogTokenSource
): Promise<string | null> {
  const config = sourceOf(source);
  const projectId = encodeURIComponent(config.projectId);
  const databaseId = encodeURIComponent(config.firestoreDatabaseId);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(uid)}`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new AccountReadError(response.status);
  const body = (await response.json()) as { fields?: { role?: { stringValue?: string } } };
  const role = body.fields?.role?.stringValue;
  return typeof role === 'string' ? role : null;
}

export async function authorizeCatalogRequest(
  request: Request,
  options: { fetchImpl?: typeof fetch; source?: CatalogTokenSource } = {}
): Promise<CatalogAuthorization> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(BEARER);
  if (!match) {
    return { ok: false, status: 401, error: 'Masuk diperlukan' };
  }
  const idToken = match[1];
  const fetchImpl = options.fetchImpl ?? fetch;

  let identity: Identity;
  try {
    identity = await lookupIdentity(idToken, fetchImpl, options.source);
  } catch {
    return { ok: false, status: 401, error: 'Sesi tidak valid' };
  }

  let role: string | null;
  try {
    role = await readAccountRole(identity.uid, idToken, fetchImpl, options.source);
  } catch (error) {
    if (error instanceof AccountReadError && (error.status === 401 || error.status === 403)) {
      return { ok: false, status: 403, error: 'Akun belum disetujui' };
    }
    return { ok: false, status: 502, error: 'Katalog tidak dapat dimuat' };
  }

  const tier = tierForAccount({
    email: identity.email,
    emailVerified: identity.emailVerified,
    role,
  });
  if (!tier) {
    return {
      ok: false,
      status: 403,
      error: role === 'rejected' ? 'Akun belum disetujui' : 'Akun menunggu persetujuan',
    };
  }
  return { ok: true, access: { tier } };
}
