import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser } from '../firebase/config';
import { Product, ProductFilterState, ViewMode, CanvasserProfile } from '../types/product';
import {
  subscribeToProducts,
  seedInitialCatalogIfEmpty,
  saveProduct,
  batchSaveProducts,
  deleteProductById,
  toggleProductActive,
} from '../firebase/productsService';

interface CatalogContextType {
  products: Product[];
  activeProducts: Product[];
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  compareList: Product[];
  addToCompare: (product: Product) => boolean;
  removeFromCompare: (skuOrId: string) => void;
  isInCompare: (skuOrId: string) => boolean;
  clearCompare: () => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  filters: ProductFilterState;
  setFilters: React.Dispatch<React.SetStateAction<ProductFilterState>>;
  resetFilters: () => void;
  user: User | null;
  isAdmin: boolean;
  canvasserProfile: CanvasserProfile;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  seedData: () => Promise<void>;
  saveProductItem: (product: Product) => Promise<string>;
  batchSaveProductItems: (products: Product[]) => Promise<number>;
  toggleActiveItem: (id: string, current: boolean) => Promise<void>;
  deleteProductItem: (id: string) => Promise<void>;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const defaultFilters: ProductFilterState = {
  searchQuery: '',
  category: 'All',
  brand: 'All',
  minPrice: null,
  maxPrice: null,
  stockStatus: 'All',
  isProductFocus: null,
  isBestSeller: null,
  positioning: 'All',
  compatibilityVehicle: '',
  sortBy: 'featured',
};

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return (localStorage.getItem('partshop_view_mode') as ViewMode) || 'sales';
  });
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<ProductFilterState>(defaultFilters);
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Profil Canvasser / Motoris
  const canvasserProfile: CanvasserProfile = useMemo(() => {
    return {
      name: user?.displayName || 'Jefry Erlangga (Motoris Unit 04)',
      email: user?.email || 'Jefryerlangga@gmail.com',
      role: 'motoris',
      territory: 'Rute Jakarta Barat & Pusat - Motoris 04 (Aksesoris HP)',
      dailyTargetVisit: 14,
    };
  }, [user]);

  // Admin access condition
  const isAdmin = useMemo<boolean>(() => {
    if (!user) {
      // Allow preview admin features if running locally or demo, but strictly check email for full writes
      return true;
    }
    const adminEmails = ['jefryerlangga@gmail.com'];
    return Boolean(
      adminEmails.includes(user.email?.toLowerCase() || '') ||
      (user.email && user.email.endsWith('@admin.partshop.com'))
    );
  }, [user]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('partshop_view_mode', mode);
  };

  const toggleViewMode = () => {
    const next = viewMode === 'sales' ? 'customer' : 'sales';
    setViewMode(next);
  };

  // Auth observer
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubAuth();
  }, []);

  // Real-time Firestore sync & Initial Seeding
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initCatalog() {
      try {
        setLoading(true);
        // Seed if empty
        await seedInitialCatalogIfEmpty();

        const unsub = await subscribeToProducts(
          (items) => {
            setProducts(items);
            setLoading(false);
          },
          (err) => {
            console.error('Subscription error:', err);
            setError(err.message);
            setLoading(false);
          }
        );
        unsubscribe = unsub;
      } catch (err: any) {
        console.error('Failed to init catalog:', err);
        setError(err?.message || 'Database connection error');
        setLoading(false);
      }
    }

    initCatalog();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.isActive !== false);
  }, [products]);

  const addToCompare = (product: Product): boolean => {
    if (compareList.some((p) => (p.id || p.sku) === (product.id || product.sku))) {
      return false;
    }
    if (compareList.length >= 3) {
      // Replaced window.alert with smooth non-blocking limit
      return false;
    }
    setCompareList([...compareList, product]);
    return true;
  };

  const removeFromCompare = (skuOrId: string) => {
    setCompareList(compareList.filter((p) => p.id !== skuOrId && p.sku !== skuOrId));
  };

  const isInCompare = (skuOrId: string) => {
    return compareList.some((p) => p.id === skuOrId || p.sku === skuOrId);
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const login = async () => {
    await loginWithGoogle();
  };

  const logout = async () => {
    await logoutUser();
  };

  const seedData = async () => {
    setLoading(true);
    await seedInitialCatalogIfEmpty();
    setLoading(false);
  };

  const saveProductItem = async (prod: Product) => {
    return await saveProduct(prod);
  };

  const batchSaveProductItems = async (items: Product[]) => {
    return await batchSaveProducts(items);
  };

  const toggleActiveItem = async (id: string, current: boolean) => {
    await toggleProductActive(id, current);
  };

  const deleteProductItem = async (id: string) => {
    await deleteProductById(id);
  };

  return (
    <CatalogContext.Provider
      value={{
        products,
        activeProducts,
        loading,
        error,
        viewMode,
        setViewMode,
        toggleViewMode,
        compareList,
        addToCompare,
        removeFromCompare,
        isInCompare,
        clearCompare,
        selectedProduct,
        setSelectedProduct,
        filters,
        setFilters,
        resetFilters,
        user,
        isAdmin,
        canvasserProfile,
        login,
        logout,
        seedData,
        saveProductItem,
        batchSaveProductItems,
        toggleActiveItem,
        deleteProductItem,
        currentTab,
        setCurrentTab,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};
