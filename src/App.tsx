import React from 'react';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';
import { SearchCatalogPage } from './pages/SearchCatalogPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductFocusPage } from './pages/ProductFocusPage';
import { BestSellerPage } from './pages/BestSellerPage';
import { ComparePage } from './pages/ComparePage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { AdminPage } from './pages/AdminPage';
import { CartPage } from './pages/CartPage';
import { RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentTab, selectedProduct, setSelectedProduct, loading, error, isAdmin, usingPreviewCatalog } = useCatalog();

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'home':
        return <HomePage />;
      case 'search':
        return <SearchCatalogPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'focus':
        return <ProductFocusPage />;
      case 'bestseller':
        return <BestSellerPage />;
      case 'compare':
        return <ComparePage />;
      case 'ai':
        return <AiAssistantPage />;
      case 'cart':
        return <CartPage />;
      case 'admin':
        return isAdmin ? <AdminPage /> : <HomePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Fixed Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-3 overflow-x-hidden">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-blue-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Menyinkronkan data katalog Firestore...</span>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs">
            <p className="font-bold">Catatan Katalog</p>
            <p className="text-[11px] text-amber-300/90 mt-0.5">{error}</p>
          </div>
        )}

        {usingPreviewCatalog && !error && (
          <div className="mb-3 p-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 text-xs">
            <p className="font-bold text-white">Sampel lokal aksesoris HP</p>
            <p className="text-[11px] mt-0.5">
              Firestore belum berisi produk, jadi etalase memakai sampel di aplikasi. Sampel tidak ditulis otomatis dan tidak bisa di-checkout.
            </p>
          </div>
        )}

        {renderCurrentView()}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav />

      {/* Detail Modal / Sheet */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <CatalogProvider>
      <AppContent />
    </CatalogProvider>
  );
}
