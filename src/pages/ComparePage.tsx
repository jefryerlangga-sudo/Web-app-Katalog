import React from 'react';
import {
  Scale,
  X,
  Plus,
  Check,
  Smartphone,
  Wrench,
  TrendingUp,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';

export const ComparePage: React.FC = () => {
  const {
    compareList,
    removeFromCompare,
    clearCompare,
    viewMode,
    setCurrentTab,
    setSelectedProduct,
  } = useCatalog();

  const tierColors = {
    Good: 'bg-slate-700 text-slate-200 border-slate-600',
    Better: 'bg-blue-600 text-white border-blue-400',
    Best: 'bg-amber-500 text-slate-950 font-black border-amber-300',
  };

  if (compareList.length === 0) {
    return (
      <div className="py-12 px-4 text-center space-y-4 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400 shadow-xl">
          <Scale className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Belum Ada Produk untuk Dibandingkan</h2>
          <p className="text-xs text-slate-400 mt-1">
            Pilih hingga 3 produk dari katalog untuk membandingkan spesifikasi, kecocokan HP, dan selisih keuntungan konter.
          </p>
        </div>
        <button
          onClick={() => setCurrentTab('search')}
          className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          Buka Katalog untuk Pilih Produk
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-400" />
            <span>Perbandingan Produk</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Membandingkan {compareList.length} dari maksimal 3 produk
          </p>
        </div>

        <div className="flex items-center gap-2">
          {compareList.length < 3 && (
            <button
              onClick={() => setCurrentTab('search')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold flex items-center gap-1 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          )}

          <button
            onClick={clearCompare}
            className="text-xs font-medium text-slate-400 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-slate-800"
          >
            Hapus Semua
          </button>
        </div>
      </div>

      {/* Side-by-Side Mobile Horizontal Scroll Grid */}
      <div className="overflow-x-auto pb-4 no-scrollbar">
        <div
          className="grid gap-3 min-w-[580px]"
          style={{
            gridTemplateColumns: `repeat(${compareList.length}, minmax(280px, 1fr))`,
          }}
        >
          {compareList.map((product) => {
            const profit = Math.max(0, product.suggestedRetailPrice - product.wholesalePrice);
            const marginPercent =
              product.suggestedRetailPrice > 0
                ? Math.round((profit / product.suggestedRetailPrice) * 100)
                : 0;

            return (
              <div
                key={product.id || product.sku}
                className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-3.5 shadow-xl flex flex-col space-y-3 relative text-white"
              >
                {/* Remove Card Button */}
                <button
                  onClick={() => removeFromCompare(product.id || product.sku)}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center z-10 transition-colors"
                  title="Hapus dari perbandingan"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Media and Identity */}
                <div className="space-y-2">
                  <div className="relative w-full h-36 rounded-2xl bg-slate-950 overflow-hidden border border-slate-700/60">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400';
                      }}
                    />
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                        tierColors[product.positioning]
                      }`}
                    >
                      Tier {product.positioning}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      <span>{product.sku}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-bold">{product.brand}</span>
                    </div>
                    <h3 className="font-bold text-sm text-white leading-tight mt-0.5 line-clamp-2">
                      {product.name}
                    </h3>
                  </div>
                </div>

                {/* Pricing Block (Mode Aware) */}
                <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-1.5">
                  {viewMode === 'sales' ? (
                    <>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-400 font-medium">Modal Konter:</span>
                        <span className="font-mono font-bold text-white">
                          Rp {product.wholesalePrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-400 font-medium">HET Eceran:</span>
                        <span className="font-mono text-slate-300">
                          Rp {product.suggestedRetailPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold">Laba Konter:</span>
                        <span className="font-mono font-black text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                          +{marginPercent}% (Rp {profit.toLocaleString('id-ID')})
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Harga Resmi HET:</span>
                      <span className="text-base font-black text-blue-400 font-mono">
                        Rp {product.suggestedRetailPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Compatibility */}
                <div className="space-y-1 text-xs">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kompatibilitas</span>
                  </span>
                  <p className="text-[11px] text-slate-200 bg-slate-900/50 p-2 rounded-xl border border-slate-800 leading-snug">
                    {product.compatibility}
                  </p>
                </div>

                {/* Specifications */}
                <div className="space-y-1 text-xs">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Spesifikasi</span>
                  </span>
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-3">
                    {product.specification}
                  </p>
                </div>

                {/* Key Selling Points */}
                <div className="space-y-1.5 text-xs flex-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    <span>Keunggulan Utama</span>
                  </span>
                  <div className="space-y-1">
                    {[product.sellingPoint1, product.sellingPoint2, product.sellingPoint3].map(
                      (point, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-1.5 text-[11px] text-slate-300 leading-tight"
                        >
                          <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Detail inspection button */}
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="w-full py-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-600/80 active:scale-95"
                >
                  Lihat Detail Spek Lengkap
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
