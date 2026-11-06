import React, { useState } from 'react';
import {
  Scale,
  Check,
  Flame,
  Trophy,
  Copy,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Product } from '../types/product';
import { useCatalog } from '../context/CatalogContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    viewMode,
    setSelectedProduct,
    addToCompare,
    removeFromCompare,
    isInCompare,
    compareList,
  } = useCatalog();

  const [copiedPitch, setCopiedPitch] = useState(false);

  const inCompare = isInCompare(product.id || product.sku);
  const compareFull = compareList.length >= 3 && !inCompare;

  // Margin calculation for Sales Mode
  const profit = Math.max(0, product.suggestedRetailPrice - product.wholesalePrice);
  const marginPercent =
    product.suggestedRetailPrice > 0
      ? Math.round((profit / product.suggestedRetailPrice) * 100)
      : 0;

  const handleCopyPitch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `*${product.name}* (SKU: ${product.sku})\n• Cocok untuk: ${product.compatibility}\n• Keunggulan: ${product.sellingPoint1}\n• HET Eceran: Rp ${product.suggestedRetailPrice.toLocaleString('id-ID')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(product.id || product.sku);
    } else {
      addToCompare(product);
    }
  };

  const tierColors = {
    Good: 'bg-slate-700/80 text-slate-200 border-slate-600',
    Better: 'bg-blue-600/80 text-white border-blue-400',
    Best: 'bg-amber-500/90 text-slate-950 font-extrabold border-amber-300',
  };

  const stockBadge = {
    'In Stock': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Low Stock': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Pre-Order': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'Out of Stock': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  }[product.stockStatus] || 'bg-slate-700 text-slate-300 border-slate-600';

  const stockLabel = {
    'In Stock': 'Stok Tersedia',
    'Low Stock': 'Stok Menipis',
    'Pre-Order': 'Pre-Order',
    'Out of Stock': 'Stok Habis',
  }[product.stockStatus] || product.stockStatus;

  return (
    <div
      onClick={() => setSelectedProduct(product)}
      className="group relative bg-slate-800/90 rounded-2xl border border-slate-700/80 p-3 shadow-md hover:border-slate-600 active:scale-[0.99] transition-all flex flex-col gap-2.5 cursor-pointer overflow-hidden"
    >
      {/* Top Media & Badges Row */}
      <div className="flex gap-3">
        {/* Product Thumbnail */}
        <div className="relative w-24 h-24 rounded-xl bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-700/60">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400';
            }}
          />

          {/* Positioning Tier Badge (Good / Better / Best) */}
          <span
            className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
              tierColors[product.positioning]
            }`}
          >
            {product.positioning}
          </span>
        </div>

        {/* Product Essential Specs & Badges */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Flags Row: Focus / Best Seller / SKU */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-tight">
                {product.sku}
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-[11px] font-bold text-blue-400 truncate">
                {product.brand}
              </span>

              {product.isProductFocus && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                  <Flame className="w-2.5 h-2.5" />
                  <span>Fokus</span>
                </span>
              )}

              {product.isBestSeller && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  <Trophy className="w-2.5 h-2.5" />
                  <span>Terlaris</span>
                </span>
              )}
            </div>

            {/* Product Name */}
            <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">
              {product.name}
            </h3>

            {/* Compatibility Tag */}
            <p className="text-[11px] text-slate-300 mt-1 line-clamp-1 flex items-center gap-1">
              <span className="text-slate-500 font-medium flex-shrink-0">Cocok:</span>
              <span className="text-slate-300 font-medium truncate">{product.compatibility}</span>
            </p>
          </div>

          {/* Stock Status Badge */}
          <div className="mt-1 flex items-center justify-between">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${stockBadge}`}>
              {stockLabel}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate max-w-[120px]">
              <span>{product.subcategory}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Mode Specific Pricing & Pitch Information */}
      <div className="pt-2 border-t border-slate-700/60">
        {viewMode === 'sales' ? (
          /* SALES MODE: Modal Konter, HET, Laba Toko */
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-1">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Modal Konter (Grosir)
                </p>
                <p className="text-sm font-extrabold text-white font-mono">
                  Rp {product.wholesalePrice.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  HET Konsumen
                </p>
                <p className="text-xs text-slate-300 font-mono line-through decoration-slate-500">
                  Rp {product.suggestedRetailPrice.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="text-right bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-xl">
                <p className="text-[9px] uppercase font-bold text-emerald-400 leading-tight">
                  Untung Konter
                </p>
                <p className="text-xs font-black text-emerald-300 font-mono leading-tight">
                  +{marginPercent}% (Rp {profit.toLocaleString('id-ID')})
                </p>
              </div>
            </div>

            {/* Quick Canvasser Pitch Point */}
            <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800 flex items-start justify-between gap-2">
              <p className="text-[11px] text-slate-300 leading-tight italic line-clamp-1">
                "{product.sellingPoint1}"
              </p>
              <button
                onClick={handleCopyPitch}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors flex-shrink-0"
                title="Salin ringkasan pitch"
              >
                {copiedPitch ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ) : (
          /* CUSTOMER MODE: Clean, Client-Safe Presentation */
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Harga Eceran Resmi (HET)
              </p>
              <p className="text-base font-extrabold text-blue-400 font-mono">
                Rp {product.suggestedRetailPrice.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5" />
              <span>Garansi Resmi Asli</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleToggleCompare}
          disabled={compareFull}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            inCompare
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : compareFull
              ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              : 'bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600/60'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>{inCompare ? 'Bandingkan' : '+ Banding'}</span>
        </button>

        <button
          onClick={() => setSelectedProduct(product)}
          className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-700/40 hover:bg-slate-700 text-slate-300 flex items-center gap-1 border border-slate-700"
        >
          <span>Detail & Spek</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
