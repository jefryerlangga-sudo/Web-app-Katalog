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
  const { prompt, catalogContext, viewMode = 'sales' } = reqBody;

  const apiKey = process.env.GEMINI_API_KEY;

  // Format catalog strictly to avoid hallucinations
  const catalogSummary = (catalogContext || []).map((p) => {
    return `[SKU: ${p.sku}] ${p.brand} ${p.name} | Kategori: ${p.category} | Tier: ${p.positioning} | HET Konsumen: Rp ${p.suggestedRetailPrice.toLocaleString('id-ID')} | Modal Grosir Konter: Rp ${p.wholesalePrice.toLocaleString('id-ID')} | Stok: ${p.stockStatus} | Cocok untuk: ${p.compatibility} | Spek: ${p.specification} | 3 Keunggulan: 1) ${p.sellingPoint1} 2) ${p.sellingPoint2} 3) ${p.sellingPoint3}`;
  }).join('\n');

  if (!apiKey) {
    const lower = prompt.toLowerCase();
    const matches = (catalogContext || []).filter((p) => {
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
            `• **${m.name}** (SKU: \`${m.sku}\`)\n  - Merk: ${m.brand} • Tier ${m.positioning}\n  - HET Eceran: Rp ${m.suggestedRetailPrice.toLocaleString('id-ID')} ${viewMode === 'sales' ? `(Modal Konter: Rp ${m.wholesalePrice.toLocaleString('id-ID')})` : ''}\n  - Kompatibel: ${m.compatibility}\n  - Keunggulan: "${m.sellingPoint1}"`
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

  const systemInstruction = `Kamu adalah Asisten AI Penjualan Lapangan resmi untuk "Partshop Sales Catalog", digunakan oleh field Canvasser dan Motoris yang berkunjung ke konter handphone dan toko retail di Indonesia.

ATURAN WAJIB (STRICT MANDATES):
1. BAHASA INDONESIA: Wajib menjawab dalam Bahasa Indonesia yang profesional, ramah, dan taktis untuk penjualan lapangan.
2. ZERO-HALLUCINATION: Kamu HANYA BOLEH merekomendasikan produk yang tercantum di SNAPSHOT KATALOG di bawah. DILARANG KERAS mengarang SKU, harga, stok, merk, atau spesifikasi yang tidak ada di katalog.
3. MODE TAMPILAN: Pengguna saat ini dalam "${viewMode.toUpperCase()} MODE".
   - Jika dalam "SALES" mode: Sebutkan modal grosir konter, HET, persentase keuntungan konter (laba), dan berikan naskah/tips closing taktis untuk meyakinkan pemilik konter.
   - Jika dalam "CUSTOMER" mode: HANYA sebutkan informasi aman pelanggan (HET resmi, garansi, keunggulan kualitas, kecocokan tipe HP). JANGAN PERNAH membocorkan modal grosir atau margin rahasia konter!
4. FORMAT RINGKAS & MOBILE-FRIENDLY: Gunakan poin-poin tebal (bullet points) agar sangat mudah dibaca oleh sales di layar HP saat berdiri di depan etalase konter yang ramai.
5. PENJELASAN GOOD/BETTER/BEST: Jika relevan, jelaskan mengapa menaikkan pilihan ke tier 'Better' atau 'Best' menguntungkan bagi konsumen dan toko.

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
    const matches = (catalogContext || []).filter((p) => {
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
            `• **${m.name}** (SKU: \`${m.sku}\`)\n  - Merk: ${m.brand} • Tier ${m.positioning}\n  - HET Eceran: Rp ${m.suggestedRetailPrice.toLocaleString('id-ID')} ${viewMode === 'sales' ? `(Modal Konter: Rp ${m.wholesalePrice.toLocaleString('id-ID')})` : ''}\n  - Kompatibel: ${m.compatibility}\n  - Keunggulan: "${m.sellingPoint1}"`
        )
        .join('\n\n')}\n\n*Semua data harga, stok, dan spesifikasi terverifikasi langsung dari database Firestore.*`;
    }

    return `Saya mencari di katalog untuk "${prompt}". Silakan periksa tab Cari atau pilih filter tipe HP untuk melihat semua produk yang tersedia!`;
  }
}
