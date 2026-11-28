import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Flame,
  Trophy,
  RotateCcw,
  Check,
  Tag,
} from 'lucide-react';
import { dealerQuote } from '../lib/money';
import { isPromoSku } from '../lib/promo';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';
import { LoadMoreList } from '../components/LoadMoreList';
import { DesktopSplit } from '../components/DesktopSplit';
import { useOverlayHistory } from '../lib/overlayHistory';
import { productGridClass } from '../lib/catalogKind';
import { listStorefrontCategories } from '../config/app';

export const SearchCatalogPage: React.FC = () => {
  const { activeProducts, filters, setFilters, resetFilters, viewMode, promo } = useCatalog();
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  useOverlayHistory(showFilterDrawer, () => setShowFilterDrawer(false));
  const categoryNames = useMemo(
    () => listStorefrontCategories(activeProducts.map((item) => item.category)),
    [activeProducts]
  );

  // Extract unique categories & brands from active products
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Semua Kategori', ...Array.from(set)];
  }, [activeProducts]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    activeProducts.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ['Semua Merk', ...Array.from(set)];
  }, [activeProducts]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'All' && filters.category !== 'Semua Kategori') count++;
    if (filters.brand !== 'All' && filters.brand !== 'Semua Merk') count++;
    if (filters.stockStatus !== 'All') count++;
    if (filters.positioning !== 'All') count++;
    if (filters.isProductFocus !== null) count++;
    if (filters.isBestSeller !== null) count++;
    if (filters.promoOnly) count++;
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    if (filters.compatibilityVehicle) count++;
    return count;
  }, [filters]);

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      // Search Query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const haystack = [product.name, product.sku, product.brand, product.compatibility, product.subcategory]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      // Compatibility filter
      if (filters.compatibilityVehicle) {
        if (
          !product.compatibility
            .toLowerCase()
            .includes(filters.compatibilityVehicle.toLowerCase()) &&
          !product.name
            .toLowerCase()
            .includes(filters.compatibilityVehicle.toLowerCase())
        ) {
          return false;
        }
      }

      // Category filter
      if (
        filters.category !== 'All' &&
        filters.category !== 'Semua Kategori' &&
        product.category !== filters.category
      ) {
        return false;
      }

      // Brand filter
      if (
        filters.brand !== 'All' &&
        filters.brand !== 'Semua Merk' &&
        product.brand !== filters.brand
      ) {
        return false;
      }

      // Stock Status
      if (filters.stockStatus !== 'All' && product.stockStatus !== filters.stockStatus) {
        return false;
      }

      // Positioning (Good / Better / Best)
      if (filters.positioning !== 'All' && product.positioning !== filters.positioning) {
        return false;
      }

      // Product Focus
      if (filters.isProductFocus !== null && product.isProductFocus !== filters.isProductFocus) {
        return false;
      }

      // Best Seller
      if (filters.isBestSeller !== null && product.isBestSeller !== filters.isBestSeller) {
        return false;
      }

      if (filters.promoOnly && !isPromoSku(product.sku, promo)) {
        return false;
      }

      // Price Range
      const effectivePrice = product.suggestedRetailPrice;
      if (filters.minPrice !== null && effectivePrice < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== null && effectivePrice > filters.maxPrice) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'price-asc') {
        return a.suggestedRetailPrice - b.suggestedRetailPrice;
      }
      if (filters.sortBy === 'price-desc') {
        return b.suggestedRetailPrice - a.suggestedRetailPrice;
      }
      if (filters.sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (filters.sortBy === 'margin-desc' && viewMode === 'sales') {
        const margin = (product: { suggestedRetailPrice: number; wholesalePrice?: number }) =>
          dealerQuote(product.suggestedRetailPrice, product.wholesalePrice)?.profit ?? -1;
        return margin(b) - margin(a);
      }
      // default: featured (Product Focus and Best Seller first)
      if (a.isProductFocus && !b.isProductFocus) return -1;
      if (!a.isProductFocus && b.isProductFocus) return 1;
      return 0;
    });
  }, [activeProducts, filters, viewMode, promo]);

  useEffect(() => {
    const bar = document.getElementById('catalog-toolbar');
    const header = document.querySelector('header');
    if (!bar) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const top = bar.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }, [filters.searchQuery]);

  return (
    <DesktopSplit
      sidebar={
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 px-2 pb-1">Kategori</p>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, category: 'All' }))}
            className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${filters.category === 'All' ? 'bg-[#0B1B3A] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            Semua
          </button>
          {categoryNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, category: name }))}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${filters.category === name ? 'bg-[#0B1B3A] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              {name}
            </button>
          ))}
        </div>
      }
    >
    <div className="space-y-3 pb-20 lg:pb-8">
      <div id="catalog-toolbar" className="scroll-mt-28 pt-1 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 pb-0.5 lg:hidden">
          {/* Focus Toggle */}
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                isProductFocus: prev.isProductFocus === true ? null : true,
              }))
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 border ${
              filters.isProductFocus === true
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Hanya Fokus</span>
          </button>

          {/* Best Seller Toggle */}
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                isBestSeller: prev.isBestSeller === true ? null : true,
              }))
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 border ${
              filters.isBestSeller === true
                ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-3 h-3" />
            <span>Paling Laris</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                promoOnly: !prev.promoOnly,
              }))
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 border ${
              filters.promoOnly
                ? 'bg-orange-500 text-slate-950 border-orange-300 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>Promo</span>
          </button>

          {/* Good / Better / Best quick chips */}
          {['Good', 'Better', 'Best'].map((tier) => (
            <button
              key={tier}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  positioning: prev.positioning === tier ? 'All' : tier,
                }))
              }
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 border ${
                filters.positioning === tier
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Tier {tier}
            </button>
          ))}

          {/* Reset Filters shortcut if active */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-rose-400 hover:text-white bg-rose-500/10 border border-rose-500/30 whitespace-nowrap flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilterDrawer(true)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
              activeFilterCount > 0
                ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-blue-900 text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div id="catalog-results" className="flex items-center justify-between px-1 text-xs text-slate-400 scroll-mt-28">
        <span className="font-semibold">
          Menampilkan <strong className="text-slate-900 font-mono">{filteredProducts.length}</strong> produk
        </span>

        {/* Sort selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500">Urutkan:</span>
          <select
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))
            }
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold focus:outline-none"
          >
            <option value="featured">Rekomendasi Fokus</option>
            <option value="price-asc">Harga: Termurah</option>
            <option value="price-desc">Harga: Tertinggi</option>
            <option value="name-asc">Nama Produk (A-Z)</option>
            {viewMode === 'sales' && (
              <option value="margin-desc">Margin Laba Tertinggi</option>
            )}
          </select>
        </div>
      </div>

      {/* Products Results List */}
      {filteredProducts.length > 0 ? (
        <LoadMoreList
          items={filteredProducts}
          resetKey={`${filters.searchQuery}|${filters.category}|${filters.brand}|${filters.sortBy}|${filters.compatibilityVehicle}|${filters.promoOnly}|${filteredProducts.length}`}
          className={productGridClass}
          getKey={(product) => product.id || product.sku}
          renderItem={(product) => <ProductCard product={product} variant="tile" />}
        />
      ) : (
        /* Empty State */
        <div className="p-8 text-center bg-slate-800/40 rounded-3xl border border-slate-700/60 my-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Produk Tidak Ditemukan</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Coba sesuaikan kata kunci pencarian, tipe perangkat, atau reset filter yang sedang aktif.
            </p>
          </div>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md active:scale-95"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* Slide-Up / Bottom Drawer Filter Modal */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md max-h-[90vh] bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Filter & Saring Produk</h3>
              </div>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="overflow-y-auto p-4 space-y-4 text-xs">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Kategori Aksesoris HP
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, category: cat === 'Semua Kategori' ? 'All' : cat }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                        (filters.category === cat || (filters.category === 'All' && cat === 'Semua Kategori'))
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Merk / Brand Produsen
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {brands.map((b) => (
                    <button
                      key={b}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, brand: b === 'Semua Merk' ? 'All' : b }))
                      }
                      className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                        (filters.brand === b || (filters.brand === 'All' && b === 'Semua Merk'))
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Positioning (Good/Better/Best) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Tingkatan Kualitas & Nilai
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['All', 'Good', 'Better', 'Best'].map((tier) => (
                    <button
                      key={tier}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, positioning: tier }))
                      }
                      className={`py-2 rounded-xl font-bold text-center transition-colors ${
                        filters.positioning === tier
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tier === 'All' ? 'Semua' : `Tier ${tier}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Stock Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Ketersediaan Stok Gudang
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { val: 'All', label: 'Semua Status' },
                    { val: 'In Stock', label: 'Stok Tersedia' },
                    { val: 'Low Stock', label: 'Stok Menipis' },
                    { val: 'Pre-Order', label: 'Pre-Order' },
                  ].map((status) => (
                    <button
                      key={status.val}
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, stockStatus: status.val }))
                      }
                      className={`py-2 px-3 rounded-xl font-bold text-left transition-colors flex items-center justify-between ${
                        filters.stockStatus === status.val
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{status.label}</span>
                      {filters.stockStatus === status.val && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Brackets */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Rentang Harga Eceran (HET)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Semua Harga', min: null, max: null },
                    { label: '< Rp 50.000', min: null, max: 50000 },
                    { label: 'Rp 50rb - 100rb', min: 50000, max: 100000 },
                    { label: 'Rp 100rb - 200rb', min: 100000, max: 200000 },
                    { label: '> Rp 200.000', min: 200000, max: null },
                  ].map((bracket, idx) => {
                    const isSelected =
                      filters.minPrice === bracket.min && filters.maxPrice === bracket.max;
                    return (
                      <button
                        key={idx}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            minPrice: bracket.min,
                            maxPrice: bracket.max,
                          }))
                        }
                        className={`py-2 px-3 rounded-xl font-bold text-left transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {bracket.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-800 flex items-center gap-2 bg-slate-900">
              <button
                onClick={resetFilters}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95"
              >
                Reset Filter
              </button>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg active:scale-95"
              >
                Terapkan Filter ({filteredProducts.length} Produk)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DesktopSplit>
  );
};
