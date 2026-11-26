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
import { PromoPage } from './pages/PromoPage';
import { ComparePage } from './pages/ComparePage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { AdminPage } from './pages/AdminPage';
import { CartPage } from './pages/CartPage';
import { BatteryPage } from './pages/BatteryPage';
import { ExampleReportsPage, ReportsPage } from './pages/ReportsPage';
import { RefreshCw } from 'lucide-react';
import { AccessGate } from './components/AccessGate';
import { AnalyticsBinder } from './components/AnalyticsBinder';
import { ScrollTopButton } from './components/ScrollTopButton';

const AppContent: React.FC = () => {
  const { currentTab, selectedProduct, setSelectedProduct, loading, error, isAdmin, usingPreviewCatalog, gate, catalogMode } = useCatalog();
  const lightShell = !['admin', 'laporan', 'ai', 'compare'].includes(currentTab);

  if (gate !== 'ready') {
    return <AccessGate />;
  }

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'home':
        return catalogMode === 'baterai' ? <BatteryPage /> : <HomePage />;
      case 'search':
        return catalogMode === 'baterai' ? <BatteryPage /> : <SearchCatalogPage />;
      case 'categories':
        return catalogMode === 'baterai' ? <BatteryPage /> : <CategoriesPage />;
      case 'focus':
        return catalogMode === 'baterai' ? <BatteryPage /> : <ProductFocusPage />;
      case 'bestseller':
        return catalogMode === 'baterai' ? <BatteryPage /> : <BestSellerPage />;
      case 'promo':
        return <PromoPage />;
      case 'compare':
        return <ComparePage />;
      case 'ai':
        return <AiAssistantPage />;
      case 'cart':
        return <CartPage />;
      case 'admin':
        return isAdmin ? <AdminPage /> : <HomePage />;
      case 'laporan':
        return isAdmin ? <ReportsPage /> : <HomePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-[#0B1B3A] selection:text-white ${lightShell ? 'bg-[#f5f5f5] text-slate-900' : 'bg-slate-950 text-slate-100'}`}>
      <AnalyticsBinder />
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
      <ScrollTopButton />

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

function contohLaporanRequested(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('contoh-laporan') === '1';
}

export default function App() {
  if (contohLaporanRequested()) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <main className="max-w-md w-full mx-auto p-3">
          <ExampleReportsPage />
        </main>
      </div>
    );
  }
  return (
    <CatalogProvider>
      <AppContent />
    </CatalogProvider>
  );
}
