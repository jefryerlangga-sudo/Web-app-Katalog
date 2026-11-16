/**
 * PortalTech sales assistant. Runs only on the server.
 * XAI_API_KEY is read from the environment and is never returned to the client.
 */

export interface PublicCatalogItem {
  sku: string;
  name: string;
  brand: string;
  category: string;
  positioning: string;
  suggestedRetailPrice: number;
  stockStatus: string;
  compatibility: string;
  specification: string;
  sellingPoint1: string;
  sellingPoint2: string;
  sellingPoint3: string;
}

export interface AiRuntime {
  apiKey: string;
  model: string;
  baseUrl: string;
  fetchImpl: typeof fetch;
}

const DEFAULT_MODEL = 'grok-4.7';
const DEFAULT_BASE_URL = 'https://api.x.ai/v1/chat/completions';
const MAX_PROMPT = 2000;
const MAX_PRODUCTS = 40;

const STOP_WORDS = new Set([
  'yang',
  'untuk',
  'dari',
  'dengan',
  'atau',
  'dan',
  'saya',
  'mau',
  'apa',
  'bisa',
  'ada',
  'ini',
  'itu',
  'nya',
  'the',
  'and',
  'for',
  'rekomendasi',
  'tolong',
  'cari',
  'produk',
]);

export function runtimeFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): AiRuntime {
  return {
    apiKey: String(env.XAI_API_KEY || '').trim(),
    model: String(env.XAI_MODEL || '').trim() || DEFAULT_MODEL,
    baseUrl: String(env.XAI_API_BASE_URL || '').trim() || DEFAULT_BASE_URL,
    fetchImpl,
  };
}

function clip(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

/** Ignore dealer-cost fields. The route is not authenticated. */
export function toPublicCatalog(input: unknown): PublicCatalogItem[] {
  if (!Array.isArray(input)) return [];
  const items: PublicCatalogItem[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const price = Number(row.suggestedRetailPrice);
    const name = clip(row.name, 150);
    const sku = clip(row.sku, 64);
    if (!name || !sku || !Number.isFinite(price) || price < 0) continue;
    items.push({
      sku,
      name,
      brand: clip(row.brand, 80),
      category: clip(row.category, 80),
      positioning: clip(row.positioning, 20),
      suggestedRetailPrice: price,
      stockStatus: clip(row.stockStatus, 40),
      compatibility: clip(row.compatibility, 400),
      specification: clip(row.specification, 400),
      sellingPoint1: clip(row.sellingPoint1, 200),
      sellingPoint2: clip(row.sellingPoint2, 200),
      sellingPoint3: clip(row.sellingPoint3, 200),
    });
    if (items.length >= MAX_PRODUCTS) break;
  }
  return items;
}

export function keywordFallback(prompt: string, catalog: PublicCatalogItem[]): string {
  const lower = prompt.toLowerCase().trim();
  const tokens = lower
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  const matches = catalog.filter((product) => {
    const haystack = [
      product.name,
      product.brand,
      product.category,
      product.sku,
      product.compatibility,
      product.specification,
    ]
      .join(' ')
      .toLowerCase();
    if (lower.length >= 2 && haystack.includes(lower)) return true;
    return tokens.some((token) => haystack.includes(token));
  });

  if (matches.length > 0) {
    const top = matches.slice(0, 3);
    return `Berikut rekomendasi dari katalog yang sedang dimuat (harga eceran saja):\n\n${top
      .map(
        (item) =>
          `• ${item.name} (SKU: ${item.sku})\n  - Merk: ${item.brand} • Tier ${item.positioning}\n  - HET Eceran: Rp ${item.suggestedRetailPrice.toLocaleString('id-ID')}\n  - Kompatibel: ${item.compatibility}\n  - Keunggulan: "${item.sellingPoint1}"`
      )
      .join('\n\n')}\n\nHarga dealer tidak ditampilkan. Angka di atas adalah harga eceran katalog.`;
  }

  return `Saya mencari di katalog untuk "${prompt.slice(0, 160)}". Sebutkan tipe HP (contoh: "iPhone 15", "Samsung A55") atau jenis aksesoris (contoh: "charger", "kabel Type-C", "TWS", "tempered glass").`;
}

function catalogSummary(catalog: PublicCatalogItem[]): string {
  return catalog
    .map(
      (product) =>
        `[SKU: ${product.sku}] ${product.brand} ${product.name} | Kategori: ${product.category} | Tier: ${product.positioning} | HET Konsumen: Rp ${product.suggestedRetailPrice.toLocaleString('id-ID')} | Stok: ${product.stockStatus} | Cocok untuk: ${product.compatibility} | Spek: ${product.specification} | 3 Keunggulan: 1) ${product.sellingPoint1} 2) ${product.sellingPoint2} 3) ${product.sellingPoint3}`
    )
    .join('\n');
}

function messageText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null;
  const content = (choices[0] as { message?: { content?: unknown } }).message?.content;
  if (typeof content !== 'string') return null;
  const text = content.trim();
  return text || null;
}

export async function handleAiAssistantQuery(
  reqBody: unknown,
  runtime: AiRuntime = runtimeFromEnv()
): Promise<string> {
  const body = reqBody && typeof reqBody === 'object' ? (reqBody as Record<string, unknown>) : {};
  const prompt = clip(body.prompt, MAX_PROMPT);
  const catalog = toPublicCatalog(body.catalogContext);

  if (!prompt) {
    return 'Tulis pertanyaan tentang aksesoris HP, misalnya charger iPhone atau kabel Type-C.';
  }

  if (!runtime.apiKey) {
    return keywordFallback(prompt, catalog);
  }

  const systemInstruction = `Kamu adalah asisten belanja PortalTech untuk katalog aksesoris handphone di Indonesia.

ATURAN WAJIB:
1. Jawab dalam Bahasa Indonesia yang jelas.
2. Hanya rekomendasikan produk di SNAPSHOT KATALOG. Jangan mengarang SKU, harga, stok, merk, atau spesifikasi.
3. Sebutkan hanya harga eceran (HET). Jangan menyebut modal grosir, harga dealer, biaya, atau margin. Data itu tidak ada di snapshot dan endpoint ini tidak membuktikan bahwa pemanggil adalah admin.
4. Jika ditanya modal atau margin, katakan bahwa asisten hanya punya harga eceran, lalu bantu memilih dari HET, stok, dan kecocokan HP.
5. Gunakan poin singkat yang mudah dibaca di layar HP.
6. Jika relevan, jelaskan perbedaan tier Good, Better, dan Best dari sisi pembeli.

SNAPSHOT KATALOG TERVERIFIKASI:
${catalogSummary(catalog) || 'Tidak ada produk dalam katalog saat ini.'}`;

  try {
    const response = await runtime.fetchImpl(runtime.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${runtime.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: runtime.model,
        temperature: 0.2,
        stream: false,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.warn(`Grok request failed with status ${response.status}`);
      return keywordFallback(prompt, catalog);
    }

    const text = messageText(await response.json());
    return text || keywordFallback(prompt, catalog);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'request failed';
    console.warn(`Grok request fallback to catalog search: ${message}`);
    return keywordFallback(prompt, catalog);
  }
}
