import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { accountRoleLabel, isApprovedAccountRole, isStoredAccountRole, type AssignableAccountRole } from '../config/accountRole';
import { APP_NAME, isStorefrontProduct } from '../config/app';
import type { CatalogTier } from '../config/pricing';
import { BatchSaveProgress } from '../firebase/catalogBatch';
import { clearCatalogCache, fetchAuthorizedCatalog, readCatalogCache, writeCatalogCache } from '../lib/publicCatalog';
import type { StorePromo } from '../lib/promo';
import {
  auth,
  db,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
} from '../firebase/config';
import { buildWhatsAppOrderLink, createOrder } from '../firebase/ordersService';
import { priceCart } from '../firebase/orderPricing';
import { applyDealerCost } from '../firebase/productRecord';
import {
  SAMPLE_PRODUCTS,
  batchSaveProducts,
  deleteProductById,
  saveProduct,
  seedInitialCatalogIfEmpty,
  subscribeToProductAdmin,
  subscribeToProducts,
  toggleProductActive,
} from '../firebase/productsService';
import { ensureUserProfile, resolveIsAdmin, setUserRole, subscribeToUsers, updateCustomerPhone } from '../firebase/usersService';
import {
  CanvasserProfile,
  CartItem,
  Order,
  Product,
  ProductFilterState,
  UserProfile,
  ViewMode,
} from '../types/product';

interface CatalogContextType {
  products: Product[];
  activeProducts: Product[];
  usingPreviewCatalog: boolean;
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
  userProfile: UserProfile | null;
  authReady: boolean;
  isAdmin: boolean;
  gate: 'loading' | 'signed-out' | 'pending' | 'rejected' | 'ready';
  priceTier: CatalogTier | null;
  promo: StorePromo | null;
  profileError: string | null;
  accountDirectory: UserProfile[];
  pendingCount: number;
  accountLabel: string;
  setAccountRole: (uid: string, role: AssignableAccountRole) => Promise<void>;
  canvasserProfile: CanvasserProfile;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
  login: () => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  seedData: () => Promise<{ seeded: number; existing: number }>;
  saveProductItem: (product: Product) => Promise<string>;
  batchSaveProductItems: (
    products: Product[],
    onProgress?: (progress: BatchSaveProgress) => void
  ) => Promise<number>;
  toggleActiveItem: (id: string, current: boolean) => Promise<void>;
  deleteProductItem: (id: string) => Promise<void>;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (product: Product, qty?: number) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  checkout: (input: { customerPhone: string; note?: string; openWhatsApp?: boolean }) => Promise<{
    order: Order;
    whatsAppLink: string | null;
  }>;
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
  promoOnly: false,
  positioning: 'All',
  compatibilityVehicle: '',
  sortBy: 'featured',
};

const CART_STORAGE_KEY = 'portaltech_cart_v1';

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is CartItem => {
        if (!value || typeof value !== 'object') return false;
        const item = value as Partial<CartItem>;
        return (
          typeof item.productId === 'string' &&
          typeof item.sku === 'string' &&
          typeof item.name === 'string' &&
          typeof item.brand === 'string' &&
          typeof item.imageUrl === 'string' &&
          typeof item.quantity === 'number' &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 99
        );
      })
      .slice(0, 10)
      .map((item) => ({
        ...item,
        unitPrice: Number.isFinite(item.unitPrice) ? item.unitPrice : 0,
      }));
  } catch {
    return [];
  }
}

