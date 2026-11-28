import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CatalogContext } from '../context/CatalogContext';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { SearchCatalogPage } from '../pages/SearchCatalogPage';
import { BatteryPage } from '../pages/BatteryPage';
import { HomePage } from '../pages/HomePage';
import { catalogModeFromPath, type CatalogMode } from '../lib/catalogKind';
import { Product, ProductFilterState } from '../types/product';

const filters0: ProductFilterState = {
  searchQuery: '',
  category: 'All',
  brand: 'All',
  minPrice: null,
  maxPrice: null,
  stockStatus: 'All',
  isProductFocus: null,
  isBestSeller: null,
  promoOnly: false,
  positioning: 'All',
  compatibilityVehicle: '',
  sortBy: 'featured',
};

function sample(partial: Pick<Product, 'sku' | 'name' | 'brand' | 'compatibility'> & Partial<Product>): Product {
  return {
    category: 'Audio & TWS Earbuds',
    subcategory: 'Umum',
    imageUrl: '',
    specification: '',
    sellingPoint1: '',
    sellingPoint2: '',
    sellingPoint3: '',
    suggestedRetailPrice: 100000,
    stockStatus: 'In Stock',
    positioning: 'Good',
    targetCustomer: 'Konter',
    isProductFocus: false,
    isBestSeller: false,
    crossSellNotes: '',
    isActive: true,
    ...partial,
    id: partial.sku,
  };
}

const products: Product[] = [
  sample({ sku: 'PS-OLI-0591', name: 'Olike SV16 Speaker Bluetooth', brand: 'Olike', compatibility: 'HP Android', suggestedRetailPrice: 199000 }),
  sample({ sku: 'SPK-BRAND', name: 'Kabel Data Anyam', brand: 'SpeakerHouse', compatibility: 'Type-C', category: 'Kabel Data & Charging' }),
  sample({ sku: 'HOLD-1', name: 'Holder Dashboard', brand: 'Baseus', compatibility: 'Speaker mini di mobil', category: 'Holder & Mount HP' }),
  sample({ sku: 'LED-1', name: 'Advance LED Sensor Lighting P300E', brand: 'Advance', compatibility: 'Rumah', category: 'Lainnya', suggestedRetailPrice: 265000 }),
  sample({ sku: 'STB-1', name: 'Advance SET TOP BOX STP-A01 V.3 Black', brand: 'Advance', compatibility: 'TV', category: 'Lainnya', suggestedRetailPrice: 165000 }),
  sample({ sku: 'PS-BOG-0001', name: 'Baterai OG BL-49FX Infinix Smart 5/6/Hot 9', brand: 'OG', compatibility: 'Infinix Smart 5/6/Hot 9', category: 'Baterai', subcategory: 'Infinix', specification: 'BL-49FX', suggestedRetailPrice: 110000 }),
  sample({ sku: 'PS-BHX-0001', name: 'Baterai HX BN-5V Vivo', brand: 'HX', compatibility: 'Vivo', category: 'Baterai', subcategory: 'Vivo', specification: 'BN-5V', suggestedRetailPrice: 90000 }),
  sample({ sku: 'PS-BLF-0001', name: 'Baterai LF iPhone 11', brand: 'LF', compatibility: 'iPhone 11', category: 'Baterai', subcategory: 'iPhone', specification: '-', suggestedRetailPrice: 180000 }),
  ...Array.from({ length: 8 }, (_, index) => sample({
    sku: `FILL-${index}`,
    name: `Produk pengisi ${index}`,
    brand: 'Umum',
    compatibility: 'HP',
    suggestedRetailPrice: 50000 + index,
  })),
];

function Harness() {
  const [filters, setFilters] = useState(filters0);
  const [currentTab, setCurrentTab] = useState('home');
  const [catalogMode, setCatalogModeState] = useState<CatalogMode>(() => catalogModeFromPath(window.location.pathname));
  const setCatalogMode = (mode: CatalogMode) => {
    setCatalogModeState(mode);
    setFilters((prev) => ({ ...prev, searchQuery: '' }));
    setCurrentTab('home');
    const path = mode === 'baterai' ? '/baterai' : '/';
    const search = window.location.search || '?contoh-cari=1';
    if (window.location.pathname !== path) window.history.pushState({}, '', `${path}${search}`);
  };
  const value = {
    products,
    activeProducts: products.filter((item) => item.category !== 'Baterai'),
    batteryProducts: products.filter((item) => item.category === 'Baterai'),
    catalogMode,
    setCatalogMode,
    usingPreviewCatalog: false,
    loading: false,
    error: null,
    viewMode: 'customer' as const,
    setViewMode: () => undefined,
    toggleViewMode: () => undefined,
    compareList: [],
    addToCompare: () => false,
    removeFromCompare: () => undefined,
    isInCompare: () => false,
    clearCompare: () => undefined,
    selectedProduct: null,
    setSelectedProduct: () => undefined,
    filters,
    setFilters,
    resetFilters: () => setFilters(filters0),
    user: { displayName: 'Toko', email: 'toko@example.com' },
    userProfile: null,
    authReady: true,
    isAdmin: true,
    gate: 'ready' as const,
    priceTier: 'grosir' as const,
    promo: { id: 'p', title: 'List Barang Promo', active: true, minPurchase: 0, brands: [], terms: [], items: [] },
    profileError: null,
    accountDirectory: [],
    pendingCount: 0,
    accountLabel: 'Master Admin',
    setAccountRole: async () => undefined,
    syncCatalog: async () => undefined,
    canvasserProfile: { name: 'Toko', email: '', role: 'admin' as const, territory: '', dailyTargetVisit: 0 },
    showAuthModal: false,
    setShowAuthModal: () => undefined,
    accountOpen: false,
    setAccountOpen: () => undefined,
    login: async () => undefined,
    loginEmail: async () => undefined,
    registerEmail: async () => undefined,
    logout: async () => undefined,
    seedData: async () => ({ seeded: 0, existing: 0 }),
    saveProductItem: async () => '',
    batchSaveProductItems: async () => 0,
    toggleActiveItem: async () => undefined,
    deleteProductItem: async () => undefined,
    currentTab,
    setCurrentTab,
    cart: [],
    cartCount: 0,
    cartTotal: 0,
    addToCart: () => undefined,
    updateCartQty: () => undefined,
    removeFromCart: () => undefined,
    clearCart: () => undefined,
    checkout: async () => ({ order: {} as never, whatsAppLink: null }),
  };

  return (
    <CatalogContext.Provider value={value as unknown as NonNullable<React.ComponentProps<typeof CatalogContext.Provider>['value']>}>
      <div className="min-h-screen bg-[#f5f5f5] text-slate-900">
        <Header />
        <main className="max-w-md lg:max-w-[1400px] mx-auto p-3 lg:px-6">
          {catalogMode === 'baterai' ? (
            <BatteryPage />
          ) : currentTab === 'search' ? (
            <SearchCatalogPage />
          ) : (
            <HomePage />
          )}
        </main>
        <BottomNav />
      </div>
    </CatalogContext.Provider>
  );
}

export function renderSearchHarness() {
  createRoot(document.getElementById('root')!).render(<Harness />);
}
