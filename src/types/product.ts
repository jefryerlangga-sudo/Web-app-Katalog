export type StockStatus = 'In Stock' | 'Low Stock' | 'Pre-Order' | 'Out of Stock';
export type PositioningTier = 'Good' | 'Better' | 'Best';
export type ViewMode = 'sales' | 'customer';

export interface Product {
  id?: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  imageUrl: string;
  specification: string;
  compatibility: string;
  sellingPoint1: string;
  sellingPoint2: string;
  sellingPoint3: string;
  wholesalePrice: number; // For Canvasser / Dealer cost
  suggestedRetailPrice: number; // MSRP for retail workshop customer
  stockStatus: StockStatus;
  positioning: PositioningTier;
  targetCustomer: string;
  isProductFocus: boolean;
  isBestSeller: boolean;
  crossSellNotes: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFilterState {
  searchQuery: string;
  category: string;
  brand: string;
  minPrice: number | null;
  maxPrice: number | null;
  stockStatus: string;
  isProductFocus: boolean | null;
  isBestSeller: boolean | null;
  positioning: string;
  compatibilityVehicle: string;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'margin-desc';
}

export interface CanvasserProfile {
  name: string;
  email: string;
  role: 'canvasser' | 'motoris' | 'admin';
  territory: string;
  dailyTargetVisit: number;
}
