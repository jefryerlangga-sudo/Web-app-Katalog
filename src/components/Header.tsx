import React, { useState } from 'react';
import {
  Smartphone,
  Eye,
  Briefcase,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';

export const Header: React.FC = () => {
  const {
    viewMode,
    toggleViewMode,
    user,
    login,
    logout,
    isAdmin,
    canvasserProfile,
    setCurrentTab,
    currentTab,
  } = useCatalog();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-3 py-2.5">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo & Rute Motoris */}
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
                Partshop
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                SALES
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[140px] leading-tight mt-0.5">
              {canvasserProfile.territory}
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Tombol Toggle Mode Sales vs Mode Pelanggan */}
          <button
            onClick={toggleViewMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ${
              viewMode === 'sales'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title="Klik untuk beralih antara Mode Sales dan Mode Pelanggan"
          >
            {viewMode === 'sales' ? (
              <>
                <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                <span>Mode Sales</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pelanggan</span>
              </>
            )}
          </button>

          {/* User / Profil Menu Button */}
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

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pb-2.5 mb-2.5 border-b border-slate-700">
                  <p className="font-bold text-white text-sm truncate">
                    {user?.displayName || canvasserProfile.name}
                  </p>
                  <p className="text-slate-400 truncate text-[11px] mt-0.5">
                    {user?.email || 'Login Canvasser Lapangan'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-semibold text-[10px]">
                      Field Motoris / Canvasser
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
                      toggleViewMode();
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-slate-200 hover:bg-slate-700/60 font-medium"
                  >
                    <span>Mode Tampilan Aktif:</span>
                    <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-slate-700 text-blue-400">
                      {viewMode === 'sales' ? 'Mode Sales' : 'Pelanggan'}
                    </span>
                  </button>

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
                      <span>Keluar Akun Google</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        login();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md active:scale-95"
                    >
                      <User className="w-4 h-4" />
                      <span>Masuk dengan Google</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safety Mode Banner */}
      {viewMode === 'customer' && (
        <div className="mt-1 py-1 px-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center justify-between max-w-md mx-auto animate-in slide-in-from-top-1">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
            <span>Mode Pelanggan Aktif — Margin rahasia konter disembunyikan</span>
          </div>
          <button
            onClick={toggleViewMode}
            className="text-[10px] underline underline-offset-2 hover:text-white"
          >
            Beralih ke Sales
          </button>
        </div>
      )}
    </header>
  );
};