function requireAdmin(isAdmin: boolean) {
  if (!isAdmin) {
    throw new Error('Hanya master admin terverifikasi yang dapat mengubah katalog');
  }
}

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [adminCosts, setAdminCosts] = useState<Record<string, number>>({});
  const [usingPreviewCatalog, setUsingPreviewCatalog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>('customer');
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<ProductFilterState>(defaultFilters);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [promo, setPromo] = useState<StorePromo | null>(null);
  const [accountDirectory, setAccountDirectory] = useState<UserProfile[]>([]);
  const [currentTab, setCurrentTabState] = useState<string>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => loadCart());

  const isAdmin = useMemo<boolean>(() => resolveIsAdmin(user), [user]);
  const priceTier = useMemo<CatalogTier | null>(() => {
    if (isAdmin) return 'grosir';
    if (userProfile?.role === 'end_user') return 'end_user';
    if (userProfile?.role === 'grosir' || userProfile?.role === 'customer') return 'grosir';
    return null;
  }, [isAdmin, userProfile]);
  const gate = useMemo<'loading' | 'signed-out' | 'pending' | 'rejected' | 'ready'>(() => {
    if (!authReady) return 'loading';
    if (!user) return 'signed-out';
    if (isAdmin) return 'ready';
    if (!userProfile) return profileError ? 'pending' : 'loading';
    if (userProfile.role === 'rejected') return 'rejected';
    if (isApprovedAccountRole(userProfile.role)) return 'ready';
    return 'pending';
  }, [authReady, user, isAdmin, userProfile, profileError]);
  const pendingCount = useMemo(
    () => accountDirectory.filter((entry) => entry.role === 'pending').length,
    [accountDirectory]
  );
  const accountLabel = accountRoleLabel(userProfile?.role, isAdmin);

  const canvasserProfile: CanvasserProfile = useMemo(() => {
    return {
      name: user?.displayName || userProfile?.displayName || APP_NAME,
      email: user?.email || userProfile?.email || '',
      role: isAdmin ? 'admin' : 'customer',
      territory: `${APP_NAME} — Katalog Aksesoris HP`,
      dailyTargetVisit: 0,
    };
  }, [user, userProfile, isAdmin]);

  const setViewMode = (mode: ViewMode) => {
    if (mode === 'sales' && !isAdmin) return;
    setViewModeState(mode);
  };

  const toggleViewMode = () => {
    if (!isAdmin) {
      setViewModeState('customer');
      return;
    }
    setViewModeState(viewMode === 'sales' ? 'customer' : 'sales');
  };

  const setCurrentTab = useCallback(
    (tab: string) => {
      if (tab === 'admin' && !isAdmin) {
        if (!user) setShowAuthModal(true);
        return;
      }
      setCurrentTabState(tab);
    },
    [isAdmin, user]
  );

  useEffect(() => {
    if (!isAdmin && viewMode === 'sales') {
      setViewModeState('customer');
    }
  }, [isAdmin, viewMode]);

  useEffect(() => {
    if (!isAdmin && currentTab === 'admin') {
      setCurrentTabState('home');
    }
  }, [isAdmin, currentTab]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profile = await ensureUserProfile(firebaseUser);
          setUserProfile(profile);
          setProfileError(null);
        } catch (err) {
          console.error('Failed to ensure user profile:', err);
          setUserProfile(null);
          setProfileError('Pendaftaran akun belum tersimpan. Coba masuk lagi, atau minta admin memeriksa aturan Firestore.');
        }
      } else {
        setUserProfile(null);
        setProfileError(null);
        setPromo(null);
        setProducts([]);
      }
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Partial<UserProfile>;
        setUserProfile({
          uid: user.uid,
          email: typeof data.email === 'string' ? data.email : user.email || '',
          displayName: typeof data.displayName === 'string' ? data.displayName : user.displayName || 'Pelanggan',
          photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
          role: isStoredAccountRole(data.role) ? data.role : 'pending',
          phone: typeof data.phone === 'string' ? data.phone : '',
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        });
        setProfileError(null);
      },
      () => undefined
    );
  }, [user]);

  useEffect(() => {
    if (!isAdmin) {
      setAccountDirectory([]);
      return;
    }
    return subscribeToUsers(setAccountDirectory, () => setAccountDirectory([]));
  }, [isAdmin]);

  useEffect(() => {
    if (!authReady) return;
    let unsubscribe: (() => void) | null = null;
    let active = true;

    const showSamples = (message: string) => {
      if (!active) return;
      setProducts(SAMPLE_PRODUCTS);
      setUsingPreviewCatalog(true);
      setError(message);
      setLoading(false);
    };

    async function loadPromo(firebaseUser: User) {
      try {
        const token = await firebaseUser.getIdToken();
        const catalog = await fetchAuthorizedCatalog(token);
        if (!active) return;
        setPromo(catalog.promo);
      } catch {
        if (active) setPromo(null);
      }
    }

    async function loadAdminCatalog() {
      if (!user) return;
      try {
        setLoading(true);
        const unsub = await subscribeToProducts(
          (items) => {
            if (!active) return;
            if (items.length === 0) {
              setProducts(SAMPLE_PRODUCTS);
              setUsingPreviewCatalog(true);
            } else {
              setProducts(items);
              setUsingPreviewCatalog(false);
              setError(null);
            }
            setLoading(false);
          },
          (err) => {
            if (!active) return;
            console.error('Subscription error:', err);
            showSamples('Katalog Firestore tidak dapat dimuat. Menampilkan sampel lokal. Checkout dimatikan.');
          }
        );
        unsubscribe = unsub;
        await loadPromo(user);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Database connection error';
        showSamples(message);
      }
    }

    async function loadApprovedCatalog() {
      if (!user || !priceTier) return;
      const cached = readCatalogCache(user.uid, priceTier);
      if (cached) {
        setProducts(cached.products);
        setPromo(cached.promo);
        setUsingPreviewCatalog(false);
        setLoading(false);
      } else {
        setProducts([]);
        setPromo(null);
        setLoading(true);
      }
      try {
        const token = await user.getIdToken();
        const catalog = await fetchAuthorizedCatalog(token);
        if (!active) return;
        if (catalog.tier !== priceTier) return;
        setProducts(catalog.products);
        setPromo(catalog.promo);
        setUsingPreviewCatalog(false);
        setError(null);
        writeCatalogCache(user.uid, catalog.tier, catalog.products, catalog.promo);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        if (cached) {
          setError('Katalog online belum bisa dimuat. Menampilkan salinan tersimpan.');
        } else {
          setProducts([]);
          setPromo(null);
          setError(err instanceof Error ? err.message : 'Katalog tidak dapat dimuat');
        }
        setUsingPreviewCatalog(false);
        setLoading(false);
      }
    }

    if (!user || gate === 'signed-out' || gate === 'pending' || gate === 'rejected') {
      setProducts([]);
      setPromo(null);
      setUsingPreviewCatalog(false);
      setError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    if (isAdmin) {
      loadAdminCatalog();
    } else if (gate === 'ready') {
      loadApprovedCatalog();
    }

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [authReady, isAdmin, user, gate, priceTier]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminCosts({});
      return;
    }
    if (usingPreviewCatalog) {
      setAdminCosts({});
      return;
    }
    return subscribeToProductAdmin(setAdminCosts, () => setAdminCosts({}));
  }, [isAdmin, usingPreviewCatalog]);

  useEffect(() => {
    if (usingPreviewCatalog) return;
    setCart((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        if (!product) return item;
        if (
          item.unitPrice === product.suggestedRetailPrice &&
          item.name === product.name &&
          item.sku === product.sku
        ) {
          return item;
        }
        changed = true;
        return {
          ...item,
          unitPrice: product.suggestedRetailPrice,
          name: product.name,
          sku: product.sku,
          brand: product.brand,
          imageUrl: product.imageUrl,
        };
      });
      return changed ? next : prev;
    });
  }, [products, usingPreviewCatalog]);

  const catalogProducts = useMemo(
    () => products.map((product) => applyDealerCost(product, adminCosts, isAdmin)),
    [products, adminCosts, isAdmin]
  );

  const activeProducts = useMemo(() => {
    return catalogProducts.filter(
      (product) => product.isActive !== false && isStorefrontProduct(product.category)
    );
  }, [catalogProducts]);

  useEffect(() => {
    setCompareList((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((item) => {
        const fresh = catalogProducts.find(
          (product) => (product.id || product.sku) === (item.id || item.sku)
        );
        if (!fresh) return item;
        changed = true;
        return fresh;
      });
      return changed ? next : prev;
    });
    setSelectedProduct((current) => {
      if (!current) return current;
      return (
        catalogProducts.find(
          (product) => (product.id || product.sku) === (current.id || current.sku)
        ) ?? current
      );
    });
  }, [catalogProducts]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartTotal = useMemo(() => {
    if (usingPreviewCatalog) {
      return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    }
    try {
      return priceCart(cart, catalogProducts).total;
    } catch {
      return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    }
  }, [cart, catalogProducts, usingPreviewCatalog]);

  const addToCompare = (product: Product): boolean => {
    if (compareList.some((entry) => (entry.id || entry.sku) === (product.id || product.sku))) {
      return false;
    }
    if (compareList.length >= 3) return false;
    setCompareList([...compareList, product]);
    return true;
  };

  const removeFromCompare = (skuOrId: string) => {
    setCompareList(compareList.filter((entry) => entry.id !== skuOrId && entry.sku !== skuOrId));
  };

  const isInCompare = (skuOrId: string) => {
    return compareList.some((entry) => entry.id === skuOrId || entry.sku === skuOrId);
  };

  const clearCompare = () => setCompareList([]);
  const resetFilters = () => setFilters(defaultFilters);

  const login = async () => {
    await loginWithGoogle();
  };

  const loginEmailFn = async (email: string, password: string) => {
    await loginWithEmail(email, password);
  };

  const registerEmailFn = async (email: string, password: string, displayName: string) => {
    await registerWithEmail(email, password, displayName);
  };

  const logout = async () => {
    clearCatalogCache();
    await logoutUser();
    setUserProfile(null);
    setProfileError(null);
    setPromo(null);
    setProducts([]);
    setViewModeState('customer');
  };

  const setAccountRole = async (uid: string, role: AssignableAccountRole) => {
    requireAdmin(isAdmin);
    await setUserRole(uid, role);
  };

  const seedData = async () => {
    requireAdmin(isAdmin);
    return seedInitialCatalogIfEmpty();
  };

  const saveProductItem = async (prod: Product) => {
    requireAdmin(isAdmin);
    return saveProduct(prod);
  };

  const batchSaveProductItems = async (
    items: Product[],
    onProgress?: (progress: BatchSaveProgress) => void
  ) => {
    requireAdmin(isAdmin);
    return batchSaveProducts(items, onProgress);
  };

  const toggleActiveItem = async (id: string, current: boolean) => {
    requireAdmin(isAdmin);
    await toggleProductActive(id, current);
  };

  const deleteProductItem = async (id: string) => {
    requireAdmin(isAdmin);
    await deleteProductById(id);
  };

  const addToCart = (product: Product, qty = 1) => {
    if (product.isActive === false || product.stockStatus === 'Out of Stock') return;
    const productId = product.id || product.sku;
    const quantity = Math.max(1, Math.min(99, Math.floor(qty)));
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
            : item
        );
      }
      if (prev.length >= 10) return prev;
      return [
        ...prev,
        {
          productId,
          sku: product.sku,
          name: product.name,
          brand: product.brand,
          imageUrl: product.imageUrl,
          unitPrice: product.suggestedRetailPrice,
          quantity,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, Math.min(99, Math.floor(quantity))) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const checkout = async (input: {
    customerPhone: string;
    note?: string;
    openWhatsApp?: boolean;
  }) => {
    if (!user || !user.email) {
      setShowAuthModal(true);
      throw new Error('Silakan masuk terlebih dahulu untuk checkout');
    }
    if (usingPreviewCatalog) {
      throw new Error('Checkout membutuhkan katalog Firestore. Sampel lokal tidak bisa dipesan.');
    }

    const order = await createOrder({
      userId: user.uid,
      customerName: user.displayName || userProfile?.displayName || 'Pelanggan',
      customerEmail: user.email,
      customerPhone: input.customerPhone,
      cart,
      catalog: catalogProducts,
      note: input.note,
    });

    await updateCustomerPhone(user.uid, order.customerPhone).catch(() => undefined);
    clearCart();

    const whatsAppLink = input.openWhatsApp === false ? null : buildWhatsAppOrderLink(order);
    if (whatsAppLink) {
      window.open(whatsAppLink, '_blank', 'noopener,noreferrer');
    }
    return { order, whatsAppLink };
  };

  return (
    <CatalogContext.Provider
      value={{
        products: catalogProducts,
        activeProducts,
        usingPreviewCatalog,
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
        userProfile,
        authReady,
        isAdmin,
        gate,
        priceTier,
        promo,
        profileError,
        accountDirectory,
        pendingCount,
        accountLabel,
        setAccountRole,
        canvasserProfile,
        showAuthModal,
        setShowAuthModal,
        login,
        loginEmail: loginEmailFn,
        registerEmail: registerEmailFn,
        logout,
        seedData,
        saveProductItem,
        batchSaveProductItems,
        toggleActiveItem,
        deleteProductItem,
        currentTab,
        setCurrentTab,
        cart,
        cartCount,
        cartTotal,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        checkout,
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
