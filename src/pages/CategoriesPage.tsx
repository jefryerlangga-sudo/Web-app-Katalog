import React from 'react';
import {
  Smartphone,
  Zap,
  Cable,
  Headphones,
  BatteryCharging,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';

export const CategoriesPage: React.FC = () => {
  const { activeProducts, setFilters, setCurrentTab } = useCatalog();

  const categoryConfigs = [
    {
      name: 'Charger & Adapter',
      desc: 'Adaptor GaN 30W, Dual Port PD+QC, Fast Charger dinding, Travel Adapter',
      icon: Zap,
      gradient: 'from-amber-600/30 to-amber-950/60',
      border: 'border-amber-500/40',
      textColor: 'text-amber-400',
    },
    {
      name: 'Kabel Data & Charging',
      desc: 'Kabel Type-C 100W, Lightning iPhone, Braided Nylon anti-kusut, 3-in-1',
      icon: Cable,
      gradient: 'from-blue-600/30 to-blue-950/60',
      border: 'border-blue-500/40',
      textColor: 'text-blue-400',
    },
    {
      name: 'Audio & TWS Earbuds',
      desc: 'TWS Bluetooth 5.3, Headset kabel bass, Earphone anti bising, Speaker mini',
      icon: Headphones,
      gradient: 'from-purple-600/30 to-purple-950/60',
      border: 'border-purple-500/40',
      textColor: 'text-purple-400',
    },
    {
      name: 'Powerbank & Baterai',
      desc: 'Powerbank Magsafe Wireless, Fast Charging 20W PD, Flight Safe 10000mAh',
      icon: BatteryCharging,
      gradient: 'from-emerald-600/30 to-emerald-950/60',
      border: 'border-emerald-500/40',
      textColor: 'text-emerald-400',
    },
    {
      name: 'Tempered Glass & Pelindung',
      desc: 'Anti-Spy Ceramic 9D, Tempered Glass Bening 9H, Pelindung Lensa Kamera',
      icon: Shield,
      gradient: 'from-rose-600/30 to-rose-950/60',
      border: 'border-rose-500/40',
      textColor: 'text-rose-400',
    },
    {
      name: 'Holder & Mount HP',
      desc: 'Holder Motor Stang/Spion Waterproof Ojol, Car Mount Dashboard & AC',
      icon: Smartphone,
      gradient: 'from-cyan-600/30 to-cyan-950/60',
      border: 'border-cyan-500/40',
      textColor: 'text-cyan-400',
    },
    {
      name: 'Casing & Aksesoris Proteksi',
      desc: 'Case Magsafe Magnetic, Armor Shockproof Drop Protection, Matte Softcase',
      icon: Layers,
      gradient: 'from-indigo-600/30 to-indigo-950/60',
      border: 'border-indigo-500/40',
      textColor: 'text-indigo-400',
    },
  ];

  const handleSelectCategory = (catName: string, subcategory?: string) => {
    setFilters((prev) => ({
      ...prev,
      category: catName,
      searchQuery: subcategory || '',
      compatibilityVehicle: '',
    }));
    setCurrentTab('search');
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="px-1">
        <h1 className="text-lg font-black text-white tracking-tight">
          Kategori Aksesoris Handphone
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Jelajahi lini produk aksesoris smartphone berdasarkan kategori
        </p>
      </div>

      <div className="space-y-3">
        {categoryConfigs.map((cat) => {
          const Icon = cat.icon;
          const matchingProducts = activeProducts.filter(
            (p) => p.category.toLowerCase() === cat.name.toLowerCase()
          );

          // Get unique subcategories
          const subcategories = Array.from(
            new Set(matchingProducts.map((p) => p.subcategory).filter(Boolean))
          );

          return (
            <div
              key={cat.name}
              className={`p-4 rounded-3xl bg-gradient-to-br ${cat.gradient} bg-slate-900 border ${cat.border} shadow-lg space-y-3`}
            >
              {/* Category Header */}
              <div
                onClick={() => handleSelectCategory(cat.name)}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-center ${cat.textColor} shadow`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                      {cat.name}
                    </h2>
                    <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                      {cat.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-900/60 text-slate-300 border border-slate-700">
                    {matchingProducts.length} SKU
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              {/* Subcategories Chips */}
              {subcategories.length > 0 && (
                <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-1.5">
                  {subcategories.map((sub) => {
                    const subCount = matchingProducts.filter(
                      (p) => p.subcategory === sub
                    ).length;
                    return (
                      <button
                        key={sub}
                        onClick={() => handleSelectCategory(cat.name, sub)}
                        className="px-2.5 py-1 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-700/60 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <span>{sub}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({subCount})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
