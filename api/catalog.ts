/**
 * Vercel Node function for GET /api/catalog.
 * Guests load this cached JSON instead of listing Firestore themselves.
 */
import { handleCatalogRequest } from '../src/server/catalogHandler.ts';

export function GET(request: Request): Promise<Response> {
  return handleCatalogRequest(request);
}

export function HEAD(request: Request): Promise<Response> {
  return handleCatalogRequest(request);
}

export default {
  fetch(request: Request): Promise<Response> {
    return handleCatalogRequest(request);
  },
};
