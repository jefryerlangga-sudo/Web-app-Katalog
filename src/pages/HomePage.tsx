import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  ArrowRight,
  Sparkles,
  Smartphone,
  Briefcase,
  ChevronRight,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';

export const HomePage: React.FC = () => {
  const {
    activeProducts,
    viewMode,
    setCurrentTab,
    setFilters,
    canvasserProfile,
  } = useCatalog();

  const [selectedDevice, setSelectedDevice] = useState<string>('Semua');

  const focusProducts = activeProducts.filter((p) => p.isProductFocus);
  const bestSellerProducts = activeProducts.filter((p) => p.isBestSeller);

  // Filter cepat tipe HP & kendaraan untuk canvasser di lapangan
  const popularDevices = [
    'Semua',
    'iPhone',
    'Type-C',
    'Samsung',
    'Xiaomi',
    'Motor',
    'Vario',
  ];

  // Filtered by selected device for instant showcase
  const displayedProducts =
    selectedDevice === 'Semua'
      ? activeProducts
      : activeProducts.filter((p) =>
          p.compatibility.toLowerCase().includes(selectedDevice.toLowerCase()) ||
          p.name.toLowerCase().includes(selectedDevice.toLowerCase())
        );

  // Compute average margin
  const avgMargin = Math.round(
    activeProducts.reduce((acc, curr) => {
      const profit = Math.max(0, curr.suggestedRetailPrice - curr.wholesalePrice);
      return acc + (curr.suggestedRetailPrice > 0 ? (profit / curr.suggestedRetailPrice) * 100 : 0);
    }, 0) / (activeProducts.length || 1)
  );

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

  return (
    <div className="space-y-4 pb-20">
      {/* Route & Canvasser Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-800/90 to-blue-950/60 p-4 rounded-3xl border border-slate-700/80 shadow-lg text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Sales Enablement Canvasser</span>
            </span>
            <h1 className="text-xl font-black mt-0.5 tracking-tight">
              Semangat Pagi, {canvasserProfile.name.split(' ')[0]}!
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Siap kunjungan rute konter & toko retail hari ini.
            </p>
          </div>

          <div className="text-right bg-slate-900/60 p-2 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 block font-semibold">Target Rute</span>
            <span className="text-base font-extrabold text-blue-400 font-mono">
              14 Toko
            </span>
          </div>
        </div>

        {/* Quick Route KPI Metrics */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/60">
          <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">SKU Fokus</span>
            <span className="text-sm font-bold text-rose-400 flex items-center gap-1 font-mono">
              <Flame className="w-3.5 h-3.5" /> {focusProducts.length} Item
            </span>
          </div>

          <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Fast Moving</span>
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1 font-mono">
              <Trophy className="w-3.5 h-3.5" /> {bestSellerProducts.length} Item
            </span>
          </div>

          <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">
              {viewMode === 'sales' ? 'Rata Margin Toko' : 'Kualitas Terjamin'}
            </span>
            <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 font-mono">
              {viewMode === 'sales' ? (
                <>
                  <Percent className="w-3.5 h-3.5" /> +{avgMargin}%
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Asli
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Akses Cepat Input Produk & Import Excel */}
      <div className="bg-gradient-to-r from-blue-900/50 via-slate-800 to-emerald-950/50 p-3 rounded-2xl border border-blue-500/30 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight">
              Ingin Menambah Produk?
            </h4>
            <p className="text-[10px] text-slate-300 mt-0.5">
              Input manual atau upload massal Excel / CSV
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentTab('admin')}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] whitespace-nowrap shadow-md active:scale-95 transition-all flex items-center gap-1"
        >
          <span>Input Produk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Cepat Kompatibilitas Tipe HP & Motor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Filter Cepat Tipe HP / Perangkat</span>
          </h2>
          {selectedDevice !== 'Semua' && (
            <button
              onClick={() => handleSelectDevice('Semua')}
              className="text-[11px] text-blue-400 hover:text-white"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {popularDevices.map((device) => (
            <button
              key={device}
              onClick={() => handleSelectDevice(device)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 flex-shrink-0 ${
                selectedDevice === device
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {device === 'Semua' ? 'Semua Perangkat' : device}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Focus Drive Banner */}
      {focusProducts.length > 0 && (
        <div className="p-3.5 rounded-3xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border border-rose-500/40 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <Flame className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                  Dorongan Prioritas Manajemen
                </span>
                <h3 className="text-sm font-bold text-white leading-tight">
                  Kampanye Produk Fokus Bulan Ini
                </h3>
              </div>
            </div>

            <button
              onClick={() => setCurrentTab('focus')}
              className="px-2.5 py-1 rounded-xl bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow hover:bg-rose-600 active:scale-95"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {viewMode === 'sales' && (
            <p className="text-[11px] text-rose-200/90 mt-2 bg-rose-950/50 p-2 rounded-xl border border-rose-500/20">
              💡 <strong>Tips Canvasser:</strong> Produk Fokus memiliki program promo Beli 10 Gratis 1 untuk konter dan poin komisi 2x lipat untuk motoris!
            </p>
          )}
        </div>
      )}

      {/* AI Assistant Quick Callout */}
      <div
        onClick={() => setCurrentTab('ai')}
        className="p-3 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1">
              <span>Asisten AI Produk</span>
              <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-400/30 font-semibold">
                Terverifikasi
              </span>
            </h4>
            <p className="text-[11px] text-slate-300">
              Butuh saran pitch, kecocokan tipe HP, atau opsi Good/Better/Best?
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-300 flex-shrink-0" />
      </div>

      {/* Category Quick Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Kategori Aksesoris Handphone & Part
          </h2>
          <button
            onClick={() => setCurrentTab('categories')}
            className="text-[11px] text-blue-400 hover:text-white flex items-center gap-0.5"
          >
            <span>Semua Kategori</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Charger & Adapter', count: 3, desc: 'GaN 30W, Dual Port, Travel', color: 'from-amber-900/40' },
            { name: 'Kabel Data & Charging', count: 3, desc: 'Type-C 100W, Lightning, USB', color: 'from-blue-900/40' },
            { name: 'Audio & TWS Earbuds', count: 2, desc: 'Anker Soundcore, Robot TWS', color: 'from-purple-900/40' },
            { name: 'Powerbank & Baterai', count: 2, desc: 'Magsafe Wireless, 10000mAh', color: 'from-emerald-900/40' },
            { name: 'Tempered Glass & Pelindung', count: 1, desc: '9D Ceramic Anti-Spy', color: 'from-rose-900/40' },
            { name: 'Holder & Mount HP', count: 1, desc: 'Holder Motor Ojol Waterproof', color: 'from-cyan-900/40' },
          ].map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className={`p-3 rounded-2xl bg-gradient-to-br ${cat.color} to-slate-800/80 border border-slate-700/80 text-left hover:border-slate-600 transition-all active:scale-95`}
            >
              <h3 className="text-xs font-bold text-white line-clamp-1">{cat.name}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{cat.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Showcase Product Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {selectedDevice === 'Semua' ? 'Produk Unggulan Katalog' : `Aksesoris untuk ${selectedDevice}`}
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            {displayedProducts.length} item
          </span>
        </div>

        <div className="space-y-2.5">
          {displayedProducts.slice(0, 8).map((product) => (
            <ProductCard key={product.id || product.sku} product={product} />
          ))}
        </div>

        {displayedProducts.length > 8 && (
          <button
            onClick={() => setCurrentTab('search')}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Lihat Semua {displayedProducts.length} Produk</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
