import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CatalogContext } from '../context/CatalogContext';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { SearchCatalogPage } from '../pages/SearchCatalogPage';
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
  const value = {
    products,
    activeProducts: products,
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
        <main className="max-w-md mx-auto p-3">
          {currentTab === 'search' ? <SearchCatalogPage /> : (
            <div className="h-[1400px] bg-white rounded-2xl border border-slate-200 p-4">Beranda contoh</div>
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
