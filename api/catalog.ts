/**
 * Vercel Node function for /api/catalog.
 * GET/HEAD return a private, tier-priced catalog from one shared snapshot.
 * POST drops that snapshot. Only the verified master admin may call it.
 */
import { handleCatalogRefresh, handleCatalogRequest } from '../src/server/catalogHandler.ts';

export function GET(request: Request): Promise<Response> {
  return handleCatalogRequest(request);
}

export function HEAD(request: Request): Promise<Response> {
  return handleCatalogRequest(request);
}

export function POST(request: Request): Promise<Response> {
  return handleCatalogRefresh(request);
}

export default {
  fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') return handleCatalogRefresh(request);
    return handleCatalogRequest(request);
  },
};
