/**
 * Optional privileged Firestore read for /api/catalog.
 * Set FIREBASE_SERVICE_ACCOUNT to the service-account JSON (server only).
 * Without it, product reads use the public API key and follow security rules.
 */
import { createSign } from 'node:crypto';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cached: { token: string; exp: number } | null = null;

export function serviceAccountConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim());
}

function loadAccount(): ServiceAccountKey {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !raw.trim()) {
    throw new Error('missing service account');
  }
  let parsed: ServiceAccountKey;
  try {
    parsed = JSON.parse(raw) as ServiceAccountKey;
  } catch {
    throw new Error('service account json');
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('service account fields');
  }
  return parsed;
}

function base64url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

export async function getServiceAccountAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const now = Date.now();
  if (cached && cached.exp > now + 60_000) return cached.token;

  const account = loadAccount();
  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
    })
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(account.private_key).toString('base64url');
  const tokenUri = account.token_uri || 'https://oauth2.googleapis.com/token';
  const response = await fetchImpl(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!response.ok) {
    throw new Error('service account token');
  }
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error('service account token');
  cached = { token: body.access_token, exp: now + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}
