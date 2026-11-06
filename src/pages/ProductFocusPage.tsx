import React from 'react';
import { Flame, Target } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';

export const ProductFocusPage: React.FC = () => {
  const { activeProducts, viewMode } = useCatalog();

  const focusProducts = activeProducts.filter((p) => p.isProductFocus);

  return (
    <div className="space-y-4 pb-20">
      {/* Campaign Drive Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-950 via-slate-900 to-slate-900 border border-rose-500/40 shadow-xl text-white space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 flex-shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Program Dorongan Bulanan
              </span>
            </div>
            <h1 className="text-lg font-black text-white mt-0.5">
              Produk Fokus Penjualan
            </h1>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Item prioritas tertinggi yang didukung promosi distributor. Canvasser dan Motoris wajib menawarkan produk ini terlebih dahulu pada setiap kunjungan konter atau toko retail.
        </p>

        {viewMode === 'sales' ? (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-500/30 text-xs">
            <div className="bg-rose-900/30 p-2.5 rounded-2xl border border-rose-500/20">
              <span className="text-[10px] text-rose-300 block font-semibold">Insentif Toko:</span>
              <span className="font-bold text-white leading-tight block mt-0.5">
                Promo Beli 10 Gratis 1 pcs
              </span>
            </div>
            <div className="bg-rose-900/30 p-2.5 rounded-2xl border border-rose-500/20">
              <span className="text-[10px] text-rose-300 block font-semibold">Bonus Canvasser:</span>
              <span className="font-bold text-white leading-tight block mt-0.5">
                Poin Komisi 2x Lipat
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-500/30 text-xs text-emerald-300">
            ✅ <strong>Pilihan Rekomendasi:</strong> Aksesoris handphone teruji dengan garansi resmi dan performa pengisian daya terbaik.
          </div>
        )}
      </div>

      {/* Focus Products List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-400">
            Daftar SKU Fokus Aktif
          </span>
          <span className="font-mono text-white font-semibold">
            {focusProducts.length} item
          </span>
        </div>

        {focusProducts.length > 0 ? (
          <div className="space-y-3">
            {focusProducts.map((product) => (
              <ProductCard key={product.id || product.sku} product={product} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-800/40 rounded-3xl border border-slate-700/60 my-6">
            <Target className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Belum Ada Item Fokus</p>
            <p className="text-xs text-slate-400 mt-1">
              Atur status produk fokus melalui panel Admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
