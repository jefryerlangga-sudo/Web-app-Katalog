/**
 * Vercel Node function for POST /api/ai-assistant.
 * Answers, the 512kb ceiling, and the server-only xAI key match the Express route.
 * XAI_API_KEY is read from the function environment by runtimeFromEnv.
 */
import {
  handleAiAssistantQuery,
  MAX_AI_BODY_BYTES,
  runtimeFromEnv,
  type AiRuntime,
} from '../src/server/aiHandler.ts';

type AssistantQuery = (reqBody: unknown, runtime: AiRuntime) => Promise<string>;

function jsonResponse(body: { text: string } | { error: string }, status = 200): Response {
  return Response.json(body, { status });
}

function isJsonContentType(header: string): boolean {
  const media = header.split(';')[0]?.trim().toLowerCase() ?? '';
  return media === 'application/json' || media.endsWith('+json');
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Same rules as Express `express.json`: an empty JSON body is `{}`,
 * and strict mode only accepts an object or an array.
 */
function parseJsonPayload(raw: string): { ok: true; value: unknown } | { ok: false } {
  if (raw.length === 0) return { ok: true, value: {} };
  const first = /^\s*([^\s])/u.exec(raw)?.[1] ?? '';
  if (first !== '{' && first !== '[') return { ok: false };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

export async function handleAiAssistantRequest(
  request: Request,
  runtime: AiRuntime = runtimeFromEnv(),
  query: AssistantQuery = handleAiAssistantQuery
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Metode tidak diizinkan' }, 405);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return jsonResponse({ error: 'JSON tidak valid' }, 400);
  }

  if (utf8ByteLength(raw) > MAX_AI_BODY_BYTES) {
    return jsonResponse({ error: 'Permintaan terlalu besar' }, 413);
  }

  let payload: unknown = {};
  if (isJsonContentType(request.headers.get('content-type') ?? '')) {
    const parsed = parseJsonPayload(raw);
    if (!parsed.ok) return jsonResponse({ error: 'JSON tidak valid' }, 400);
    payload = parsed.value;
  }

  try {
    const text = await query(payload, runtime);
    return jsonResponse({ text });
  } catch {
    console.error('AI assistant error');
    return jsonResponse({ error: 'Asisten sedang tidak tersedia' }, 500);
  }
}

export function POST(request: Request): Promise<Response> {
  return handleAiAssistantRequest(request);
}

export default {
  fetch(request: Request): Promise<Response> {
    return handleAiAssistantRequest(request);
  },
};
