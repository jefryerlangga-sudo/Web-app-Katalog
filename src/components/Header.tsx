import React from 'react';
import {
  BarChart3,
  Briefcase,
  Eye,
  LogOut,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { APP_NAME, configuredWhatsAppNumber } from '../config/app';
import { useCatalog } from '../context/CatalogContext';
import { BrandMark } from './BrandMark';

export const Header: React.FC = () => {
  const {
    viewMode,
    toggleViewMode,
    user,
    logout,
    isAdmin,
    setCurrentTab,
    currentTab,
    setShowAuthModal,
    cartCount,
    pendingCount,
    accountLabel,
    filters,
    setFilters,
    accountOpen,
    setAccountOpen,
    promo,
  } = useCatalog();

  const whatsApp = configuredWhatsAppNumber();

  const applySearch = (value: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: value }));
    if (currentTab !== 'search') setCurrentTab('search');
  };

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    applySearch(filters.searchQuery);
  };

  return (
    <header className="sticky top-0 z-40 text-white" style={{ backgroundColor: '#0B1B3A' }}>
      <div className="max-w-md mx-auto px-3 pt-2.5 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentTab('home')}
            className="shrink-0 active:opacity-80"
            aria-label={APP_NAME}
          >
            <BrandMark className="w-9 h-9" />
          </button>
          <form onSubmit={submitSearch} className="flex-1 min-w-0">
            <label className="flex items-center gap-2 bg-white rounded-full px-3 h-9 text-slate-800">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                value={filters.searchQuery}
                onChange={(event) => applySearch(event.target.value)}
                placeholder="Cari aksesoris HP"
                aria-label="Cari produk"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  aria-label="Hapus pencarian"
                  onClick={() => applySearch('')}
                  className="text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
          </form>
          {promo?.active && (
            <button
              type="button"
              onClick={() => setCurrentTab('promo')}
              className="shrink-0 text-[10px] font-black px-2 h-9 rounded-full bg-white text-[#0B1B3A]"
            >
              PROMO
            </button>
          )}
          {whatsApp && (
            <a
              href={`https://wa.me/${whatsApp}`}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-95"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setCurrentTab('cart')}
            className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-95"
            aria-label="Keranjang"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-black flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
        {isAdmin && (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleViewMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                viewMode === 'sales' ? 'bg-amber-400 text-slate-950' : 'bg-white/15 text-white'
              }`}
            >
              {viewMode === 'sales' ? <Briefcase className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {viewMode === 'sales' ? 'Mode Sales' : 'Mode Toko'}
            </button>
            <p className="text-[10px] text-white/70 truncate">{APP_NAME}</p>
          </div>
        )}
      </div>

      {accountOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Tutup akun"
            onClick={() => setAccountOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-0 max-w-md mx-auto bg-white text-slate-900 rounded-t-3xl p-4 pb-8 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black text-base truncate">{user?.displayName || (user ? 'Pelanggan' : 'Tamu')}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || 'Belum masuk'}</p>
                <p className="mt-1 text-[11px] font-bold text-[#0B1B3A]">{accountLabel}</p>
              </div>
              <button type="button" onClick={() => setAccountOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" aria-label="Tutup">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <AccountLink icon={<ShoppingCart className="w-4 h-4" />} label={`Keranjang (${cartCount})`} onClick={() => setCurrentTab('cart')} />
              <AccountLink icon={<Search className="w-4 h-4" />} label="Cari produk" onClick={() => setCurrentTab('search')} />
              <AccountLink icon={<Sparkles className="w-4 h-4" />} label="Asisten AI" onClick={() => setCurrentTab('ai')} active={currentTab === 'ai'} />
              {isAdmin && (
                <AccountLink icon={<SlidersHorizontal className="w-4 h-4" />} label="Kelola Katalog" badge={pendingCount} onClick={() => setCurrentTab('admin')} active={currentTab === 'admin'} />
              )}
              {isAdmin && (
                <AccountLink icon={<BarChart3 className="w-4 h-4" />} label="Laporan" onClick={() => setCurrentTab('laporan')} active={currentTab === 'laporan'} />
              )}
              {isAdmin && (
                <p className="px-2 pt-1 text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Master admin
                </p>
              )}
            </div>
            <div className="mt-3">
              {user ? (
                <button type="button" onClick={() => { logout(); setAccountOpen(false); }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-rose-600 font-bold bg-rose-50">
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              ) : (
                <button type="button" onClick={() => setShowAuthModal(true)} className="w-full py-2.5 rounded-xl bg-[#0B1B3A] text-white font-bold">
                  Masuk / Daftar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

function AccountLink({
  icon,
  label,
  onClick,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-2.5 rounded-xl font-semibold ${active ? 'bg-[#0B1B3A] text-white' : 'hover:bg-slate-100'}`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge ? <span className="min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">{badge}</span> : null}
    </button>
  );
}
