import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Download, MousePointerClick, ShoppingBag, Users } from 'lucide-react';
import { accountRoleLabel } from '../config/accountRole';
import { useCatalog } from '../context/CatalogContext';
import { listOrdersBetween, updateOrderStatus } from '../firebase/ordersService';
import { listAnalyticsDays } from '../firebase/reportsService';
import { rupiah } from '../lib/money';
import {
  CLICK_KEYS,
  CLICK_LABELS,
  EMPTY_ACTIVITY_NOTE,
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
  PAGE_KEYS,
  PAGE_LABELS,
  PURCHASE_GAP_NOTE,
  TRACKING_FOOTNOTE,
  buildExampleVisitReport,
  examplePurchaseOrders,
  formatDayLabel,
  formatJakarta,
  jakartaDate,
  jakartaDayBounds,
  purchaseExportSheets,
  resolveDateRange,
  summarizeDays,
  summarizePurchases,
  type ClickKey,
  type PageKey,
  type PurchaseSummary,
  type RangePreset,
  type VisitClickReport,
} from '../lib/analyticsAggregate';
import type { Order, OrderStatus, UserProfile } from '../types/product';

type Section = 'visits' | 'clicks' | 'purchases';

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: 'today', label: 'Hari ini' },
  { id: '7d', label: '7 hari' },
  { id: '30d', label: '30 hari' },
  { id: 'custom', label: 'Pilih tanggal' },
];

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'visits', label: 'Kunjungan' },
  { id: 'clicks', label: 'Klik' },
  { id: 'purchases', label: 'Pembelian' },
];

function reportErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('permission') || raw.includes('PERMISSION') || raw.includes('insufficient')) {
    return 'Belum bisa membaca laporan. Pasang firestore.rules yang berisi analyticsHits ke database aplikasi setelah versi ini hidup.';
  }
  return 'Laporan gagal dimuat. Coba lagi sebentar lagi.';
}

function roleTone(role: string): string {
  if (role === 'admin') return 'bg-purple-500/20 text-purple-200';
  if (role === 'end_user') return 'bg-sky-500/20 text-sky-200';
  if (role === 'grosir' || role === 'customer') return 'bg-emerald-500/20 text-emerald-200';
  return 'bg-slate-700 text-slate-200';
}

export const ReportsPage: React.FC = () => {
  const { accountDirectory, setCurrentTab } = useCatalog();
  return (
    <ReportsWorkspace
      accountDirectory={accountDirectory}
      onBack={() => setCurrentTab('admin')}
    />
  );
};

/** Public example layout. It never reads Firestore and never shows store data. */
export function ExampleReportsPage() {
  return <ReportsWorkspace accountDirectory={[]} forceExample />;
}

