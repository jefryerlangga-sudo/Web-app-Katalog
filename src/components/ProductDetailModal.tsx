import React, { useState } from 'react';
import {
  X,
  Scale,
  Check,
  Copy,
  Flame,
  Trophy,
  ShieldCheck,
  Smartphone,
  Wrench,
  Calculator,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Product } from '../types/product';
import { useCatalog } from '../context/CatalogContext';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
}) => {
  const {
    viewMode,
    addToCompare,
    removeFromCompare,
    isInCompare,
    compareList,
    setCurrentTab,
  } = useCatalog();

  const [orderQty, setOrderQty] = useState<number>(10);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  const inCompare = isInCompare(product.id || product.sku);
  const compareFull = compareList.length >= 3 && !inCompare;

  // Margin math
  const unitProfit = Math.max(0, product.suggestedRetailPrice - product.wholesalePrice);
  const marginPercent =
    product.suggestedRetailPrice > 0
      ? Math.round((unitProfit / product.suggestedRetailPrice) * 100)
      : 0;
  const totalShopProfit = unitProfit * orderQty;
  const totalWholesaleInvestment = product.wholesalePrice * orderQty;

  const handleCopyPitch = () => {
    const script = `NASKAH PITCH JUALAN: ${product.name} (${product.brand})
• SKU: ${product.sku}
• Cocok untuk: ${product.compatibility}
• 3 Keunggulan Utama:
  1. ${product.sellingPoint1}
  2. ${product.sellingPoint2}
  3. ${product.sellingPoint3}
• HET Eceran Resmi: Rp ${product.suggestedRetailPrice.toLocaleString('id-ID')}
${
  viewMode === 'sales'
    ? `• Modal Grosir Konter: Rp ${product.wholesalePrice.toLocaleString('id-ID')}
• Margin Keuntungan Toko: ${marginPercent}% (Untung Rp ${unitProfit.toLocaleString('id-ID')} per pcs)`
    : ''
}`;

    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const tierColors = {
    Good: 'bg-slate-700 text-slate-200 border-slate-600',
    Better: 'bg-blue-600 text-white border-blue-400',
    Best: 'bg-amber-500 text-slate-950 font-black border-amber-300',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Drag Pill & Close */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                tierColors[product.positioning]
              }`}
            >
              Tier {product.positioning}
            </span>
            <span className="font-mono text-xs text-slate-400 font-semibold">
              {product.sku}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-4 space-y-4 pb-24">
          {/* Main Visual & Key Badges */}
          <div className="relative w-full h-56 rounded-2xl bg-slate-950 overflow-hidden border border-slate-800">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />

            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-blue-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700/80">
                  {product.brand} • {product.category}
                </span>
                <h2 className="text-lg font-black text-white mt-1 leading-snug drop-shadow-md">
                  {product.name}
                </h2>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {product.isProductFocus && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-extrabold shadow">
                    <Flame className="w-3 h-3" /> Produk Fokus
                  </span>
                )}
                {product.isBestSeller && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold shadow">
                    <Trophy className="w-3 h-3" /> Paling Laris
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Value Box (Mode Aware) */}
          {viewMode === 'sales' ? (
            /* INTERNAL SALES MODE: Canvasser Wholesale + Margins */
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/60 border border-slate-700 space-y-3">
              <div className="flex items-baseline justify-between border-b border-slate-700/60 pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Modal Konter (Grosir)
                  </span>
                  <p className="text-xl font-extrabold text-white font-mono">
                    Rp {product.wholesalePrice.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    HET Eceran Resmi
                  </span>
                  <p className="text-base text-slate-300 font-mono">
                    Rp {product.suggestedRetailPrice.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block leading-tight">
                    Margin Kotor
                  </span>
                  <span className="text-base font-black text-emerald-300 font-mono leading-tight">
                    +{marginPercent}%
                  </span>
                </div>
              </div>

              {/* Interactive Shop Profit Calculator */}
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
                    <Calculator className="w-4 h-4 text-blue-400" />
                    <span>Simulasi Keuntungan Toko Konter</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[5, 10, 20, 50].map((qty) => (
                      <button
                        key={qty}
                        onClick={() => setOrderQty(qty)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${
                          orderQty === qty
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {qty} pcs
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-slate-800/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Total Modal Belanja:</span>
                    <span className="font-mono font-bold text-slate-200">
                      Rp {totalWholesaleInvestment.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg">
                    <span className="text-[10px] text-emerald-400 font-semibold block">
                      Potensi Laba Bersih Toko:
                    </span>
                    <span className="font-mono font-black text-emerald-300">
                      +Rp {totalShopProfit.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Customer Segment */}
              <div className="text-xs text-slate-300">
                <span className="text-slate-400 font-semibold">Target Profil Toko / Pembeli: </span>
                <span className="text-white">{product.targetCustomer}</span>
              </div>
            </div>
          ) : (
            /* CUSTOMER PRESENTATION MODE */
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
                  Harga Eceran Tertinggi (HET)
                </span>
                <p className="text-2xl font-black text-white font-mono mt-0.5">
                  Rp {product.suggestedRetailPrice.toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Harga resmi konsumen dengan garansi produk resmi terjamin
                </p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> 100% Original
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Ketersediaan: <strong className="text-white">{product.stockStatus}</strong>
                </span>
              </div>
            </div>
          )}

          {/* 3 Key Selling Points */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>3 Keunggulan Jualan Utama (Pitch Points)</span>
              </h4>

              <button
                onClick={handleCopyPitch}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Naskah</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {[
                { point: product.sellingPoint1, num: '1' },
                { point: product.sellingPoint2, num: '2' },
                { point: product.sellingPoint3, num: '3' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.num}
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {item.point}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Device & Vehicle Compatibility */}
          <div className="space-y-1.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Kompatibilitas Tipe HP & Perangkat</span>
            </h4>
            <p className="text-xs text-emerald-300 font-medium leading-relaxed bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/20">
              {product.compatibility}
            </p>
          </div>

          {/* Technical Specifications */}
          <div className="space-y-1.5 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Spesifikasi Teknis & Material</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {product.specification}
            </p>
          </div>

          {/* Cross-Sell Products */}
          {product.crossSellNotes && (
            <div className="space-y-1.5 bg-indigo-950/30 p-3 rounded-2xl border border-indigo-500/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Rekomendasi Paket Cross-Sell Tambahan</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {product.crossSellNotes}
              </p>
            </div>
          )}

          {/* Metadata info */}
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
            <span>Status Stok: {product.stockStatus}</span>
            <span>
              Update Terakhir:{' '}
              {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('id-ID') : 'Aktif'}
            </span>
          </div>
        </div>

        {/* Modal Sticky Bottom Action Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={() => {
              if (inCompare) {
                removeFromCompare(product.id || product.sku);
              } else {
                addToCompare(product);
              }
            }}
            disabled={compareFull}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
              inCompare
                ? 'bg-blue-600 text-white'
                : compareFull
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>
              {inCompare
                ? 'Sudah Masuk Perbandingan'
                : compareFull
                ? 'Perbandingan Penuh (Maks 3)'
                : '+ Tambah ke Perbandingan'}
            </span>
          </button>

          {compareList.length > 0 && (
            <button
              onClick={() => {
                onClose();
                setCurrentTab('compare');
              }}
              className="py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg active:scale-95 flex items-center gap-1.5"
            >
              <span>Bandingkan ({compareList.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
