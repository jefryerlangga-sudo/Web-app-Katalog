import React, { useMemo, useState } from 'react';
import {
  Flame,
  Trophy,
  ArrowRight,
  Sparkles,
  Smartphone,
  Briefcase,
  ChevronRight,
  Tag,
} from 'lucide-react';
import { APP_NAME, listStorefrontCategories } from '../config/app';
import { dealerQuote } from '../lib/money';
import { listPromoProducts } from '../lib/promo';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';
import { LoadMoreList } from '../components/LoadMoreList';
import { DesktopSplit } from '../components/DesktopSplit';
import { productGridClass } from '../lib/catalogKind';

export const HomePage: React.FC = () => {
  const {
    activeProducts,
    viewMode,
    setCurrentTab,
    setFilters,
    user,
    isAdmin,
    promo,
  } = useCatalog();

  const [selectedDevice, setSelectedDevice] = useState<string>('Semua');

  const focusProducts = activeProducts.filter((p) => p.isProductFocus);
  const bestSellerProducts = activeProducts.filter((p) => p.isBestSeller);
  const promoListings = useMemo(() => listPromoProducts(activeProducts, promo), [activeProducts, promo]);

  // Filter cepat tipe HP & kendaraan untuk canvasser di lapangan
  const popularDevices = [
    'Semua',
    'iPhone',
    'Type-C',
    'Samsung',
    'Xiaomi',
    'Oppo',
    'Lightning',
  ];

  // Filtered by selected device for instant showcase
  const displayedProducts =
    selectedDevice === 'Semua'
      ? activeProducts
      : activeProducts.filter((p) =>
          p.compatibility.toLowerCase().includes(selectedDevice.toLowerCase()) ||
          p.name.toLowerCase().includes(selectedDevice.toLowerCase())
        );

  const marginSamples = activeProducts
    .map((product) => dealerQuote(product.suggestedRetailPrice, product.wholesalePrice))
    .filter((quote): quote is NonNullable<typeof quote> => quote != null);
  const avgMargin = marginSamples.length
    ? Math.round(marginSamples.reduce((sum, quote) => sum + quote.marginPercent, 0) / marginSamples.length)
    : null;

  const handleSelectDevice = (device: string) => {
    setSelectedDevice(device);
    if (device !== 'Semua') {
      setFilters((prev) => ({
        ...prev,
        compatibilityVehicle: device,
        searchQuery: '',
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        compatibilityVehicle: '',
      }));
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    setFilters((prev) => ({
      ...prev,
      category: categoryName,
      searchQuery: '',
    }));
    setCurrentTab('search');
  };

  const categories = listStorefrontCategories(activeProducts.map((item) => item.category));

  return (
    <DesktopSplit
      sidebar={
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 px-2 pb-1">Kategori</p>
          <button
            type="button"
            onClick={() => {
              setFilters((prev) => ({ ...prev, category: 'All', searchQuery: '' }));
              setCurrentTab('home');
            }}
            className="w-full text-left px-2 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Semua
          </button>
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleCategoryClick(name)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
            >
              {name}
            </button>
          ))}
        </div>
      }
    >
    <div className="space-y-3 pb-24 lg:pb-8">
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 lg:hidden">
        {categories.slice(0, 12).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => handleCategoryClick(name)}
            className="shrink-0 w-16 text-center"
          >
            <span className="mx-auto w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#0B1B3A]">
              <Smartphone className="w-5 h-5" />
            </span>
            <span className="mt-1 block text-[10px] leading-tight text-slate-700 line-clamp-2">{name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCurrentTab(promo?.active ? 'promo' : 'focus')}
        className="w-full text-left rounded-2xl overflow-hidden bg-[#0B1B3A] text-white p-4 shadow-sm"
      >
        <p className="text-[11px] font-bold text-blue-200">{promo?.active ? promo.title : APP_NAME}</p>
        {promo ? <span className="sr-only">{promo.title}</span> : null}
        <p className="text-base font-black mt-0.5">
          {user?.displayName ? `Halo, ${user.displayName.split(' ')[0]}` : 'Aksesoris HP pilihan'}
        </p>
        <p className="text-xs text-blue-100 mt-1">
          {promo?.active ? `${promoListings.length} SKU promo` : `${activeProducts.length} SKU siap dipesan`}
        </p>
      </button>

      <div className="grid grid-cols-4 gap-2">
        {[
          { id: 'focus', label: 'Fokus', icon: Flame, count: focusProducts.length },
          { id: 'bestseller', label: 'Terlaris', icon: Trophy, count: bestSellerProducts.length },
          { id: 'promo', label: 'Promo', icon: Tag, count: promoListings.length },
          { id: 'ai', label: 'Asisten', icon: Sparkles, count: null },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentTab(item.id)}
            className="bg-white rounded-xl border border-slate-200 py-2 text-center shadow-sm"
          >
            <item.icon className="w-4 h-4 mx-auto text-[#0B1B3A]" />
            <span className="block text-[11px] font-bold text-slate-800 mt-1">{item.label}</span>
            {item.count != null && <span className="text-[10px] text-slate-500">{item.count}</span>}
          </button>
        ))}
      </div>

      {viewMode === 'sales' && isAdmin && (
        <p className="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 rounded-xl px-3 py-2">
          Rata-rata margin toko {avgMargin == null ? '—' : `+${avgMargin}%`}
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {popularDevices.map((device) => (
          <button
            key={device}
            type="button"
            onClick={() => handleSelectDevice(device)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${
              selectedDevice === device ? 'bg-[#0B1B3A] text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {device}
          </button>
        ))}
      </div>

      {isAdmin && (
        <button
          type="button"
          onClick={() => setCurrentTab('admin')}
          className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#0B1B3A]"
        >
          <span className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Kelola katalog / Excel</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-sm font-black text-slate-900">
          {selectedDevice === 'Semua' ? 'Rekomendasi' : selectedDevice}
        </h2>
        <button type="button" onClick={() => setCurrentTab('search')} className="text-xs font-bold text-[#0B1B3A] flex items-center gap-1">
          Lihat semua <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <LoadMoreList
        items={displayedProducts}
        resetKey={`${selectedDevice}:${displayedProducts.length}`}
        className={productGridClass}
        getKey={(product) => product.id || product.sku}
        renderItem={(product) => <ProductCard product={product} variant="tile" />}
      />
    </div>
    </DesktopSplit>
  );
};
