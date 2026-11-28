import React from 'react';
import { ArrowRight, Home, LayoutGrid, Scale, ShoppingCart, Tag, User, X } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, compareList, clearCompare, cartCount, setAccountOpen, accountOpen } = useCatalog();

  const navItems = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'categories', label: 'Kategori', icon: LayoutGrid },
    { id: 'cart', label: 'Keranjang', icon: ShoppingCart, count: cartCount },
    { id: 'promo', label: 'Promo', icon: Tag },
    { id: 'account', label: 'Akun', icon: User },
  ];

  return (
    <>
      {compareList.length > 0 && currentTab !== 'compare' && (
        <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 z-30 px-3 pb-1 pointer-events-none">
          <div className="max-w-md lg:max-w-[1400px] mx-auto pointer-events-auto">
            <div className="bg-[#0B1B3A] text-white p-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Scale className="w-4 h-4 shrink-0" />
                <p className="text-xs font-bold truncate">Bandingkan {compareList.length}/3</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setCurrentTab('compare')} className="px-3 py-1.5 rounded-xl bg-white text-[#0B1B3A] font-bold text-xs flex items-center gap-1">
                  Lihat <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={clearCompare} className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center" aria-label="Hapus perbandingan">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe lg:hidden">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'account' ? accountOpen : currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'account') {
                    setAccountOpen(!accountOpen);
                    return;
                  }
                  setCurrentTab(item.id);
                }}
                className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  isActive ? 'text-[#0B1B3A]' : 'text-slate-500'
                }`}
              >
                <span className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                  {item.count ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
