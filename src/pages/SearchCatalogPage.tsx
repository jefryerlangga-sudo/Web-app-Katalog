import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Flame,
  Trophy,
  RotateCcw,
  Check,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from '../components/ProductCard';

export const SearchCatalogPage: React.FC = () => {
  const { activeProducts, filters, setFilters, resetFilters, viewMode } = useCatalog();
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

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
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesSku = product.sku.toLowerCase().includes(query);
        const matchesCategory = product.category.toLowerCase().includes(query);
        const matchesSubcategory = product.subcategory.toLowerCase().includes(query);
        const matchesCompatibility = product.compatibility.toLowerCase().includes(query);
        const matchesBrand = product.brand.toLowerCase().includes(query);
        const matchesSpecs = product.specification.toLowerCase().includes(query);
        const matchesSellingPoints =
          product.sellingPoint1.toLowerCase().includes(query) ||
          product.sellingPoint2.toLowerCase().includes(query) ||
          product.sellingPoint3.toLowerCase().includes(query);

        if (
          !matchesName &&
          !matchesSku &&
          !matchesCategory &&
          !matchesSubcategory &&
          !matchesCompatibility &&
          !matchesBrand &&
          !matchesSpecs &&
          !matchesSellingPoints
        ) {
          return false;
        }
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
      if (filters.sortBy === 'margin-desc') {
        const marginA = a.suggestedRetailPrice - a.wholesalePrice;
        const marginB = b.suggestedRetailPrice - b.wholesalePrice;
        return marginB - marginA;
      }
      // default: featured (Product Focus and Best Seller first)
      if (a.isProductFocus && !b.isProductFocus) return -1;
      if (!a.isProductFocus && b.isProductFocus) return 1;
      return 0;
    });
  }, [activeProducts, filters]);

  return (
    <div className="space-y-3 pb-20">
      {/* Sticky Search Header */}
      <div className="sticky top-[53px] z-20 bg-slate-900/95 backdrop-blur-md pt-1 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
              }
              placeholder="Cari SKU, nama produk, tipe HP (cth: iPhone, Type-C)..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-9 pr-9 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-inner"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Drawer Toggle Button */}
          <button
            onClick={() => setShowFilterDrawer(true)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
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

        {/* Quick Filter Horizontal Scroll Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
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
      </div>

      {/* Results Header with Sorting */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span className="font-semibold">
          Menampilkan <strong className="text-white font-mono">{filteredProducts.length}</strong> produk
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
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id || product.sku} product={product} />
          ))}
        </div>
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
  );
};
