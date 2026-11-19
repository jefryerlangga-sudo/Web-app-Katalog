import React, { useMemo, useState } from 'react';
import { Tag } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';
import { LoadMoreList } from '../components/LoadMoreList';
import { rupiah } from '../lib/money';
import { listPromoProducts, promoCampaign } from '../lib/promo';

export const PromoPage: React.FC = () => {
  const { activeProducts, isAdmin } = useCatalog();
  const [brand, setBrand] = useState<string>('Semua');

  const listings = useMemo(() => listPromoProducts(activeProducts), [activeProducts]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of listings) {
      map.set(item.brand, (map.get(item.brand) ?? 0) + 1);
    }
    return map;
  }, [listings]);
  const visible = brand === 'Semua' ? listings : listings.filter((item) => item.brand === brand);
  const hidden = promoCampaign.items.length - listings.length;

  return (
    <div className="space-y-4 pb-20">
      <div className="p-4 rounded-3xl bg-gradient-to-br from-orange-950 via-slate-900 to-slate-900 border border-orange-500/40 shadow-xl text-white space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-300 flex items-center justify-center border border-orange-500/30 flex-shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
              Min. {rupiah(promoCampaign.minPurchase)} / nota
            </span>
            <h1 className="text-lg font-black text-white mt-1 leading-tight">{promoCampaign.title}</h1>
          </div>
        </div>

        <ul className="space-y-1.5 text-xs text-orange-50/95 leading-relaxed list-disc pl-4">
          {promoCampaign.terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            aria-pressed={brand === 'Semua'}
            onClick={() => setBrand('Semua')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 border ${
              brand === 'Semua'
                ? 'bg-orange-500 text-slate-950 border-orange-300'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            Semua ({listings.length})
          </button>
          {promoCampaign.brands.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={brand === name}
              onClick={() => setBrand(name)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 border ${
                brand === name
                  ? 'bg-orange-500 text-slate-950 border-orange-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {name} ({counts.get(name) ?? 0})
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider">Daftar SKU Promo</span>
          <span className="font-mono text-white font-semibold">{visible.length} item</span>
        </div>

        {isAdmin && hidden > 0 && (
          <p className="text-[11px] text-amber-200/90 px-1">
            {hidden} SKU promo disembunyikan karena nonaktif atau tidak ada di katalog.
          </p>
        )}

        {visible.length > 0 ? (
          <LoadMoreList
            items={visible}
            resetKey={`${brand}:${visible.length}`}
            className="space-y-3"
            getKey={(item) => item.product.id || item.sku}
            renderItem={(item) => (
              <ProductCard
                product={item.product}
                promoView={{
                  promoPrice: item.promoPrice,
                  promoStock: item.promoStock,
                  showRetailStrike: item.showRetailStrike,
                }}
              />
            )}
          />
        ) : (
          <div className="p-8 text-center bg-slate-800/40 rounded-3xl border border-slate-700/60">
            <Tag className="w-10 h-10 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Tidak ada SKU promo di filter ini</p>
            <p className="text-xs text-slate-400 mt-1">
              Item nonaktif atau yang tidak ada di katalog tidak ditampilkan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
