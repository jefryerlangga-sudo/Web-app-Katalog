import React from 'react';
import {
  Home,
  Search,
  Flame,
  Trophy,
  LayoutGrid,
  Scale,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, compareList, clearCompare } = useCatalog();

  const navItems = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'search', label: 'Cari', icon: Search },
    { id: 'focus', label: 'Fokus', icon: Flame, badge: 'HOT' },
    { id: 'bestseller', label: 'Terlaris', icon: Trophy },
    { id: 'categories', label: 'Kategori', icon: LayoutGrid },
    { id: 'ai', label: 'Asisten AI', icon: Sparkles, highlight: true },
  ];

  return (
    <>
      {/* Floating Comparison Drawer Bar if items selected */}
      {compareList.length > 0 && currentTab !== 'compare' && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-3 pb-1 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-2.5 rounded-2xl shadow-xl border border-blue-400/30 flex items-center justify-between gap-2 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    <span>Perbandingan ({compareList.length}/3)</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                      {3 - compareList.length > 0 ? `Sisa ${3 - compareList.length}` : 'Penuh'}
                    </span>
                  </p>
                  <p className="text-[11px] text-blue-100 truncate">
                    {compareList.map((p) => p.name.split(' ')[0]).join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setCurrentTab('compare')}
                  className="px-3 py-1.5 rounded-xl bg-white text-blue-900 font-bold text-xs flex items-center gap-1 shadow hover:bg-blue-50 active:scale-95 transition-transform"
                >
                  <span>Bandingkan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCompare();
                  }}
                  className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white"
                  title="Hapus perbandingan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-6 h-16 items-center px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`relative flex flex-col items-center justify-center h-full gap-1 transition-all active:scale-90 ${
                  isActive
                    ? item.highlight
                      ? 'text-amber-400 font-bold'
                      : 'text-blue-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span
                    className={`absolute top-0 w-8 h-1 rounded-full ${
                      item.highlight ? 'bg-amber-400' : 'bg-blue-500'
                    }`}
                  />
                )}

                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {item.badge && !isActive && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 text-[8px] font-extrabold bg-rose-500 text-white rounded-full leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span className="text-[10px] tracking-tight leading-none truncate max-w-[54px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
