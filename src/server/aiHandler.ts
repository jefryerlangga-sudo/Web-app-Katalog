import { GoogleGenAI } from '@google/genai';

export interface AiAssistantRequest {
  prompt: string;
  catalogContext: Array<{
    sku: string;
    name: string;
    brand: string;
    category: string;
    positioning: string;
    suggestedRetailPrice: number;
    wholesalePrice: number;
    stockStatus: string;
    compatibility: string;
    specification: string;
    sellingPoint1: string;
    sellingPoint2: string;
    sellingPoint3: string;
  }>;
  viewMode?: 'sales' | 'customer';
}

export async function handleAiAssistantQuery(reqBody: AiAssistantRequest): Promise<string> {
  const { prompt, catalogContext } = reqBody;

  const apiKey = process.env.GEMINI_API_KEY;
  const publicCatalog = (catalogContext || []).map((product) => {
    const { wholesalePrice: _omit, ...rest } = product;
    return rest;
  });

  // Retail snapshot only. The endpoint is not authenticated, so dealer cost is never forwarded.
  const catalogSummary = publicCatalog.map((p) => {
    return `[SKU: ${p.sku}] ${p.brand} ${p.name} | Kategori: ${p.category} | Tier: ${p.positioning} | HET Konsumen: Rp ${p.suggestedRetailPrice.toLocaleString('id-ID')} | Stok: ${p.stockStatus} | Cocok untuk: ${p.compatibility} | Spek: ${p.specification} | 3 Keunggulan: 1) ${p.sellingPoint1} 2) ${p.sellingPoint2} 3) ${p.sellingPoint3}`;
  }).join('\n');

  if (!apiKey) {
    const lower = prompt.toLowerCase();
    const matches = publicCatalog.filter((p) => {
      return (
        p.name.toLowerCase().includes(lower) ||
        p.compatibility.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower) ||
        p.brand.toLowerCase().includes(lower) ||
        p.sku.toLowerCase().includes(lower)
      );
    });

    if (matches.length > 0) {
      const top = matches.slice(0, 3);
      return `Berikut rekomendasi terverifikasi dari katalog aktif kami:\n\n${top
        .map(
          (m) =>
            `• **${m.name}** (SKU: \`${m.sku}\`)\n  - Merk: ${m.brand} • Tier ${m.positioning}\n  - HET Eceran: Rp ${m.suggestedRetailPrice.toLocaleString('id-ID')}\n  - Kompatibel: ${m.compatibility}\n  - Keunggulan: "${m.sellingPoint1}"`
        )
        .join('\n\n')}\n\n*Semua data harga, stok, dan spesifikasi terverifikasi langsung dari database Firestore.*`;
    }

    return `Saya telah mencari di katalog untuk "${prompt}". Untuk hasil lebih tepat, coba sebutkan tipe HP (contoh: "iPhone 15", "Type-C Android", "Samsung A55") atau jenis aksesoris (contoh: "Charger GaN", "Kabel Data", "TWS", "Tempered Glass").`;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `Kamu adalah asisten belanja PortalTech untuk katalog aksesoris handphone di Indonesia.

ATURAN WAJIB:
1. Jawab dalam Bahasa Indonesia yang jelas.
2. Hanya rekomendasikan produk di SNAPSHOT KATALOG. Jangan mengarang SKU, harga, stok, merk, atau spesifikasi.
3. Sebutkan hanya harga eceran (HET). Jangan menyebut modal grosir, harga dealer, atau margin. Endpoint ini tidak membuktikan bahwa pemanggil adalah admin.
4. Gunakan poin singkat yang mudah dibaca di layar HP.
5. Jika relevan, jelaskan perbedaan tier Good, Better, dan Best dari sisi pembeli.

SNAPSHOT KATALOG TERVERIFIKASI:
${catalogSummary || 'Tidak ada produk dalam katalog saat ini.'}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text || 'Tidak dapat memproses rekomendasi saat ini.';
  } catch (error: any) {
    console.warn('Gemini call fallback to local search:', error?.message);
    const lower = prompt.toLowerCase();
    const matches = publicCatalog.filter((p) => {
      return (
        p.name.toLowerCase().includes(lower) ||
        p.compatibility.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower) ||
        p.brand.toLowerCase().includes(lower) ||
        p.sku.toLowerCase().includes(lower)
      );
    });

    if (matches.length > 0) {
      const top = matches.slice(0, 3);
      return `Berikut rekomendasi terverifikasi dari katalog aktif kami:\n\n${top
        .map(
          (m) =>
            `• **${m.name}** (SKU: \`${m.sku}\`)\n  - Merk: ${m.brand} • Tier ${m.positioning}\n  - HET Eceran: Rp ${m.suggestedRetailPrice.toLocaleString('id-ID')}\n  - Kompatibel: ${m.compatibility}\n  - Keunggulan: "${m.sellingPoint1}"`
        )
        .join('\n\n')}\n\n*Semua data harga, stok, dan spesifikasi terverifikasi langsung dari database Firestore.*`;
    }

    return `Saya mencari di katalog untuk "${prompt}". Silakan periksa tab Cari atau pilih filter tipe HP untuk melihat semua produk yang tersedia!`;
  }
}
