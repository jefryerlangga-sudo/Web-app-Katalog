import React, { useMemo, useState } from 'react';
import { BatteryFull } from 'lucide-react';
import { BATTERY_MAKES, PHONE_BRANDS } from '../lib/catalogKind';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';
import { LoadMoreList } from '../components/LoadMoreList';

export const BatteryPage: React.FC = () => {
  const { batteryProducts, filters } = useCatalog();
  const [phone, setPhone] = useState<string>('Semua');
  const [make, setMake] = useState<string>('Semua');
  const query = filters.searchQuery.trim().toLowerCase();

  const shown = useMemo(() => {
    return batteryProducts.filter((product) => {
      if (make !== 'Semua' && product.brand !== make) return false;
      if (phone !== 'Semua' && product.subcategory !== phone) return false;
      if (!query) return true;
      const haystack = [
        product.name,
        product.sku,
        product.brand,
        product.subcategory,
        product.compatibility,
        product.specification,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [batteryProducts, make, phone, query]);

  return (
    <div className="space-y-3 pb-24">
      <div className="rounded-2xl bg-[#064E3B] text-white p-4">
        <p className="text-[11px] font-bold text-emerald-200 flex items-center gap-1">
          <BatteryFull className="w-3.5 h-3.5" /> Mode Baterai
        </p>
        <h1 className="text-lg font-black mt-0.5">Baterai HP OG, HX, dan LF</h1>
        <p className="text-xs text-emerald-100 mt-1">{batteryProducts.length} SKU · harga grosir di katalog, End User +30%</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {['Semua', ...BATTERY_MAKES].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setMake(item)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black ${
              make === item ? 'bg-[#047857] text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {item === 'Semua' ? 'Semua merek' : item}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['Semua', ...PHONE_BRANDS].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPhone(item)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold ${
              phone === item ? 'bg-[#0B1B3A] text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold text-slate-600 px-0.5">
        Menampilkan <strong className="text-slate-900">{shown.length}</strong> baterai
      </p>

      {shown.length > 0 ? (
        <LoadMoreList
          items={shown}
          resetKey={`${query}|${phone}|${make}|${shown.length}`}
          className="grid grid-cols-2 gap-2"
          getKey={(product) => product.id || product.sku}
          renderItem={(product) => <ProductCard product={product} variant="tile" />}
        />
      ) : (
        <p className="text-sm text-slate-500 bg-white rounded-2xl border border-slate-200 p-4">
          Tidak ada baterai untuk pencarian atau filter ini.
        </p>
      )}
    </div>
  );
};
