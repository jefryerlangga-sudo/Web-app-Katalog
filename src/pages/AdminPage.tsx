import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Power,
  RotateCcw,
  Save,
  FileSpreadsheet,
} from 'lucide-react';
import { Product, StockStatus, PositioningTier } from '../types/product';
import { useCatalog } from '../context/CatalogContext';
import { ExcelImportModal } from '../components/ExcelImportModal';

export const AdminPage: React.FC = () => {
  const {
    products,
    saveProductItem,
    toggleActiveItem,
    deleteProductItem,
    seedData,
    loading,
  } = useCatalog();

  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const initialNewProduct: Partial<Product> = {
    sku: '',
    name: '',
    brand: '',
    category: 'Charger & Adapter',
    subcategory: '',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600',
    specification: '',
    compatibility: '',
    sellingPoint1: '',
    sellingPoint2: '',
    sellingPoint3: '',
    wholesalePrice: 45000,
    suggestedRetailPrice: 75000,
    stockStatus: 'In Stock',
    positioning: 'Better',
    targetCustomer: 'Konter HP dan toko aksesoris retail',
    isProductFocus: false,
    isBestSeller: false,
    crossSellNotes: '',
    isActive: true,
  };

  const handleOpenCreate = () => {
    setEditingProduct({ ...initialNewProduct });
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct({ ...product });
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.sku || !editingProduct.name) {
      return;
    }

    setIsSubmitting(true);
    try {
      await saveProductItem(editingProduct as Product);
      setSuccessMessage(`Produk ${editingProduct.sku} berhasil disimpan!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Gagal menyimpan produk:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await toggleActiveItem(id, current);
    } catch (err) {
      console.error('Gagal mengubah status aktif:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteProductItem(id);
      setSuccessMessage(`Produk "${name}" telah dihapus.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Gagal menghapus produk:', err);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header and Add Action */}
      <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-3xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Panel Kelola Katalog</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-500/30">
                  Admin
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Tambah, ubah, aktifkan, dan nonaktifkan item katalog
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 rounded-2xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Excel / CSV</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-3 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Quick Seeder Button */}
        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          <span>Total Database: {products.length} SKU</span>
          <button
            onClick={seedData}
            disabled={loading}
            className="text-[11px] font-semibold text-blue-400 hover:text-white flex items-center gap-1 hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Muat Ulang Katalog Awal</span>
          </button>
        </div>
      </div>

      {/* Catalog Table / Mobile Cards */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Daftar Item Katalog ({products.length})
        </h2>

        <div className="space-y-2.5">
          {products.map((item) => (
            <div
              key={item.id || item.sku}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.isActive !== false
                  ? 'bg-slate-800/80 border-slate-700/80'
                  : 'bg-slate-900/60 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-700">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400';
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {item.sku}
                      </span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[11px] font-bold text-blue-400 truncate">
                        {item.brand}
                      </span>

                      {item.isProductFocus && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold">
                          Fokus
                        </span>
                      )}

                      {item.isBestSeller && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                          Terlaris
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-xs mt-0.5 truncate max-w-[200px]">
                      {item.name}
                    </h3>

                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Modal: Rp {item.wholesalePrice.toLocaleString('id-ID')} | HET: Rp{' '}
                      {item.suggestedRetailPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Status Toggle & Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(item.id || item.sku, item.isActive !== false)}
                    className={`p-1.5 rounded-xl border text-xs font-bold transition-colors ${
                      item.isActive !== false
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                    title={item.isActive !== false ? 'Aktif (Klik untuk Nonaktifkan)' : 'Nonaktif (Klik untuk Mengaktifkan)'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600"
                    title="Ubah Produk"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(item.id || item.sku, item.name)}
                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    title="Hapus Produk"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / Create Full Form Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div
            className="w-full max-w-lg max-h-[92vh] bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">
                {editingProduct.id ? `Ubah Produk: ${editingProduct.sku}` : 'Tambah Produk Aksesoris Baru'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Kode SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sku: e.target.value })
                    }
                    placeholder="cth: ACC-ANK-001"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Merk / Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.brand || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, brand: e.target.value })
                    }
                    placeholder="cth: Anker, Baseus, Robot"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Nama Produk Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  placeholder="cth: Anker Nano GaN 30W Fast Charger Type-C"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={editingProduct.category || 'Charger & Adapter'}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Charger & Adapter">Charger & Adapter</option>
                    <option value="Kabel Data & Charging">Kabel Data & Charging</option>
                    <option value="Audio & TWS Earbuds">Audio & TWS Earbuds</option>
                    <option value="Powerbank & Baterai">Powerbank & Baterai</option>
                    <option value="Tempered Glass & Pelindung">Tempered Glass & Pelindung</option>
                    <option value="Holder & Mount HP">Holder & Mount HP</option>
                    <option value="Casing & Aksesoris Proteksi">Casing & Aksesoris Proteksi</option>
                    <option value="Braking System">Braking System</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Subkategori *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.subcategory || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, subcategory: e.target.value })
                    }
                    placeholder="cth: Fast Charger GaN"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Modal Grosir (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.wholesalePrice ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        wholesalePrice: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    HET Eceran (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.suggestedRetailPrice ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        suggestedRetailPrice: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Tingkatan Tier *
                  </label>
                  <select
                    value={editingProduct.positioning || 'Better'}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        positioning: e.target.value as PositioningTier,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Good">Tier Good (Ekonomis)</option>
                    <option value="Better">Tier Better (Populer)</option>
                    <option value="Best">Tier Best (Premium)</option>
                  </select>
                </div>
              </div>

              {/* Stock Status & Image URL */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Status Ketersediaan
                  </label>
                  <select
                    value={editingProduct.stockStatus || 'In Stock'}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stockStatus: e.target.value as StockStatus,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="In Stock">Stok Tersedia</option>
                    <option value="Low Stock">Stok Menipis</option>
                    <option value="Pre-Order">Pre-Order</option>
                    <option value="Out of Stock">Stok Habis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Link Foto Produk
                  </label>
                  <input
                    type="url"
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                    }
                    placeholder="https://..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Compatibility */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Kecocokan Tipe HP / Perangkat *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.compatibility || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, compatibility: e.target.value })
                  }
                  placeholder="cth: iPhone 13/14/15/16, Samsung S24, Xiaomi, Universal Type-C"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Specifications */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Spesifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.specification || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, specification: e.target.value })
                  }
                  placeholder="Teknologi GaN, output watt, panjang kabel, material..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* 3 Selling Points */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-slate-400">
                  Tiga Poin Keunggulan Jualan (Pitch Hooks) *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.sellingPoint1 || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, sellingPoint1: e.target.value })
                  }
                  placeholder="Keunggulan 1 (cth: Garansi resmi 18 bulan ganti baru)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <input
                  type="text"
                  required
                  value={editingProduct.sellingPoint2 || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, sellingPoint2: e.target.value })
                  }
                  placeholder="Keunggulan 2 (cth: Fast charge 50% dalam 25 menit dingin)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <input
                  type="text"
                  required
                  value={editingProduct.sellingPoint3 || ''}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, sellingPoint3: e.target.value })
                  }
                  placeholder="Keunggulan 3 (cth: Laba konter tebal Rp 64.000 per unit)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Target Customer & Cross-sell */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Target Profil Toko / Pembeli
                  </label>
                  <input
                    type="text"
                    value={editingProduct.targetCustomer || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, targetCustomer: e.target.value })
                    }
                    placeholder="cth: Konter HP mall, toko aksesoris"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Catatan Paket Cross-Sell
                  </label>
                  <input
                    type="text"
                    value={editingProduct.crossSellNotes || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, crossSellNotes: e.target.value })
                    }
                    placeholder="cth: Kabel Type-C 100W, Pelindung Kabel"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Boolean Flags */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isProductFocus || false}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        isProductFocus: e.target.checked,
                      })
                    }
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-rose-300">Produk Fokus</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isBestSeller || false}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        isBestSeller: e.target.checked,
                      })
                    }
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-amber-300">Paling Laris</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isActive !== false}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        isActive: e.target.checked,
                      })
                    }
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-emerald-300">Aktif</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel / CSV Import Modal */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
};
