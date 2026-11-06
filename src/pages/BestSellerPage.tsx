import React from 'react';
import { Trophy, CheckCircle2 } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';

export const BestSellerPage: React.FC = () => {
  const { activeProducts, viewMode } = useCatalog();

  const bestSellers = activeProducts.filter((p) => p.isBestSeller);

  return (
    <div className="space-y-4 pb-20">
      {/* Best Seller Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl text-white space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Perputaran Cepat (Fast Moving)
              </span>
            </div>
            <h1 className="text-lg font-black text-white mt-0.5">
              Produk Paling Laris di Konter
            </h1>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Item paling laris yang paling sering habis di etalase toko konter. Permintaan tinggi menjamin modal berputar kencang tanpa risiko stok mati.
        </p>

        {viewMode === 'sales' ? (
          <div className="bg-amber-950/40 p-2.5 rounded-2xl border border-amber-500/30 text-xs text-amber-200">
            💡 <strong>Tips Closing Canvasser:</strong> "Bos, {bestSellers.length} barang ini perputarannya paling kencang di rute kita. Kalau etalase konter kehabisan di hari Sabtu-Minggu, sayang banget pembeli lari ke konter sebelah!"
          </div>
        ) : (
          <div className="bg-blue-950/40 p-2.5 rounded-2xl border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Pilihan favorit konsumen dengan ulasan terbaik dan tingkat kepuasan tinggi.</span>
          </div>
        )}
      </div>

      {/* Best Seller List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-400">
            Daftar Produk Terlaris
          </span>
          <span className="font-mono text-white font-semibold">
            {bestSellers.length} item
          </span>
        </div>

        {bestSellers.length > 0 ? (
          <div className="space-y-3">
            {bestSellers.map((product) => (
              <ProductCard key={product.id || product.sku} product={product} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-800/40 rounded-3xl border border-slate-700/60 my-6">
            <Trophy className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Belum Ada Item Terlaris</p>
          </div>
        )}
      </div>
    </div>
  );
};
