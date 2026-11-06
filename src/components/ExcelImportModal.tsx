import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, StockStatus, PositioningTier } from '../types/product';
import { useCatalog } from '../context/CatalogContext';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose }) => {
  const { batchSaveProductItems } = useCatalog();

  const [parsedItems, setParsedItems] = useState<Product[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Unduh Template Contoh CSV / Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        sku: 'ACC-ANK-001',
        nama_produk: 'Anker 511 Nano GaN 30W Fast Charger Type-C',
        merk: 'Anker',
        kategori: 'Charger & Adapter',
        subkategori: 'Fast Charger GaN',
        modal_grosir: 135000,
        het_eceran: 199000,
        posisi_tier: 'Best',
        status_stok: 'In Stock',
        kompatibilitas: 'iPhone 13/14/15/16, Samsung S23/S24, iPad',
        spesifikasi: 'GaN III 30W PD, ultra compact, anti-overheat shield',
        keunggulan_1: 'Merk No.1 aksesoris dunia dengan garansi resmi 18 bulan',
        keunggulan_2: 'Ngecas iPhone 50% cuma dalam 25 menit',
        keunggulan_3: 'Margin konter tebal Rp 64.000 per unit',
        target_profil_toko: 'Konter HP mall dan toko aksesoris premium',
        cross_sell: 'Kabel Ugreen Type-C 100W, Pelindung Kabel',
        link_gambar: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600',
        produk_fokus: 'YA',
        paling_laris: 'YA',
      },
      {
        sku: 'ACC-BAS-002',
        nama_produk: 'Baseus Compact Quick Charger Dual Port 20W PD+QC',
        merk: 'Baseus',
        kategori: 'Charger & Adapter',
        subkategori: 'Dual Port Charger',
        modal_grosir: 65000,
        het_eceran: 99000,
        posisi_tier: 'Better',
        status_stok: 'In Stock',
        kompatibilitas: 'Universal Android & iPhone (Type-C + USB-A)',
        spesifikasi: 'Dual port 20W PD + 18W QC3.0, smart chip IC',
        keunggulan_1: 'Bisa cas 2 HP bersamaan hanya dengan 1 adaptor',
        keunggulan_2: 'Harga ekonomis di bawah 100rb bersertifikasi aman',
        keunggulan_3: 'Item paling laris di konter pinggir jalan',
        target_profil_toko: 'Konter HP umum dan warung retail gadget',
        cross_sell: 'Kabel Baseus Lightning, Kabel Type-C',
        link_gambar: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=600',
        produk_fokus: 'TIDAK',
        paling_laris: 'YA',
      },
      {
        sku: 'ACC-ROB-103',
        nama_produk: 'Robot Fast Charging Cable Type-C RDC100 2.4A 1M',
        merk: 'Robot',
        kategori: 'Kabel Data & Charging',
        subkategori: 'Kabel Type-C Standar',
        modal_grosir: 12000,
        het_eceran: 25000,
        posisi_tier: 'Good',
        status_stok: 'In Stock',
        kompatibilitas: 'Semua Android Type-C (Oppo, Vivo, Xiaomi, Samsung)',
        spesifikasi: 'Bahan PVC lentur anti kusut, arus 2.4A stabil',
        keunggulan_1: 'Modal super murah Rp 12.000, margin konter di atas 50%',
        keunggulan_2: 'Kemasan toples mika display menarik di kasir konter',
        keunggulan_3: 'Stok staple harian yang selalu dicari konsumen',
        target_profil_toko: 'Semua konter pulsa dan etalase toko retail',
        cross_sell: 'Robot Dual Charger RT-K6',
        link_gambar: 'https://images.unsplash.com/photo-1618424181497-157f25b6ddd5?w=600',
        produk_fokus: 'TIDAK',
        paling_laris: 'YA',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Katalog');

    XLSX.writeFile(workbook, 'Template_Input_Katalog_Partshop.xlsx');
  };

  // Baca File Excel atau CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setImportSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setParseError('File kosong atau tidak memiliki data baris produk.');
          return;
        }

        // Petakan nama kolom (fleksibel Bahasa Indonesia atau English)
        const mappedProducts: Product[] = rawJson.map((row, idx) => {
          const sku = String(row.sku || row.kode_sku || row.SKU || `ACC-${Date.now()}-${idx}`).trim();
          const name = String(row.name || row.nama_produk || row.nama_barang || row.Nama || '').trim();
          const brand = String(row.brand || row.merk || row.Merk || 'Generic').trim();
          const category = String(row.category || row.kategori || row.Kategori || 'Charger & Adapter').trim();
          const subcategory = String(row.subcategory || row.subkategori || row.Subkategori || 'Lainnya').trim();
          const wholesalePrice = Number(row.wholesalePrice || row.modal_grosir || row.modal || row.harga_modal || 0);
          const suggestedRetailPrice = Number(row.suggestedRetailPrice || row.het_eceran || row.het || row.harga_jual || wholesalePrice * 1.3);
          const positioningRaw = String(row.positioning || row.posisi_tier || row.tier || 'Better').trim().toLowerCase();
          const positioning = positioningRaw.includes('best') ? 'Best' : positioningRaw.includes('good') ? 'Good' : 'Better';
          const stockStatusRaw = String(row.stockStatus || row.status_stok || 'In Stock').trim();
          const stockStatus = stockStatusRaw.toLowerCase().includes('low') || stockStatusRaw.toLowerCase().includes('menipis')
            ? 'Low Stock'
            : stockStatusRaw.toLowerCase().includes('pre')
            ? 'Pre-Order'
            : stockStatusRaw.toLowerCase().includes('out') || stockStatusRaw.toLowerCase().includes('habis')
            ? 'Out of Stock'
            : 'In Stock';
          const compatibility = String(row.compatibility || row.kompatibilitas || row.tipe_hp || row.cocok_untuk || 'Universal').trim();
          const specification = String(row.specification || row.spesifikasi || row.spek || '-').trim();
          const sellingPoint1 = String(row.sellingPoint1 || row.keunggulan_1 || 'Kualitas terjamin resmi').trim();
          const sellingPoint2 = String(row.sellingPoint2 || row.keunggulan_2 || 'Garansi distributor terpercaya').trim();
          const sellingPoint3 = String(row.sellingPoint3 || row.keunggulan_3 || 'Margin konter menguntungkan').trim();
          const targetCustomer = String(row.targetCustomer || row.target_profil_toko || 'Konter HP dan toko retail').trim();
          const crossSellNotes = String(row.crossSellNotes || row.cross_sell || row.paket_terkait || '').trim();
          const imageUrl = String(row.imageUrl || row.link_gambar || row.foto || 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600').trim();

          const isProductFocus = String(row.isProductFocus || row.produk_fokus || row.fokus || '').toLowerCase().includes('ya') ||
            String(row.isProductFocus || row.produk_fokus || row.fokus || '').toLowerCase().includes('true');
          const isBestSeller = String(row.isBestSeller || row.paling_laris || row.terlaris || '').toLowerCase().includes('ya') ||
            String(row.isBestSeller || row.paling_laris || row.terlaris || '').toLowerCase().includes('true');

          return {
            sku,
            name,
            brand,
            category,
            subcategory,
            wholesalePrice,
            suggestedRetailPrice,
            positioning: positioning as PositioningTier,
            stockStatus: stockStatus as StockStatus,
            compatibility,
            specification,
            sellingPoint1,
            sellingPoint2,
            sellingPoint3,
            targetCustomer,
            crossSellNotes,
            imageUrl,
            isProductFocus,
            isBestSeller,
            isActive: true,
          };
        }).filter((p) => p.name.length > 0);

        if (mappedProducts.length === 0) {
          setParseError('Tidak ditemukan produk dengan kolom "nama_produk" yang valid.');
          return;
        }

        setParsedItems(mappedProducts);
      } catch (err: any) {
        console.error('Gagal membaca file Excel/CSV:', err);
        setParseError(`Format file tidak dapat dibaca: ${err?.message || 'Pastikan file berekstensi .xlsx atau .csv'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Simpan Batch ke Firestore
  const handleExecuteImport = async () => {
    if (parsedItems.length === 0) return;
    setIsImporting(true);
    setParseError(null);

    try {
      const count = await batchSaveProductItems(parsedItems);
      setImportSuccessCount(count);
      setParsedItems([]);
      setFileName(null);
    } catch (err: any) {
      console.error('Import batch error:', err);
      setParseError(`Gagal menyimpan ke Firestore: ${err?.message || 'Periksa koneksi database'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div
        className="w-full max-w-lg max-h-[92vh] bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Import Massal Excel / CSV</h3>
              <p className="text-[10px] text-slate-400">
                Upload puluhan SKU sekaligus ke katalog Firestore
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 space-y-4 text-xs">
          {/* Success Banner */}
          {importSuccessCount !== null && (
            <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Berhasil Mengimpor {importSuccessCount} Produk!</p>
                <p className="text-[11px] text-emerald-400/90 mt-0.5">
                  Produk telah tersimpan ke database Firestore dan langsung dapat dicari di katalog.
                </p>
              </div>
            </div>
          )}

          {/* Download Template Card */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white text-xs">Format Template Excel</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Gunakan template resmi berisi contoh kolom SKU, nama, modal, HET, dan spek.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 flex-shrink-0 shadow active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template</span>
            </button>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-800/40 hover:bg-slate-800/60 transition-all flex flex-col items-center justify-center gap-2 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-colors">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-white text-xs">
                {fileName ? fileName : 'Pilih File Excel (.xlsx/.xls) atau CSV'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Klik untuk mencari file spreadsheet di HP atau komputer Anda
              </p>
            </div>
          </div>

          {/* Error Message */}
          {parseError && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview Parsed Items */}
          {parsedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  Pratinjau Data Siap Diimpor ({parsedItems.length} Produk)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Semua Data Valid
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-800 rounded-2xl p-2 bg-slate-950/60">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                        <span className="text-white font-bold">{item.sku}</span>
                        <span>•</span>
                        <span className="text-blue-400 font-bold">{item.brand}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-semibold">{item.category}</span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Modal: Rp {item.wholesalePrice.toLocaleString('id-ID')} | HET: Rp{' '}
                        {item.suggestedRetailPrice.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 flex-shrink-0">
                      Tier {item.positioning}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
          >
            Tutup
          </button>

          {parsedItems.length > 0 && (
            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengimpor ke Firestore...</span>
                </>
              ) : (
                <>
                  <span>Import {parsedItems.length} Produk Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
