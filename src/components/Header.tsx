import React, { useState } from 'react';
import {
  Briefcase,
  Eye,
  LogOut,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  User,
} from 'lucide-react';
import { APP_NAME } from '../config/app';
import { useCatalog } from '../context/CatalogContext';

export const Header: React.FC = () => {
  const {
    viewMode,
    toggleViewMode,
    user,
    logout,
    isAdmin,
    canvasserProfile,
    setCurrentTab,
    currentTab,
    setShowAuthModal,
    cartCount,
  } = useCatalog();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-3 py-2.5">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrentTab('home')}
          className="flex items-center gap-2 text-left active:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white leading-none">
                {APP_NAME}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                SHOP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[140px] leading-tight mt-0.5">
              {canvasserProfile.territory}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentTab('cart')}
            className="relative w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-95"
            title="Keranjang"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-black flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={toggleViewMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ${
                viewMode === 'sales'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title="Mode harga grosir hanya untuk master admin"
            >
              {viewMode === 'sales' ? (
                <>
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sales</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Toko</span>
                </>
              )}
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-95 hover:border-slate-600"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Pengguna'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>

            {showProfileMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl p-3 z-50 text-xs"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="pb-2.5 mb-2.5 border-b border-slate-700">
                  <p className="font-bold text-white text-sm truncate">
                    {user?.displayName || (user ? 'Pelanggan' : 'Tamu')}
                  </p>
                  <p className="text-slate-400 truncate text-[11px] mt-0.5">
                    {user?.email || 'Belum masuk'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-semibold text-[10px]">
                      {isAdmin ? 'Master Admin' : user ? 'Customer' : 'Guest'}
                    </span>
                    {isAdmin && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded font-semibold text-[10px] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setCurrentTab('cart');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-slate-200 hover:bg-slate-700/60 font-medium"
                  >
                    <ShoppingCart className="w-4 h-4 text-blue-400" />
                    <span>Keranjang ({cartCount})</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setCurrentTab('admin');
                        setShowProfileMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded-xl font-medium ${
                        currentTab === 'admin'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-200 hover:bg-slate-700/60'
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                      <span>Kelola Katalog (Admin)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setCurrentTab('ai');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-slate-200 hover:bg-slate-700/60 font-medium"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Asisten AI Produk</span>
                  </button>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-700">
                  {user ? (
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md active:scale-95"
                    >
                      <User className="w-4 h-4" />
                      <span>Masuk / Daftar</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'sales' && isAdmin && (
        <div className="mt-1 py-1 px-2.5 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
            <span>Mode Sales Admin — harga grosir terlihat di aplikasi ini</span>
          </div>
          <button onClick={toggleViewMode} className="text-[10px] underline underline-offset-2 hover:text-white">
            Mode Toko
          </button>
        </div>
      )}
    </header>
  );
};