function ReportsWorkspace({
  accountDirectory,
  onBack,
  forceExample = false,
}: {
  accountDirectory: UserProfile[];
  onBack?: () => void;
  forceExample?: boolean;
}) {
  const [preset, setPreset] = useState<RangePreset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [section, setSection] = useState<Section>('visits');
  const [example, setExample] = useState(forceExample);
  const [customer, setCustomer] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [docs, setDocs] = useState<Array<{ id: string; fields: Record<string, unknown> }> | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [exampleStatus, setExampleStatus] = useState<Record<string, OrderStatus>>({});
  const [exporting, setExporting] = useState(false);

  const range = useMemo(
    () => resolveDateRange({ preset, customStart, customEnd }),
    [preset, customStart, customEnd]
  );

  useEffect(() => {
    if (example) return;
    let active = true;
    setLoading(true);
    setError(null);
    const bounds = jakartaDayBounds(range.start, range.end);
    Promise.all([
      listAnalyticsDays(range.start, range.end),
      listOrdersBetween(bounds.startIso, bounds.endIso),
    ])
      .then(([days, purchase]) => {
        if (!active) return;
        setDocs(days);
        setOrders(purchase.orders);
        setTruncated(purchase.truncated);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setDocs([]);
        setOrders([]);
        setError(reportErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [example, range.start, range.end]);

  const roles = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of accountDirectory) map.set(person.uid, person.role);
    return map;
  }, [accountDirectory]);

  const visit: VisitClickReport | null = useMemo(() => {
    if (example) return buildExampleVisitReport(range.end, range);
    if (!docs) return null;
    return summarizeDays(docs, range);
  }, [example, docs, range]);

  const purchases: PurchaseSummary | null = useMemo(() => {
    if (example) {
      const fixture = examplePurchaseOrders(range.end);
      const edited = fixture.orders
        .filter((order) => {
          const day = jakartaDate(new Date(order.createdAt));
          return day >= range.start && day <= range.end;
        })
        .map((order) => ({ ...order, status: exampleStatus[order.id || ''] ?? order.status }));
      return { ...summarizePurchases(edited, fixture.roles, { status, customer }), example: true };
    }
    if (!orders) return null;
    return summarizePurchases(orders, roles, { status, customer }, { truncated, scanned: orders.length });
  }, [example, orders, roles, status, customer, range, truncated, exampleStatus]);

  const changeStatus = async (id: string, next: OrderStatus) => {
    if (example) {
      setExampleStatus((current) => ({ ...current, [id]: next }));
      return;
    }
    setStatusBusy(id);
    setError(null);
    try {
      await updateOrderStatus(id, next);
      setOrders((current) =>
        current?.map((order) => (order.id === id ? { ...order, status: next } : order)) ?? current
      );
    } catch (err: unknown) {
      setError(reportErrorMessage(err));
    } finally {
      setStatusBusy(null);
    }
  };

  const exportExcel = async () => {
    if (!purchases) return;
    setExporting(true);
    try {
      const xlsx = await import('xlsx');
      const sheets = purchaseExportSheets(purchases);
      const book = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(sheets.orders), 'Pesanan');
      xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(sheets.lines), 'Baris');
      const prefix = purchases.example ? 'CONTOH-' : '';
      xlsx.writeFile(book, `${prefix}Laporan-Pembelian-${range.start}_${range.end}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const visibleOrders = showAllOrders ? purchases?.orders ?? [] : (purchases?.orders ?? []).slice(0, 12);
  const activityEmpty = Boolean(visit && visit.totals.visits === 0 && visit.totals.clicks === 0 && visit.totals.pageViews === 0);

  return (
    <div className="space-y-4 pb-24" data-screen="laporan">
      <section className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-3xl shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Laporan</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-500/30">
                  Admin
                </span>
              </h1>
              <p className="text-xs text-slate-400">Kunjungan, klik, dan history pembelian</p>
            </div>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Katalog
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                preset === item.id
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold uppercase text-slate-400">
              Dari
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white"
              />
            </label>
            <label className="text-[10px] font-bold uppercase text-slate-400">
              Sampai
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white"
              />
            </label>
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          {formatDayLabel(range.start)} – {formatDayLabel(range.end)}
          {range.capped ? ' · rentang dipotong ke 62 hari' : ''}
        </p>

        <div className="grid grid-cols-3 gap-1.5">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`py-2 rounded-xl text-[11px] font-bold border ${
                section === item.id
                  ? 'bg-slate-100 text-slate-900 border-white'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {example && (
        <p className="rounded-2xl border border-amber-400/60 bg-amber-400 text-slate-950 px-3 py-2 text-xs font-black">
          CONTOH — bukan data toko. Angka di bawah ini hanya contoh tampilan.
        </p>
      )}

      {error && (
        <p className="text-xs text-rose-200 bg-rose-950/60 border border-rose-500/40 rounded-2xl px-3 py-2">{error}</p>
      )}

      {loading && !example && (
        <p className="text-xs text-blue-300 px-1">Memuat laporan...</p>
      )}

      {section === 'visits' && visit && (
        <VisitSection
          report={visit}
          empty={activityEmpty}
          example={example}
          forceExample={forceExample}
          onExample={() => setExample(true)}
          onLive={forceExample ? undefined : () => setExample(false)}
        />
      )}

      {section === 'clicks' && visit && (
        <ClickSection
          report={visit}
          empty={activityEmpty}
          example={example}
          forceExample={forceExample}
          onExample={() => setExample(true)}
          onLive={forceExample ? undefined : () => setExample(false)}
        />
      )}

      {section === 'purchases' && purchases && (
        <PurchaseSection
          summary={purchases}
          customer={customer}
          status={status}
          onCustomer={setCustomer}
          onStatus={setStatus}
          orders={visibleOrders}
          hiddenCount={(purchases.orders.length || 0) - visibleOrders.length}
          onShowAll={() => setShowAllOrders(true)}
          onExport={() => void exportExcel()}
          exporting={exporting}
          statusBusy={statusBusy}
          onChangeStatus={(id, next) => void changeStatus(id, next)}
          exampleHint={example}
        />
      )}

      <p className="text-[10px] leading-relaxed text-slate-500 px-1">{TRACKING_FOOTNOTE}</p>
    </div>
  );
}

function ExampleSwitch({
  example,
  forceExample,
  onExample,
  onLive,
}: {
  example: boolean;
  forceExample: boolean;
  onExample: () => void;
  onLive?: () => void;
}) {
  if (forceExample) return null;
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onLive}
        className={`flex-1 py-2 rounded-xl text-[11px] font-bold border ${
          example ? 'border-slate-700 text-slate-300' : 'bg-blue-600 border-blue-400 text-white'
        }`}
      >
        Data toko
      </button>
      <button
        type="button"
        onClick={onExample}
        className={`flex-1 py-2 rounded-xl text-[11px] font-bold border ${
          example ? 'bg-amber-400 border-amber-200 text-slate-950' : 'border-slate-700 text-slate-300'
        }`}
      >
        Lihat contoh
      </button>
    </div>
  );
}

function VisitSection({
  report,
  empty,
  example,
  forceExample,
  onExample,
  onLive,
}: {
  report: VisitClickReport;
  empty: boolean;
  example: boolean;
  forceExample: boolean;
  onExample: () => void;
  onLive?: () => void;
}) {
  const visitors = report.visitors.slice(0, 40);
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Users className="w-3.5 h-3.5" />} label="Kunjungan" value={String(report.totals.visits)} />
        <Stat icon={<Users className="w-3.5 h-3.5" />} label="Orang berbeda" value={String(report.totals.people)} />
        <Stat icon={<BarChart3 className="w-3.5 h-3.5" />} label="Halaman dilihat" value={String(report.totals.pageViews)} />
        <Stat icon={<MousePointerClick className="w-3.5 h-3.5" />} label="Hari berisi data" value={String(report.days.length)} />
      </div>
      <ExampleSwitch example={example} forceExample={forceExample} onExample={onExample} onLive={onLive} />
      {empty && (
        <p className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700 rounded-2xl px-3 py-3 leading-relaxed">
          {EMPTY_ACTIVITY_NOTE}
        </p>
      )}
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Halaman</h2>
        {PAGE_KEYS.filter((key) => report.totals.pages[key] > 0).length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada halaman tercatat.</p>
        ) : (
          PAGE_KEYS.filter((key) => report.totals.pages[key] > 0).map((key) => (
            <CountRow key={key} label={PAGE_LABELS[key]} value={report.totals.pages[key]} max={report.totals.pageViews} />
          ))
        )}
      </div>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Per hari</h2>
        {report.days.length === 0 ? (
          <p className="text-xs text-slate-500">Tidak ada hari dalam rentang ini.</p>
        ) : (
          report.days.map((day) => (
            <div key={day.date} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-200 font-semibold">{formatDayLabel(day.date)}</span>
              <span className="text-slate-400">
                {day.visits} kunjungan · {day.people} orang
              </span>
            </div>
          ))
        )}
      </div>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Siapa yang masuk</h2>
        {visitors.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada akun tercatat.</p>
        ) : (
          visitors.map((visitor) => (
            <article key={visitor.uid} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{visitor.name || 'Tanpa nama'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{visitor.email || visitor.uid}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${roleTone(visitor.role)}`}>
                  {visitor.role === 'admin' ? 'Master Admin' : accountRoleLabel(visitor.role)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Terakhir dilihat {formatJakarta(visitor.lastSeen)}</p>
              <div className="flex flex-wrap gap-1">
                {visitor.pages.map((page) => (
                  <span key={page} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                    {PAGE_LABELS[page as PageKey] || page}
                  </span>
                ))}
              </div>
            </article>
          ))
        )}
        {report.visitors.length > visitors.length && (
          <p className="text-[11px] text-slate-500">Menampilkan {visitors.length} dari {report.visitors.length} orang.</p>
        )}
      </div>
    </section>
  );
}

function ClickSection({
  report,
  empty,
  example,
  forceExample,
  onExample,
  onLive,
}: {
  report: VisitClickReport;
  empty: boolean;
  example: boolean;
  forceExample: boolean;
  onExample: () => void;
  onLive?: () => void;
}) {
  const maxClick = Math.max(1, ...CLICK_KEYS.map((key) => report.totals.clicksByType[key]));
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<MousePointerClick className="w-3.5 h-3.5" />} label="Total klik" value={String(report.totals.clicks)} />
        <Stat icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Produk diklik" value={String(report.productCount)} />
      </div>
      <ExampleSwitch example={example} forceExample={forceExample} onExample={onExample} onLive={onLive} />
      {empty && (
        <p className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700 rounded-2xl px-3 py-3 leading-relaxed">
          {EMPTY_ACTIVITY_NOTE}
        </p>
      )}
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Jenis klik</h2>
        {CLICK_KEYS.map((key) => (
          <CountRow key={key} label={CLICK_LABELS[key as ClickKey]} value={report.totals.clicksByType[key]} max={maxClick} />
        ))}
      </div>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Per hari</h2>
        {report.days.length === 0 ? (
          <p className="text-xs text-slate-500">Tidak ada hari dalam rentang ini.</p>
        ) : (
          report.days.map((day) => {
            const total = CLICK_KEYS.reduce((sum, key) => sum + day.clicks[key], 0);
            return (
              <div key={day.date} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-200 font-semibold">{formatDayLabel(day.date)}</span>
                <span className="text-slate-400">{total} klik</span>
              </div>
            );
          })
        )}
      </div>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Produk paling sering diklik</h2>
        {report.topProducts.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada produk yang dibuka.</p>
        ) : (
          report.topProducts.map((product) => (
            <article key={product.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-sm font-bold text-white">{product.name}</p>
              <p className="text-[11px] text-slate-400">{product.sku}</p>
              <p className="text-[11px] text-slate-200 mt-1">
                Dibuka {product.views} · Keranjang {product.carts} · Pesanan {product.orders}
              </p>
            </article>
          ))
        )}
        {report.productCount > report.topProducts.length && (
          <p className="text-[11px] text-slate-500">
            Menampilkan {report.topProducts.length} dari {report.productCount} produk.
          </p>
        )}
      </div>
    </section>
  );
}

function PurchaseSection({
  summary,
  customer,
  status,
  onCustomer,
  onStatus,
  orders,
  hiddenCount,
  onShowAll,
  onExport,
  exporting,
  statusBusy,
  onChangeStatus,
  exampleHint,
}: {
  summary: PurchaseSummary;
  customer: string;
  status: 'all' | OrderStatus;
  onCustomer: (value: string) => void;
  onStatus: (value: 'all' | OrderStatus) => void;
  orders: PurchaseSummary['orders'];
  hiddenCount: number;
  onShowAll: () => void;
  onExport: () => void;
  exporting: boolean;
  statusBusy: string | null;
  onChangeStatus: (id: string, status: OrderStatus) => void;
  exampleHint: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Pesanan tercatat" value={String(summary.totals.recorded)} />
        <Stat icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Nilai belum dibatalkan" value={rupiah(summary.totals.activeValue)} />
        <Stat icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Selesai" value={rupiah(summary.totals.completedValue)} />
        <Stat icon={<ShoppingBag className="w-3.5 h-3.5" />} label="Menunggu" value={String(summary.totals.pendingOrders)} />
      </div>
      <p className="text-[11px] leading-relaxed text-amber-100/90 bg-amber-950/40 border border-amber-500/30 rounded-2xl px-3 py-2">
        {PURCHASE_GAP_NOTE}
      </p>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <label className="block text-[10px] font-bold uppercase text-slate-400">
          Cari pelanggan
          <input
            value={customer}
            onChange={(event) => onCustomer(event.target.value)}
            placeholder="Nama atau email"
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-[10px] font-bold uppercase text-slate-400">
          Status
          <select
            value={status}
            onChange={(event) => onStatus(event.target.value as 'all' | OrderStatus)}
            className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
          >
            <option value="all">Semua status</option>
            {ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {ORDER_STATUS_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || summary.orders.length === 0}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Menyiapkan Excel...' : 'Unduh Excel'}
        </button>
      </div>
      {summary.truncated && (
        <p className="text-[11px] text-amber-200">
          Ada lebih dari 200 pesanan di rentang ini. Daftar dipotong. Persempit tanggal untuk melihat sisanya.
        </p>
      )}
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Per hari</h2>
        {summary.perDay.length === 0 ? (
          <p className="text-xs text-slate-500">Tidak ada pesanan pada filter ini.</p>
        ) : (
          summary.perDay.map((day) => (
            <div key={day.date} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-200 font-semibold">{day.date ? formatDayLabel(day.date) : 'Tanpa tanggal'}</span>
              <span className="text-slate-400">
                {day.orders} pesanan · {rupiah(day.activeValue)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="rounded-3xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Produk terbanyak (selain dibatalkan)</h2>
        {summary.topProducts.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada barang pada pesanan aktif.</p>
        ) : (
          summary.topProducts.map((product) => (
            <div key={product.id} className="flex items-start justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{product.name}</p>
                <p className="text-[11px] text-slate-400">{product.sku}</p>
              </div>
              <p className="shrink-0 text-slate-200">
                {product.qty} pcs · {rupiah(product.value)}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Daftar pesanan</h2>
        {exampleHint && (
          <p className="text-[11px] text-amber-200/90 px-1">Perubahan status pada contoh tidak ditulis ke Firestore.</p>
        )}
        {orders.length === 0 ? (
          <p className="text-xs text-slate-500 px-1">Tidak ada pesanan pada filter ini. Pesanan lama tetap tampil kalau tanggalnya masuk rentang.</p>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-700 bg-slate-800/80 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{order.customerName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{order.customerEmail}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${roleTone(order.role || '')}`}>
                  {order.roleLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {formatJakarta(order.createdAt)} · {order.itemCount} item · {rupiah(order.total)}
              </p>
              <p className="text-[10px] font-mono text-slate-500 truncate">{order.id}</p>
              <ul className="space-y-1">
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.productId}-${item.sku}`} className="text-[11px] text-slate-300">
                    {item.name} · {item.sku} · {item.quantity} x {rupiah(item.unitPrice)}
                  </li>
                ))}
              </ul>
              {order.note && <p className="text-[11px] text-slate-400">Catatan: {order.note}</p>}
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Status
                <select
                  value={order.status}
                  disabled={statusBusy === order.id}
                  onChange={(event) => onChangeStatus(order.id, event.target.value as OrderStatus)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {ORDER_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {ORDER_STATUS_LABEL[item]}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))
        )}
        {hiddenCount > 0 && (
          <button type="button" onClick={onShowAll} className="w-full py-2 rounded-xl bg-slate-700 text-white text-xs font-bold">
            Tampilkan {hiddenCount} pesanan lagi
          </button>
        )}
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-base font-black text-white mt-1 break-words">{value}</p>
    </div>
  );
}

function CountRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 && value > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-200">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-900">
        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
